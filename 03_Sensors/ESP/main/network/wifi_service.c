#include "wifi_service.h"
#include "app_context.h"
#include <string.h>
#include "app_config.h"
#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"
#include "freertos/task.h"

#include "esp_log.h"
#include "esp_netif.h"
#include "esp_event.h"
#include "esp_wifi.h"

static const char *TAG = "wifi_service";

#define WIFI_CONNECTED_BIT BIT0
#define WIFI_DISCONNECTED_BIT BIT1

static EventGroupHandle_t s_wifi_event_group;
static esp_netif_t *s_sta_netif = NULL;

static esp_event_handler_instance_t s_wifi_any_id;
static esp_event_handler_instance_t s_ip_got_ip;

/**
 * @brief Wi-Fi and IP event handler.
 *
 * @param arg Unused task argument.
 * @param event_base Event base.
 * @param event_id Event identifier.
 * @param event_data Event-specific data.
 */
static void event_handler(void *arg, esp_event_base_t event_base,
                          int32_t event_id, void *event_data)
{
    (void)arg;
    (void)event_data;

    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED)
    {
        xEventGroupClearBits(s_wifi_event_group, WIFI_CONNECTED_BIT);
        xEventGroupSetBits(s_wifi_event_group, WIFI_DISCONNECTED_BIT);
    }
    else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP)
    {
        ip_event_got_ip_t *event = (ip_event_got_ip_t *)event_data;
        ESP_LOGI(TAG, "Received IP address: " IPSTR, IP2STR(&event->ip_info.ip));
        xEventGroupClearBits(s_wifi_event_group, WIFI_DISCONNECTED_BIT);
        xEventGroupSetBits(s_wifi_event_group, WIFI_CONNECTED_BIT);
    }
}

esp_err_t wifi_init(void)
{
    esp_err_t err = esp_netif_init();
    if (err != ESP_OK && err != ESP_ERR_INVALID_STATE)
    {
        ESP_LOGE(TAG, "esp_netif_init failed: %s", esp_err_to_name(err));
        return ESP_FAIL;
    }

    err = esp_event_loop_create_default();
    if (err != ESP_OK && err != ESP_ERR_INVALID_STATE)
    {
        ESP_LOGE(TAG, "esp_event_loop_create_default failed: %s", esp_err_to_name(err));
        return ESP_FAIL;
    }

    s_wifi_event_group = xEventGroupCreate();
    if (!s_wifi_event_group)
    {
        ESP_LOGE(TAG, "xEventGroupCreate failed");
        return ESP_FAIL;
    }

    s_sta_netif = esp_netif_create_default_wifi_sta();
    if (!s_sta_netif)
    {
        ESP_LOGE(TAG, "esp_netif_create_default_wifi_sta failed");
        return ESP_FAIL;
    }

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    err = esp_wifi_init(&cfg);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "esp_wifi_init failed: %s", esp_err_to_name(err));
        return ESP_FAIL;
    }

    err = esp_event_handler_instance_register(
        WIFI_EVENT, ESP_EVENT_ANY_ID, &event_handler, NULL, &s_wifi_any_id);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "register WIFI_EVENT handler failed: %s", esp_err_to_name(err));
        return ESP_FAIL;
    }

    err = esp_event_handler_instance_register(
        IP_EVENT, IP_EVENT_STA_GOT_IP, &event_handler, NULL, &s_ip_got_ip);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "register IP_EVENT handler failed: %s", esp_err_to_name(err));
        return ESP_FAIL;
    }

    return ESP_OK;
}

/**
 * @brief Configure and start Wi-Fi station mode.
 *
 * @param ssid Wi-Fi SSID.
 * @param pass Wi-Fi password, or NULL for an open network.
 * @retval ESP_OK Station started successfully.
 * @retval ESP_FAIL Invalid arguments or station startup failed.
 */
