#include "app_config.h"
#include "app_context.h"
#include "backend_service.h"
#include "config_service.h"
#include "esp_log.h"
#include "provisioning_service.h"
#include "wifi_service.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "event_buffer.h"
#include "esp_timer.h"

#define TAG "main"

/**
 * @brief Reduce log levels of noisy libraries/modules
 */
static void reduce_log_noise(void)
{
    esp_log_level_set("wifi", ESP_LOG_WARN);
    esp_log_level_set("wifi_init", ESP_LOG_WARN);
    esp_log_level_set("phy_init", ESP_LOG_WARN);
    esp_log_level_set("pp", ESP_LOG_WARN);
    esp_log_level_set("net80211", ESP_LOG_WARN);
    esp_log_level_set("esp_netif_handlers", ESP_LOG_WARN);
}

/**
 * @brief Keep alive loop to ensure continuous serial output after main program exits.
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
    ESP_LOGI(TAG, "app_main start");
    reduce_log_noise();
    esp_err_t cfg_err = config_service_set_context();

    // todo create dedicated provisioning service file to keep main flow as simple as possible
    provisioning_service_cert_generate_csr(app_context_device_name(), PROV_CSR_OVERWRITE);

    provisioning_service_cert_print_from_nvs();

    bool cert_exists = provisioning_service_cert_exists();
    // todo fix bug that AP does not stop or disconnect devices after provisioning.
    if (cert_exists && (PROV_HTTPS_FORCE_START || cfg_err != ESP_OK))
    {
        esp_err_t err = provisioning_service_https_start();
        if (err != ESP_OK)
        {
            ESP_LOGE(TAG, "HTTPS provisioning failed to start: %s", esp_err_to_name(err));
        }
        keep_alive_loop();
    }
    else
    {
        ESP_LOGI(TAG, "HTTPS provisioning skipped. Cert exists and force provisioning off.");
    }

    if (PROV_CERT_OVERWRITE || !cert_exists)
    {
        provisioning_service_cert_read_and_store();
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

    esp_err_t werr = wifi_service_init();
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

    if (!spawn_backend_report_task())
    {
        ESP_LOGE(TAG, "Backend service start failed.");
    }
    init_event_buffer();

    if (!spawn_event_send_task())
    {
        ESP_LOGE(TAG, "Failed to start event sender task");
        return;
    }
    char bootEvent[MAX_EVENT_SIZE_BYTES];

    int64_t uptime_ms = esp_timer_get_time() / 1000;
    uint32_t boot_id = app_context_boot_id();

    int len = snprintf(
        bootEvent,
        sizeof(bootEvent),
        "{\"data\":{\"type\":\"systemBoot\",\"source\":{\"bootId\":%lu,\"uptimeMs\":%lld}}}",
        boot_id,
        (long long)uptime_ms);

    if (len > 0 && len < sizeof(bootEvent))
    {
        event_buffer_push(bootEvent, len);
    }
}
