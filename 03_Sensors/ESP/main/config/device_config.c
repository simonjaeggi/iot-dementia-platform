#include "app_config.h"
#include "app_context.h"
#include "device_config.h"
#include "nvs_helper.h"
#include "esp_err.h"
#include "esp_log.h"
#include "esp_random.h"
#include "nvs.h"
#include <stdio.h>

static const char *TAG = "device_config";

/**
 * @brief Retrieve backend/ssid/password config from NVS.
 *
 * @return ESP_OK on success, error code otherwise
 */
esp_err_t read_prov_config(const char *backend_key, char *backend_out, size_t backend_len,
                           const char *ssid_key, char *ssid_out, size_t ssid_len,
                           const char *pw_key, char *pw_out, size_t pw_len)
{
    esp_err_t err;

    err = nvs_get_string(backend_key, backend_out, backend_len);
    if (err != ESP_OK)
        return err;

    err = nvs_get_string(ssid_key, ssid_out, ssid_len);
    if (err != ESP_OK)
        return err;

    err = nvs_get_string(pw_key, pw_out, pw_len);
    if (err == ESP_ERR_NVS_NOT_FOUND)
    {
        pw_out[0] = '\0';
        err = ESP_OK;
    }
    if (err != ESP_OK)
        return err;

    return ESP_OK;
}
esp_err_t read_device_config(char *out_json, size_t out_len, const char *cfg_key)
{
    if (!cfg_key || !out_json || out_len == 0) {
        return ESP_ERR_INVALID_ARG;
    }

    esp_err_t err = nvs_get_string(cfg_key, out_json, out_len);

    if (err == ESP_ERR_NVS_NOT_FOUND) {
        out_json[0] = '\0';  
    }

    return err;
}

esp_err_t write_device_config(const char *json, const char *cfg_key)
{
    if (!cfg_key || !json || json[0] == '\0') {
        return ESP_ERR_INVALID_ARG;
    }

    return nvs_set_string(cfg_key, json);
}

void device_config_ensure_device_name(void)
{
    char *device_name = app_context_device_name();
    size_t device_name_len = app_context_device_name_len();

    esp_err_t err = nvs_get_string(DEVICE_NAME_KEY, device_name, device_name_len);
    if (err == ESP_OK)
    {
        ESP_LOGI(TAG, "Loaded device name %s", device_name);
        return;
    }
    if (err != ESP_ERR_NVS_NOT_FOUND)
    {
        ESP_LOGW(TAG, "Failed to read device name from NVS");
        return;
    }

    int device_id = (int)(esp_random() % 9000) + 1000;
    snprintf(device_name, device_name_len, DEVICE_NAME_FORMAT, device_id);
    nvs_set_string(DEVICE_NAME_KEY, device_name);
    ESP_LOGI(TAG, "Created device name %s", device_name);
}
