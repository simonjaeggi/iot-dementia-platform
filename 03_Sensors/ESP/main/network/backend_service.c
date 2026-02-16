/**
 * @file backend_service.c
 * @brief This file handles reporting tasks towards the backend.
 */

#include "backend_service.h"
#include "app_config.h"
#include "app_context.h"
#include "backend_communication.h"
#include "device_config.h"
#include "esp_err.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <stdbool.h>
#include <stdlib.h>

#define TAG "backend-service"

static void get_device_config(void)
{
    char *config_json = (char *)calloc(1, DEVICE_CONFIG_JSON_BUF_SIZE);
    if (!config_json)
    {
        ESP_LOGE(TAG, "Failed to allocate config buffer");
        return;
    }

    esp_err_t err = backend_get_config(app_context_backend_host(),
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

    err = write_device_config(config_json, DEVICE_CONFIG_JSON_KEY);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to store config: %s", esp_err_to_name(err));
        free(config_json);
        return;
    }

    ESP_LOGI(TAG, "Config stored successfully");
    free(config_json);
}

static void report_task(void *arg)
{
    while (true)
    {
        bool config_changed = false;
        esp_err_t err = backend_put_report(app_context_backend_host(), &config_changed);

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

static void backend_task(void *arg)
{
    (void)arg;

    esp_err_t herr = backend_get_health(app_context_backend_host());
    if (herr != ESP_OK)
    {
        ESP_LOGW(TAG, "Health check failed: %s", esp_err_to_name(herr));
        vTaskDelete(NULL);
    }

    get_device_config();

    xTaskCreate(report_task,
                "report_task",
                8192,
                NULL,
                5,
                NULL);

    vTaskDelete(NULL);
}

void backend_service_start(void) {
    xTaskCreate(backend_task, "backend_task", 8192, NULL, 5, NULL);
}
