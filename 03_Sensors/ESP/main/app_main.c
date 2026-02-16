#include "app_config.h"
#include "app_context.h"
#include "backend_service.h"
#include "device_config.h"
#include "esp_log.h"
#include "provisioning_cert.h"
#include "provisioning_https.h"
#include "wifi_helper.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#define TAG "main"


static void reduce_log_noise(void)
{
    esp_log_level_set("wifi", ESP_LOG_WARN);
    esp_log_level_set("wifi_init", ESP_LOG_WARN);
    esp_log_level_set("phy_init", ESP_LOG_WARN);
    esp_log_level_set("pp", ESP_LOG_WARN);
    esp_log_level_set("net80211", ESP_LOG_WARN);
    esp_log_level_set("esp_netif_handlers", ESP_LOG_WARN);
}

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
    device_config_ensure_device_name();

    // todo create dedicated provisioning service file to keep main flow as simple as possible
    provisioning_cert(app_context_device_name(), PROV_CSR_OVERWRITE);

    print_cert_from_nvs();

    esp_err_t cfg_err = read_prov_config(BACKEND_HOST_KEY, app_context_backend_host(), app_context_backend_host_len(),
                                         WIFI_SSID_KEY, app_context_wifi_ssid(), app_context_wifi_ssid_len(),
                                         WIFI_PASSWORD_KEY, app_context_wifi_password(), app_context_wifi_password_len());

    bool cert_exists = provisioning_cert_exists();

    if (cert_exists && (PROV_HTTPS_FORCE_START || cfg_err != ESP_OK))
    {
        esp_err_t err = provisioning_https_start();
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
        read_and_store_cert();
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

    esp_err_t werr = wifi_helper_init();
    if (werr != ESP_OK)
    {
        ESP_LOGE(TAG, "wifi init failed: %s", esp_err_to_name(werr));
        keep_alive_loop();
    }

    werr = wifi_helper_connect(app_context_wifi_ssid(), app_context_wifi_password(), 5, true);
    if (werr != ESP_OK)
    {
        ESP_LOGE(TAG, "wifi connect failed: %s", esp_err_to_name(werr));
        keep_alive_loop();
    }

    backend_service_start();

}
