/**
 * @file backend_service.c
 * @brief Backend reporting and event delivery tasks.
 */

#include "backend_service.h"
#include "app_config.h"
#include "app_context.h"
#include "backend_client.h"
#include "event_buffer_service.h"
#include "event_payload_helper.h"
#include "config_service.h"
#include "wifi_service.h"
#include "esp_err.h"
#include "esp_log.h"
#include "esp_system.h"
#include "esp_timer.h"
#include "nvs_helper.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"
#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#define TAG "backend-service"

static char device_cert_pem[DEVICE_PEM_BUF_SIZE];
static char device_key_pem[DEVICE_PEM_BUF_SIZE];
static bool creds_loaded = false;
static uint32_t corrupt_config_reject_count = 0;
static SemaphoreHandle_t s_backend_http_mutex = NULL;

static esp_err_t init_backend_http_mutex(void)
{
    if (s_backend_http_mutex != NULL)
    {
        return ESP_OK;
    }

    s_backend_http_mutex = xSemaphoreCreateMutex();
    return s_backend_http_mutex != NULL ? ESP_OK : ESP_ERR_NO_MEM;
}

esp_err_t send_event(const char *payload, int payload_len)
{
    if (!payload || payload_len <= 0 || payload_len >= MAX_EVENT_SIZE_BYTES)
    {
        return ESP_ERR_INVALID_SIZE;
    }

    return event_buffer_push(payload, payload_len);
}

static esp_err_t ensure_device_credentials(void)
{
    if (creds_loaded)
    {
        return ESP_OK;
    }

    if (nvs_cfg_get_string(DEVICE_CERT_PEM_KEY, device_cert_pem, sizeof(device_cert_pem)) != ESP_OK ||
        nvs_cfg_get_string(DEVICE_KEY_PEM_KEY, device_key_pem, sizeof(device_key_pem)) != ESP_OK)
    {
        ESP_LOGE(TAG, "Missing device cert/key in NVS; cannot contact backend");
        memset(device_key_pem, 0, sizeof(device_key_pem));
        memset(device_cert_pem, 0, sizeof(device_cert_pem));
        return ESP_FAIL;
    }

    creds_loaded = true;
    return ESP_OK;
}

static uint32_t get_config_version(void)
{
    const device_config_t *device_cfg = app_context_device_cfg();
    return device_cfg ? device_cfg->version : 0;
}

static void queue_corrupt_device_config_event(void)
{
    if (corrupt_config_reject_count++ % DEVICE_CFG_CORRUPT_SEND_EVENT_EVERY != 0)
    {
        return;
    }

    char payload[MAX_EVENT_SIZE_BYTES];
    uint32_t boot_id = app_context_boot_id();
    int64_t uptime_ms = esp_timer_get_time() / 1000;
    uint32_t fallback_version = get_config_version();
    size_t payload_len = 0;

    esp_err_t err = event_payload_build_corrupt_device_config(
        payload,
        sizeof(payload),
        boot_id,
        uptime_ms,
        fallback_version,
        &payload_len);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to build corrupt device config event: %s", esp_err_to_name(err));
        return;
    }

    err = send_event(payload, (int)payload_len);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to queue corrupt device config event: %s", esp_err_to_name(err));
        return;
    }

    ESP_LOGW(TAG, "Queued corrupt device config event");
}

/**
 * @brief Fetch the device configuration from the backend and store it locally.
 */
static void get_device_config(void)
{
    char *config_json = (char *)calloc(1, DEVICE_CONFIG_JSON_RECV_BUF_SIZE);
    if (!config_json)
    {
        ESP_LOGE(TAG, "Failed to allocate config buffer");
        return;
    }

    if (ensure_device_credentials() != ESP_OK)
    {
        ESP_LOGW(TAG, "Missing credentials; cannot fetch config");
        free(config_json);
        return;
    }

    esp_err_t err = backend_get_config(app_context_backend_host(),
                                       device_cert_pem,
                                       device_key_pem,
                                       config_json,
                                       DEVICE_CONFIG_JSON_RECV_BUF_SIZE);

    if (err != ESP_OK)
    {
        ESP_LOGW(TAG, "Failed to fetch config: %s", esp_err_to_name(err));
        free(config_json);
        return;
    }

    if (config_json[0] == '\0')
    {
        ESP_LOGW(TAG, "Received empty config");
        free(config_json);
        return;
    }

    err = config_write_device_config(config_json);
    if (err != ESP_OK)
    {
        if (err == ESP_ERR_INVALID_RESPONSE)
        {
            ESP_LOGW(TAG, "Received corrupt device config from backend");
            queue_corrupt_device_config_event();
        }

        ESP_LOGE(TAG, "Failed to store config: %s", esp_err_to_name(err));
        free(config_json);
        return;
    }

    ESP_LOGI(TAG, "Config stored successfully");
    corrupt_config_reject_count = 0;
    free(config_json);
    ESP_LOGW(TAG, "Restarting to apply updated config");
    esp_restart();
}

