#include "app_config.h"
#include "app_context.h"
#include "backend_service.h"
#include "config_service.h"
#include "esp_log.h"
#include "event_payload_helper.h"
#include "identity_provisioning_service.h"
#include "onsite_provisioning_service.h"
#include "sensor_service.h"
#include "wifi_service.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "event_buffer_service.h"
#include "esp_timer.h"

#define TAG "main"

/**
 * @brief Reduce log levels for noisy libraries and modules.
 */
static void reduce_log_noise(void)
{
    esp_log_level_set("wifi", ESP_LOG_WARN);
    esp_log_level_set("wifi_init", ESP_LOG_WARN);
    esp_log_level_set("phy_init", ESP_LOG_WARN);
    esp_log_level_set("pp", ESP_LOG_WARN);
    esp_log_level_set("net80211", ESP_LOG_WARN);
    esp_log_level_set("esp_netif_handlers", ESP_LOG_WARN);
    esp_log_level_set("NimBLE", ESP_LOG_WARN);
    esp_log_level_set("sensor_service", ESP_LOG_WARN);
    esp_log_level_set("event_buffer_service", ESP_LOG_WARN);
    esp_log_level_set("config_service", ESP_LOG_WARN);
    esp_log_level_set("prov_service", ESP_LOG_WARN);
    esp_log_level_set("i2cdev", ESP_LOG_WARN);
    esp_log_level_set("BLE_INIT", ESP_LOG_WARN);
    esp_log_level_set("coexist", ESP_LOG_WARN);
    esp_log_level_set("backend-client", ESP_LOG_WARN);
}

/**
 * @brief Keep the device alive so serial output continues after startup flow
 * exits.
 */
static void keep_alive_loop(void)
{
    ESP_LOGI(TAG, "Main called keep alive loop, this will not exit.");
    while (true)
    {
        ESP_LOGI(TAG, "alive");
        vTaskDelay(pdMS_TO_TICKS(5000));
    }
}

void app_main(void)
{
    ESP_LOGI(TAG, "app_main start, waiting for boot delay %d ms", BOOT_DELAY_MS);
    vTaskDelay(pdMS_TO_TICKS(BOOT_DELAY_MS));
    ESP_LOGI(TAG, "Boot delay waited, continuing...");

    reduce_log_noise();
    esp_err_t cfg_err = config_set_context();

    generate_csr(app_context_device_name(), PROV_CSR_OVERWRITE);

    if (PROV_PRINT_NVS_CERT_ON_BOOT)
    {
        print_cert_from_nvs();
    }

    bool has_cert = cert_exists();
    if (has_cert && (PROV_HTTPS_FORCE_START || cfg_err != ESP_OK))
    {
        esp_err_t err = start_https_and_softap();
        if (err != ESP_OK)
        {
            ESP_LOGE(TAG, "HTTPS provisioning failed to start: %s", esp_err_to_name(err));
        }
        keep_alive_loop();
    }
    else
    {
        if (!has_cert)
        {
            ESP_LOGI(TAG, "HTTPS provisioning not started because no device certificate is stored yet.");
        }
        else
        {
            ESP_LOGI(TAG, "HTTPS provisioning not started because a device certificate already exists and force start is off.");
        }
    }

    if (PROV_CERT_OVERWRITE || !has_cert)
    {
        serial_read_and_store_cert();
    }
    else
    {
        ESP_LOGI(TAG, "Device cert already stored and force provisioning off. Skipping manual read.");
    }

    if (cfg_err != ESP_OK)
    {
        ESP_LOGW(TAG, "Provisioning data missing; skipping WiFi/HTTP flow.");
        keep_alive_loop();
    }

    esp_err_t err = ESP_OK;
    esp_err_t werr = wifi_init();
    if (werr != ESP_OK)
    {
        ESP_LOGE(TAG, "wifi init failed: %s", esp_err_to_name(werr));
        keep_alive_loop();
    }

    werr = spawn_wifi_connector_task();
    if (werr != ESP_OK)
    {
        ESP_LOGE(TAG, "wifi connector task failed to start");
        keep_alive_loop();
    }

    init_event_buffer();

    err = spawn_backend_report_task();
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Backend service start failed: %s", esp_err_to_name(err));
        keep_alive_loop();
    }

    err = spawn_sensor_event_task();
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to start sensor event task: %s", esp_err_to_name(err));
        keep_alive_loop();
    }

    err = spawn_event_send_task();
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to start event sender task: %s", esp_err_to_name(err));
        keep_alive_loop();
    }
    char boot_event[MAX_EVENT_SIZE_BYTES];
    size_t payload_len = 0;
    err = event_payload_build_system_boot(
        boot_event,
        sizeof(boot_event),
        app_context_boot_id(),
        esp_timer_get_time() / 1000,
        &payload_len);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to build boot event payload: %s", esp_err_to_name(err));
        keep_alive_loop();
    }

    if (send_event(boot_event, (int)payload_len) != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to queue boot event");
    }
}
