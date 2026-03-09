#include "config_service.h"
#include "app_config.h"
#include "app_context.h"
#include "nvs_helper.h"
#include "esp_log.h"
#include "esp_random.h"
#include <stdio.h>
#include <stdint.h>

static const char *TAG = "config_service";
static bool boot_id_updated = false;

static esp_err_t config_service_read_prov_context(void)
{
    char *backend_out = app_context_backend_host();
    size_t backend_len = app_context_backend_host_len();
    char *ssid_out = app_context_wifi_ssid();
    size_t ssid_len = app_context_wifi_ssid_len();
    char *pw_out = app_context_wifi_password();
    size_t pw_len = app_context_wifi_password_len();

    if (!backend_out || backend_len == 0 ||
        !ssid_out || ssid_len == 0 ||
        !pw_out || pw_len == 0)
    {
        ESP_LOGE(TAG, "Context buffers not initialized");
        return ESP_FAIL;
    }

    if (nvs_get_string(BACKEND_HOST_KEY, backend_out, backend_len) != ESP_OK)
        return ESP_FAIL;

    if (nvs_get_string(WIFI_SSID_KEY, ssid_out, ssid_len) != ESP_OK)
        return ESP_FAIL;

    pw_out[0] = '\0';
    if (nvs_get_string(WIFI_PASSWORD_KEY, pw_out, pw_len) != ESP_OK)
        return ESP_OK;

    return ESP_OK;
}

static esp_err_t config_service_ensure_device_name(void)
{
    char *device_name = app_context_device_name();
    size_t device_name_len = app_context_device_name_len();

    if (!device_name || device_name_len == 0)
    {
        ESP_LOGE(TAG, "Device name buffer not initialized");
        return ESP_FAIL;
    }

    if (nvs_get_string(DEVICE_NAME_KEY, device_name, device_name_len) == ESP_OK &&
        device_name[0] != '\0')
    {
        ESP_LOGI(TAG, "Loaded device name %s", device_name);
        return ESP_OK;
    }

    int device_id = (int)(esp_random() % 9000) + 1000;
    snprintf(device_name, device_name_len, DEVICE_NAME_FORMAT, device_id);
    if (nvs_set_string(DEVICE_NAME_KEY, device_name) != ESP_OK)
    {
        ESP_LOGW(TAG, "Failed to write new device name to NVS: %s", device_name);
        return ESP_FAIL;
    }

    ESP_LOGI(TAG, "Created device name %s", device_name);
    return ESP_OK;
}

static esp_err_t config_service_update_boot_id(void)
{
    if (boot_id_updated)
    {
        return ESP_OK;
    }

    uint32_t next_boot_id = 1;
    uint32_t current = 0;

    if (nvs_get_int(BOOT_ID_KEY, &current) == ESP_OK)
    {
        next_boot_id = current + 1;
    }

    app_context_set_boot_id(next_boot_id);
    if (nvs_set_int(BOOT_ID_KEY, next_boot_id) != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to write boot id to NVS");
        return ESP_FAIL;
    }

    boot_id_updated = true;
    return ESP_OK;
}

esp_err_t config_service_set_context(void)
{
    if (config_service_ensure_device_name() != ESP_OK)
    {
        ESP_LOGW(TAG, "Device name unavailable");
    }

    esp_err_t prov_err = config_service_read_prov_context();
    if (prov_err != ESP_OK)
    {
        ESP_LOGW(TAG, "Provisioning data missing or unreadable");
    }

    if (config_service_update_boot_id() != ESP_OK)
    {
        ESP_LOGW(TAG, "Boot id update failed");
    }

    return prov_err;
}

esp_err_t config_service_read_device_config(char *out_json, size_t out_len)
{
    if (!out_json || out_len == 0)
    {
        return ESP_ERR_INVALID_ARG;
    }

    out_json[0] = '\0';
    return (nvs_get_string(DEVICE_CONFIG_JSON_KEY, out_json, out_len) == ESP_OK) ? ESP_OK : ESP_FAIL;
}

esp_err_t config_service_write_device_config(const char *json)
{
    if (!json || json[0] == '\0')
    {
        return ESP_ERR_INVALID_ARG;
    }

    return nvs_set_string(DEVICE_CONFIG_JSON_KEY, json);
}