static esp_err_t start_sta(const char *ssid, const char *pass)
{
    if (!ssid || !ssid[0])
    {
        ESP_LOGE(TAG, "invalid SSID");
        return ESP_FAIL;
    }

    wifi_config_t wifi_config = {0};
    strncpy((char *)wifi_config.sta.ssid, ssid, sizeof(wifi_config.sta.ssid));
    wifi_config.sta.ssid[sizeof(wifi_config.sta.ssid) - 1] = 0;
    if (pass && pass[0])
    {
        strncpy((char *)wifi_config.sta.password, pass, sizeof(wifi_config.sta.password));
        wifi_config.sta.password[sizeof(wifi_config.sta.password) - 1] = 0;
    }

    esp_err_t err = esp_wifi_set_mode(WIFI_MODE_STA);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "esp_wifi_set_mode failed: %s", esp_err_to_name(err));
        return ESP_FAIL;
    }
    err = esp_wifi_set_config(WIFI_IF_STA, &wifi_config);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "esp_wifi_set_config failed: %s", esp_err_to_name(err));
        return ESP_FAIL;
    }
    err = esp_wifi_start();
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "esp_wifi_start failed: %s", esp_err_to_name(err));
        return ESP_FAIL;
    }

    ESP_LOGI(TAG, "wifi start; connecting to SSID: %s", ssid);
    return ESP_OK;
}

/**
 * @brief Background task that manages Wi-Fi connect and reconnect flow.
 *
 * Uses the SSID and password from the application context and retries with
 * backoff.
 *
 * @param arg Unused task argument.
 */
static void connect_task(void *arg)
{
    (void)arg;

    const char *ssid = app_context_wifi_ssid();
    const char *pass = app_context_wifi_password();
    if (!ssid || !ssid[0])
    {
        ESP_LOGE(TAG, "SSID not set; wifi connector task exiting");
        vTaskDelete(NULL);
        return;
    }

    if (start_sta(ssid, pass && pass[0] ? pass : NULL) != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to start Wi-Fi station");
        vTaskDelete(NULL);
        return;
    }

    int attempts = 0;
    while (true)
    {
        xEventGroupClearBits(s_wifi_event_group,
                             WIFI_CONNECTED_BIT | WIFI_DISCONNECTED_BIT);

        esp_err_t err = esp_wifi_connect();
        if (err != ESP_OK)
        {
            ESP_LOGE(TAG, "esp_wifi_connect failed: %s", esp_err_to_name(err));
            attempts++;
            goto retry_wait;
        }

        EventBits_t bits = xEventGroupWaitBits(
            s_wifi_event_group,
            WIFI_CONNECTED_BIT,
            pdFALSE,
            pdFALSE,
            pdMS_TO_TICKS(WIFI_CONNECT_TIMEOUT_MS));

        if (bits & WIFI_CONNECTED_BIT)
        {
            attempts = 0;
            xEventGroupWaitBits(
                s_wifi_event_group,
                WIFI_DISCONNECTED_BIT,
                pdTRUE,
                pdFALSE,
                portMAX_DELAY);
            continue;
        }

        attempts++;

    retry_wait:
        if (attempts >= WIFI_CONNECT_MAX_ATTEMPTS)
        {
            ESP_LOGW(TAG, "Wi-Fi connect attempts exhausted; backing off");
            attempts = 0;
            vTaskDelay(pdMS_TO_TICKS(WIFI_CONNECT_BACKOFF_DELAY_MS));
        }
        else
        {
            vTaskDelay(pdMS_TO_TICKS(WIFI_CONNECT_RETRY_DELAY_MS));
        }
    }
}

esp_err_t spawn_wifi_connector_task(void)
{
    if (!s_wifi_event_group || !s_sta_netif)
    {
        ESP_LOGE(TAG, "wifi service not initialized");
        return ESP_FAIL;
    }

    BaseType_t result = xTaskCreate(connect_task,
                                    "wifi_connect",
                                    4096,
                                    NULL,
                                    5,
                                    NULL);
    if (result != pdPASS)
    {
        ESP_LOGE(TAG, "Failed to spawn wifi connector task");
        return ESP_FAIL;
    }

    return ESP_OK;
}

esp_err_t wifi_wait_for_connection(uint32_t timeout_ms)
{
    if (!s_wifi_event_group)
    {
        return ESP_FAIL;
    }

    EventBits_t bits = xEventGroupWaitBits(
        s_wifi_event_group,
        WIFI_CONNECTED_BIT,
        pdFALSE,
        pdFALSE,
        pdMS_TO_TICKS(timeout_ms));

    return (bits & WIFI_CONNECTED_BIT) ? ESP_OK : ESP_ERR_TIMEOUT;
}