/**
 * @brief Looping task that sends a device report.
 *
 * @param arg Unused task argument.
 */
static void report_task(void *arg)
{
    (void)arg;

    while (true)
    {
        bool config_changed = false;
        if (wifi_wait_for_connection(REPORT_INTERVAL_MS) != ESP_OK)
        {
            ESP_LOGW(TAG, "Report skipped; Wi-Fi not connected");
            continue;
        }

        if (ensure_device_credentials() != ESP_OK)
        {
            ESP_LOGW(TAG, "Report skipped; missing credentials");
            vTaskDelay(pdMS_TO_TICKS(REPORT_INTERVAL_MS));
            continue;
        }

        uint32_t version = get_config_version();
        esp_err_t err = ESP_FAIL;
        if (xSemaphoreTake(s_backend_http_mutex, portMAX_DELAY) == pdTRUE)
        {
            err = backend_post_report(app_context_backend_host(),
                                      device_cert_pem,
                                      device_key_pem,
                                      version,
                                      &config_changed);
            xSemaphoreGive(s_backend_http_mutex);
        }

        if (err == ESP_OK && config_changed)
        {
            ESP_LOGI(TAG, "Config changed, fetching new config...");
            get_device_config();
        }
        else if (err != ESP_OK)
        {
            ESP_LOGW(TAG, "Report failed: %s", esp_err_to_name(err));
        }

        vTaskDelay(pdMS_TO_TICKS(REPORT_INTERVAL_MS));
    }
}

/**
 * @brief Looping task that sends a new event.
 *
 * @param arg Unused task argument.
 */
static void event_send_task(void *arg)
{
    (void)arg;

    while (true)
    {
        uint8_t *event_copy = NULL;
        size_t event_length = 0;
        uint32_t drop_counter_start = 0;

        esp_err_t err = event_buffer_pop_copy(&event_copy, &event_length, &drop_counter_start);
        if (err != ESP_OK)
        {
            ESP_LOGW(TAG, "Failed to pop event from buffer: %s", esp_err_to_name(err));
            continue;
        }

        ESP_LOGI(TAG, "Sending event (%u bytes)", event_length);

        while (true)
        {
            if (event_buffer_get_drop_counter() != drop_counter_start)
            {
                ESP_LOGW(TAG, "Oldest event was dropped while retrying; discarding inflight event");
                free(event_copy);
                break;
            }

            if (wifi_wait_for_connection(EVENT_BUFFER_SEND_TIMEOUT_MS) != ESP_OK)
            {
                ESP_LOGW(TAG, "Send skipped; Wi-Fi not connected");
                continue;
            }

            if (ensure_device_credentials() != ESP_OK)
            {
                ESP_LOGW(TAG, "Send skipped; missing credentials");
                vTaskDelay(pdMS_TO_TICKS(EVENT_BUFFER_SEND_TIMEOUT_MS));
                continue;
            }

            bool sent = false;
            if (xSemaphoreTake(s_backend_http_mutex, portMAX_DELAY) == pdTRUE)
            {
                sent = (backend_post_event(app_context_backend_host(),
                                           device_cert_pem,
                                           device_key_pem,
                                           event_copy,
                                           event_length) == ESP_OK);
                xSemaphoreGive(s_backend_http_mutex);
            }
            if (sent)
            {
                free(event_copy);
                break;
            }

            ESP_LOGW(TAG, "Send failed, retrying after timeout...");
            vTaskDelay(pdMS_TO_TICKS(EVENT_BUFFER_SEND_TIMEOUT_MS));
        }
    }
}

esp_err_t spawn_backend_report_task(void)
{
    esp_err_t err = init_backend_http_mutex();
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to create backend HTTP mutex: %s", esp_err_to_name(err));
        return err;
    }

    BaseType_t result = xTaskCreate(report_task, "report_task", 8192, NULL, 5, NULL);
    if (result != pdPASS)
    {
        ESP_LOGE(TAG, "Failed to spawn report task.");
        return ESP_FAIL;
    }

    return ESP_OK;
}

esp_err_t spawn_event_send_task(void)
{
    esp_err_t err = init_backend_http_mutex();
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to create backend HTTP mutex: %s", esp_err_to_name(err));
        return err;
    }

    BaseType_t result = xTaskCreate(
        event_send_task,
        "event_sender",
        4096,
        NULL,
        5,
        NULL);

    if (result != pdPASS)
    {
        ESP_LOGE(TAG, "Failed to spawn event send task.");
        return ESP_FAIL;
    }

    return ESP_OK;
}
