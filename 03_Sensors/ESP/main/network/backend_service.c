/**
 * @file backend_service.c
 * @brief This file handles reporting tasks towards the backend.
 */

#include "backend_service.h"
#include "app_config.h"
#include "app_context.h"
#include "backend_client.h"
#include "event_buffer.h"
#include "config_service.h"
#include "esp_err.h"
#include "esp_log.h"
#include "nvs_helper.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#define TAG "backend-service"

static char device_cert_pem[DEVICE_PEM_BUF_SIZE];
static char device_key_pem[DEVICE_PEM_BUF_SIZE];
static bool creds_loaded = false;

esp_err_t send_event(const char *payload, int payload_len)
{
    if (!payload || payload_len <= 0 || payload_len >= MAX_EVENT_SIZE_BYTES)
    {
        return ESP_ERR_INVALID_SIZE;
    }

    if (!event_buffer_push(payload, payload_len))
    {
        return ESP_FAIL;
    }

    return ESP_OK;
}

static esp_err_t ensure_device_credentials(void)
{
    if (creds_loaded)
    {
        return ESP_OK;
    }

    if (nvs_get_string(DEVICE_CERT_PEM_KEY, device_cert_pem, sizeof(device_cert_pem)) != ESP_OK ||
        nvs_get_string(DEVICE_KEY_PEM_KEY, device_key_pem, sizeof(device_key_pem)) != ESP_OK)
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
    uint32_t version = 0;
    char config_json[DEVICE_CONFIG_JSON_BUF_SIZE] = {0};

    if (nvs_get_string(DEVICE_CONFIG_JSON_KEY, config_json, sizeof(config_json)) == ESP_OK)
    {
        char *vptr = strstr(config_json, "\"version\":");
        if (vptr)
        {
            version = (uint32_t)atoi(vptr + 10);
        }
    }
    else
    {
        ESP_LOGI(TAG, "No config found in NVS, using version 0 for report");
    }

    return version;
}

/**
 * @brief Gets device config from backend and stores it.
 */
//todo add explicit error handling.
static void get_device_config(void)
{
    char *config_json = (char *)calloc(1, DEVICE_CONFIG_JSON_BUF_SIZE);
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
                                       DEVICE_CONFIG_JSON_BUF_SIZE);

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

    err = config_service_write_device_config(config_json);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to store config: %s", esp_err_to_name(err));
        free(config_json);
        return;
    }

    ESP_LOGI(TAG, "Config stored successfully");
    free(config_json);
}

/**
 * @brief Looping task that sends a device report.
 *
 * @param arg Unused task arg.
 */
static void report_task(void *arg)
{
    (void)arg;

    while (true)
    {
        bool config_changed = false;
        if (ensure_device_credentials() != ESP_OK)
        {
            ESP_LOGW(TAG, "Report skipped; missing credentials");
            vTaskDelay(pdMS_TO_TICKS(REPORT_INTERVAL_MS));
            continue;
        }

        uint32_t version = get_config_version();
        esp_err_t err = backend_post_report(app_context_backend_host(),
                                            device_cert_pem,
                                            device_key_pem,
                                            version,
                                            &config_changed);

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
 * @param arg Unused task arg.
 */
static void event_send_task(void *arg)
{
    (void)arg;

    while (true)
    {
        uint8_t *event_copy = NULL;
        size_t event_length = 0;
        uint32_t drop_counter_start = 0;

        if (!event_buffer_pop_copy(&event_copy, &event_length, &drop_counter_start))
        {
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

            if (ensure_device_credentials() != ESP_OK)
            {
                ESP_LOGW(TAG, "Send skipped; missing credentials");
                vTaskDelay(pdMS_TO_TICKS(EVENT_BUFFER_SEND_TIMEOUT_MS));
                continue;
            }

            bool sent = (backend_post_event(app_context_backend_host(),
                                            device_cert_pem,
                                            device_key_pem,
                                            event_copy,
                                            event_length) == ESP_OK);
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

bool spawn_backend_report_task(void)
{
    BaseType_t result = xTaskCreate(report_task, "report_task", 8192, NULL, 5, NULL);
    if (result != pdPASS)
    {
        ESP_LOGE(TAG, "Failed to spawn report task.");
        return false;
    }

    return true;
}

bool spawn_event_send_task(void)
{
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
        return false;
    }

    return true;
}
