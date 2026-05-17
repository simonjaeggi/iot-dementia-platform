#include "config_service.h"
#include "app_config.h"
#include "app_context.h"
#include "nvs_helper.h"
#include "esp_log.h"
#include "esp_random.h"
#include "cJSON.h"
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>

static const char *TAG = "config_service";
static bool boot_id_updated = false;

static esp_err_t read_prov_context(void)
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

    if (nvs_cfg_get_string(BACKEND_HOST_KEY, backend_out, backend_len) != ESP_OK)
        return ESP_FAIL;

    if (nvs_cfg_get_string(WIFI_SSID_KEY, ssid_out, ssid_len) != ESP_OK)
        return ESP_FAIL;

    pw_out[0] = '\0';
    if (nvs_cfg_get_string(WIFI_PASSWORD_KEY, pw_out, pw_len) != ESP_OK)
        return ESP_OK;

    return ESP_OK;
}

static esp_err_t ensure_device_name(void)
{
    char *device_name = app_context_device_name();
    size_t device_name_len = app_context_device_name_len();

    if (!device_name || device_name_len == 0)
    {
        ESP_LOGE(TAG, "Device name buffer not initialized");
        return ESP_FAIL;
    }

    if (nvs_cfg_get_string(DEVICE_NAME_KEY, device_name, device_name_len) == ESP_OK &&
        device_name[0] != '\0')
    {
        ESP_LOGI(TAG, "Loaded device name %s", device_name);
        return ESP_OK;
    }

    int device_id = (int)(esp_random() % 9000) + 1000;
    snprintf(device_name, device_name_len, DEVICE_NAME_FMT, device_id);
    if (nvs_cfg_set_string(DEVICE_NAME_KEY, device_name) != ESP_OK)
    {
        ESP_LOGW(TAG, "Failed to write new device name to NVS: %s", device_name);
        return ESP_FAIL;
    }

    ESP_LOGI(TAG, "Created device name %s", device_name);
    return ESP_OK;
}

static esp_err_t update_boot_id(void)
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

static esp_err_t read_device_config_from_nvs(void)
{
    device_config_t *device_cfg = (device_config_t *)calloc(1, sizeof(device_config_t));
    uint32_t sensor_count = 0;
    int sensor_count_int = 0;

    if (device_cfg == NULL)
    {
        ESP_LOGE(TAG, "Failed to allocate temporary device config buffer.");
        return ESP_FAIL;
    }

    if (nvs_cfg_get_int(DEVICE_CONFIG_VERSION_KEY, &device_cfg->version) != ESP_OK)
    {
        ESP_LOGW(TAG, "Device config version failed to read from NVS.");
        free(device_cfg);
        return ESP_FAIL;
    }

    if (nvs_cfg_get_int(DEVICE_CONFIG_SENSOR_COUNT_KEY, &sensor_count) != ESP_OK)
    {
        ESP_LOGW(TAG, "Device config sensor count failed to read from NVS.");
        free(device_cfg);
        return ESP_FAIL;
    }

    sensor_count_int = (int)sensor_count;

    if (sensor_count > DEVICE_CFG_MAX_SENSORS)
    {
        ESP_LOGW(TAG, "Device config contains too many sensors (%d/%d). Consider increasing max sensor count in app_config.", sensor_count_int, DEVICE_CFG_MAX_SENSORS);
        free(device_cfg);
        return ESP_FAIL;
    }

    device_cfg->sensor_count = (uint8_t)sensor_count;

    for (int i = 0; i < sensor_count_int; i++)
    {
        char key[64] = {0};

        snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_ID_KEY_FMT, i);
        if (nvs_cfg_get_string(key, device_cfg->sensors[i].id, sizeof(device_cfg->sensors[i].id)) != ESP_OK)
        {
            ESP_LOGW(TAG, "Device config sensor with array index %d id failed to read from NVS.", i);
            free(device_cfg);
            return ESP_FAIL;
        }

        uint32_t type = 0;
        snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_TYPE_KEY_FMT, i);
        if (nvs_cfg_get_int(key, &type) != ESP_OK)
        {
            ESP_LOGW(TAG, "Device config sensor with array index %d type failed to read from NVS.", i);
            free(device_cfg);
            return ESP_FAIL;
        }
        device_cfg->sensors[i].type = (sensor_type_t)type;

        snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_PUBLISH_INTERVAL_MS_KEY_FMT, i);
        if (nvs_cfg_get_int(key, &device_cfg->sensors[i].publish_interval_ms) != ESP_OK)
        {
            ESP_LOGW(TAG, "Device config sensor with array index %d publishIntervalMs failed to read from NVS.", i);
            free(device_cfg);
            return ESP_FAIL;
        }

        if (device_cfg->sensors[i].type == SENSOR_TYPE_INDOOR_LOCATION)
        {
            uint32_t beacon_count = 0;
            int beacon_count_int = 0;

            snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_BEACON_MAC_COUNT_KEY_FMT, i);
            if (nvs_cfg_get_int(key, &beacon_count) != ESP_OK)
            {
                ESP_LOGW(TAG, "Device config indoorLocation sensor with array index %d: beacon count failed to read from NVS.", i);
                free(device_cfg);
                return ESP_FAIL;
            }

            if (beacon_count > DEVICE_CFG_MAX_BEACONS_PER_LOCATION_SENSOR)
            {
                ESP_LOGW(TAG, "Device config indoorLocation sensor with array index %d: beacon count out of bounds.", i);
                free(device_cfg);
                return ESP_FAIL;
            }

            beacon_count_int = (int)beacon_count;
            device_cfg->sensors[i].config.indoor_location.beacon_mac_count = (uint8_t)beacon_count;

            for (int j = 0; j < beacon_count_int; j++)
            {
                snprintf(
                    key,
                    sizeof(key),
                    DEVICE_CONFIG_SENSOR_BEACON_MAC_KEY_FMT,
                    i,
                    j);

                if (nvs_cfg_get_string(
                        key,
                        device_cfg->sensors[i].config.indoor_location.beacon_mac_addresses[j],
                        sizeof(device_cfg->sensors[i].config.indoor_location.beacon_mac_addresses[j])) != ESP_OK)
                {
                    ESP_LOGW(TAG, "Device config indoorLocation sensor with array index %d: beacon mac with array index %d failed to read from NVS.", i, j);
                    free(device_cfg);
                    return ESP_FAIL;
                }
            }
        }
        else if (device_cfg->sensors[i].type == SENSOR_TYPE_INFRASTRUCTURE_STATUS)
        {
            uint32_t gpio_pin = 0;

            snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_GPIO_PIN_KEY_FMT, i);
            if (nvs_cfg_get_int(key, &gpio_pin) != ESP_OK)
            {
                ESP_LOGW(TAG, "Device config infrastructureStatus sensor with array index %d: gpio pin failed to read from NVS.", i);
                free(device_cfg);
                return ESP_FAIL;
            }

            if (gpio_pin < 1 || gpio_pin > 255)
            {
                ESP_LOGW(TAG, "Device config infrastructureStatus sensor with array index %d: gpio pin out of bounds.", i);
                free(device_cfg);
                return ESP_FAIL;
            }

            device_cfg->sensors[i].config.infrastructure_status.gpio_pin = (uint8_t)gpio_pin;
        }
        else if (device_cfg->sensors[i].type == SENSOR_TYPE_TEMPERATURE_HUMIDITY ||
                 device_cfg->sensors[i].type == SENSOR_TYPE_LIGHT_INTENSITY ||
                 device_cfg->sensors[i].type == SENSOR_TYPE_ACCEL ||
                 device_cfg->sensors[i].type == SENSOR_TYPE_GNSS)
        {
            uint32_t i2c_sda_pin = 0;
            uint32_t i2c_scl_pin = 0;
            const char *sensor_type_name =
                device_cfg->sensors[i].type == SENSOR_TYPE_LIGHT_INTENSITY
                    ? "lightIntensity"
                    : device_cfg->sensors[i].type == SENSOR_TYPE_ACCEL
                          ? "accelerometer"
                          : device_cfg->sensors[i].type == SENSOR_TYPE_GNSS
                                ? "gnss"
                    : "temperatureHumidity";

            snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_I2C_SDA_PIN_KEY_FMT, i);
            if (nvs_cfg_get_int(key, &i2c_sda_pin) != ESP_OK)
            {
                ESP_LOGW(TAG, "Device config %s sensor with array index %d: i2c sda pin failed to read from NVS.", sensor_type_name, i);
                free(device_cfg);
                return ESP_FAIL;
            }

            snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_I2C_SCL_PIN_KEY_FMT, i);
            if (nvs_cfg_get_int(key, &i2c_scl_pin) != ESP_OK)
            {
                ESP_LOGW(TAG, "Device config %s sensor with array index %d: i2c scl pin failed to read from NVS.", sensor_type_name, i);
                free(device_cfg);
                return ESP_FAIL;
            }

            if (i2c_sda_pin < 1 || i2c_sda_pin > 255 || i2c_scl_pin < 1 || i2c_scl_pin > 255)
            {
                ESP_LOGW(TAG, "Device config %s sensor with array index %d: i2c sda or scl pin number out of bounds.", sensor_type_name, i);
                free(device_cfg);
                return ESP_FAIL;
            }

            if (device_cfg->sensors[i].type == SENSOR_TYPE_LIGHT_INTENSITY)
            {
                device_cfg->sensors[i].config.light_intensity.i2c_sda_pin = (uint8_t)i2c_sda_pin;
                device_cfg->sensors[i].config.light_intensity.i2c_scl_pin = (uint8_t)i2c_scl_pin;
            }
            else if (device_cfg->sensors[i].type == SENSOR_TYPE_ACCEL)
            {
                uint32_t poll_interval_ms = 0;
                float fall_threshold_g = 0.0f;

                snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_POLL_INTERVAL_MS_KEY_FMT, i);
                if (nvs_cfg_get_int(key, &poll_interval_ms) != ESP_OK)
                {
                    ESP_LOGW(TAG, "Device config accelerometer sensor with array index %d: poll interval failed to read from NVS.", i);
                    free(device_cfg);
                    return ESP_FAIL;
                }

                snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_FALL_THRESHOLD_G_KEY_FMT, i);
                if (nvs_cfg_get_float(key, &fall_threshold_g) != ESP_OK)
                {
                    ESP_LOGW(TAG, "Device config accelerometer sensor with array index %d: fall threshold failed to read from NVS.", i);
                    free(device_cfg);
                    return ESP_FAIL;
                }

                if (poll_interval_ms < 1)
                {
                    ESP_LOGW(TAG, "Device config accelerometer sensor with array index %d: poll interval out of bounds.", i);
                    free(device_cfg);
                    return ESP_FAIL;
                }

                device_cfg->sensors[i].config.accel.i2c_sda_pin = (uint8_t)i2c_sda_pin;
                device_cfg->sensors[i].config.accel.i2c_scl_pin = (uint8_t)i2c_scl_pin;
                device_cfg->sensors[i].config.accel.poll_interval_ms = poll_interval_ms;
                device_cfg->sensors[i].config.accel.fall_threshold_g = fall_threshold_g;
            }
            else if (device_cfg->sensors[i].type == SENSOR_TYPE_GNSS)
            {
                device_cfg->sensors[i].config.gnss.i2c_sda_pin = (uint8_t)i2c_sda_pin;
                device_cfg->sensors[i].config.gnss.i2c_scl_pin = (uint8_t)i2c_scl_pin;
            }
            else
            {
                device_cfg->sensors[i].config.temperature_humidity.i2c_sda_pin = (uint8_t)i2c_sda_pin;
                device_cfg->sensors[i].config.temperature_humidity.i2c_scl_pin = (uint8_t)i2c_scl_pin;
            }
        }
        else if (device_cfg->sensors[i].type == SENSOR_TYPE_MIC)
        {
            uint32_t i2s_bclk_pin = 0;
            uint32_t i2s_lrck_pin = 0;
            uint32_t i2s_din_pin = 0;
            uint32_t poll_interval_ms = 0;
            float noise_threshold_db = 0.0f;
            float db_offset = 0.0f;

            snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_I2S_BCLK_PIN_KEY_FMT, i);
            if (nvs_cfg_get_int(key, &i2s_bclk_pin) != ESP_OK)
            {
                ESP_LOGW(TAG, "Device config noiseLevel sensor with array index %d: i2s bclk pin failed to read from NVS.", i);
                free(device_cfg);
                return ESP_FAIL;
            }

            snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_I2S_LRCK_PIN_KEY_FMT, i);
            if (nvs_cfg_get_int(key, &i2s_lrck_pin) != ESP_OK)
            {
                ESP_LOGW(TAG, "Device config noiseLevel sensor with array index %d: i2s lrck pin failed to read from NVS.", i);
                free(device_cfg);
                return ESP_FAIL;
            }

            snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_I2S_DIN_PIN_KEY_FMT, i);
            if (nvs_cfg_get_int(key, &i2s_din_pin) != ESP_OK)
            {
                ESP_LOGW(TAG, "Device config noiseLevel sensor with array index %d: i2s din pin failed to read from NVS.", i);
                free(device_cfg);
                return ESP_FAIL;
            }

            snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_POLL_INTERVAL_MS_KEY_FMT, i);
            if (nvs_cfg_get_int(key, &poll_interval_ms) != ESP_OK)
            {
                ESP_LOGW(TAG, "Device config noiseLevel sensor with array index %d: poll interval failed to read from NVS.", i);
                free(device_cfg);
                return ESP_FAIL;
            }

            snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_NOISE_THRESHOLD_DB_KEY_FMT, i);
            if (nvs_cfg_get_float(key, &noise_threshold_db) != ESP_OK)
            {
                ESP_LOGW(TAG, "Device config noiseLevel sensor with array index %d: noise threshold failed to read from NVS.", i);
                free(device_cfg);
                return ESP_FAIL;
            }

            snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_DB_OFFSET_KEY_FMT, i);
            if (nvs_cfg_get_float(key, &db_offset) != ESP_OK)
            {
                ESP_LOGW(TAG, "Device config noiseLevel sensor with array index %d: db offset failed to read from NVS.", i);
                free(device_cfg);
                return ESP_FAIL;
            }

            if (i2s_bclk_pin < 1 || i2s_bclk_pin > 255 ||
                i2s_lrck_pin < 1 || i2s_lrck_pin > 255 ||
                i2s_din_pin < 1 || i2s_din_pin > 255 ||
                poll_interval_ms < 1)
            {
                ESP_LOGW(TAG, "Device config noiseLevel sensor with array index %d: fields out of bounds.", i);
                free(device_cfg);
                return ESP_FAIL;
            }

            device_cfg->sensors[i].config.mic.i2s_bclk_pin = (int)i2s_bclk_pin;
            device_cfg->sensors[i].config.mic.i2s_lrck_pin = (int)i2s_lrck_pin;
            device_cfg->sensors[i].config.mic.i2s_din_pin = (int)i2s_din_pin;
            device_cfg->sensors[i].config.mic.poll_interval_ms = poll_interval_ms;
            device_cfg->sensors[i].config.mic.noise_threshold_db = noise_threshold_db;
            device_cfg->sensors[i].config.mic.db_offset = db_offset;
        }
        else
        {
            ESP_LOGW(TAG, "Device config sensor with array index %d type is unsupported.", i);
            free(device_cfg);
            return ESP_FAIL;
        }
    }

    app_context_set_device_cfg(device_cfg);
    free(device_cfg);
    ESP_LOGI(TAG, "Successfully read device config from NVS.");

    return ESP_OK;
}

esp_err_t config_set_context(void)
{
    if (ensure_device_name() != ESP_OK)
    {
        ESP_LOGW(TAG, "Device name unavailable");
    }

    esp_err_t prov_err = read_prov_context();
    if (prov_err != ESP_OK)
    {
        ESP_LOGW(TAG, "Provisioning data missing or unreadable");
    }

    if (update_boot_id() != ESP_OK)
    {
        ESP_LOGW(TAG, "Boot id update failed");
    }

    if (read_device_config_from_nvs() != ESP_OK)
    {
        ESP_LOGW(TAG, "Failed to read device sensor config from NVS. Either doesn't exist or read failed.");
    }

    return prov_err;
}

static esp_err_t write_device_config_to_nvs(const device_config_t *device_cfg)
{
    if (device_cfg == NULL)
    {
        ESP_LOGW(TAG, "Device config pointer is null.");
        return ESP_ERR_INVALID_ARG;
    }

    if (device_cfg->sensor_count > DEVICE_CFG_MAX_SENSORS)
    {
        ESP_LOGW(TAG, "Device config contains too many sensors (%d/%d). Consider increasing max sensor count in app_config.", device_cfg->sensor_count, DEVICE_CFG_MAX_SENSORS);
        return ESP_FAIL;
    }

    if (nvs_cfg_set_int(DEVICE_CONFIG_VERSION_KEY, device_cfg->version) != ESP_OK)
    {
        ESP_LOGW(TAG, "Device config version failed to write to NVS.");
        return ESP_FAIL;
    }

    if (nvs_cfg_set_int(DEVICE_CONFIG_SENSOR_COUNT_KEY, device_cfg->sensor_count) != ESP_OK)
    {
        ESP_LOGW(TAG, "Device config sensor count failed to write to NVS.");
        return ESP_FAIL;
    }

    for (int i = 0; i < device_cfg->sensor_count; i++)
    {
        char key[64] = {0};

        snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_ID_KEY_FMT, i);
        if (nvs_cfg_set_string(key, device_cfg->sensors[i].id) != ESP_OK)
        {
            ESP_LOGW(TAG, "Device config sensor with array index %d id failed to write to NVS.", i);
            return ESP_FAIL;
        }

        snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_TYPE_KEY_FMT, i);
        if (nvs_cfg_set_int(key, device_cfg->sensors[i].type) != ESP_OK)
        {
            ESP_LOGW(TAG, "Device config sensor with array index %d type failed to write to NVS.", i);
            return ESP_FAIL;
        }

        snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_PUBLISH_INTERVAL_MS_KEY_FMT, i);
        if (nvs_cfg_set_int(key, device_cfg->sensors[i].publish_interval_ms) != ESP_OK)
        {
            ESP_LOGW(TAG, "Device config sensor with array index %d publishIntervalMs failed to write to NVS.", i);
            return ESP_FAIL;
        }

        if (device_cfg->sensors[i].type == SENSOR_TYPE_INDOOR_LOCATION)
        {
            if (device_cfg->sensors[i].config.indoor_location.beacon_mac_count > DEVICE_CFG_MAX_BEACONS_PER_LOCATION_SENSOR)
            {
                ESP_LOGW(TAG, "Device config indoorLocation sensor with array index %d: beacon count out of bounds.", i);
                return ESP_FAIL;
            }

            snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_BEACON_MAC_COUNT_KEY_FMT, i);
            if (nvs_cfg_set_int(key, device_cfg->sensors[i].config.indoor_location.beacon_mac_count) != ESP_OK)
            {
                ESP_LOGW(TAG, "Device config indoorLocation sensor with array index %d: beacon count failed to write to NVS.", i);
                return ESP_FAIL;
            }

            for (int j = 0; j < device_cfg->sensors[i].config.indoor_location.beacon_mac_count; j++)
            {
                snprintf(
                    key,
                    sizeof(key),
                    DEVICE_CONFIG_SENSOR_BEACON_MAC_KEY_FMT,
                    i,
                    j);

                if (nvs_cfg_set_string(
                        key,
                        device_cfg->sensors[i].config.indoor_location.beacon_mac_addresses[j]) != ESP_OK)
                {
                    ESP_LOGW(TAG, "Device config indoorLocation sensor with array index %d: beacon mac with array index %d failed to write to NVS.", i, j);
                    return ESP_FAIL;
                }
            }
        }
        else if (device_cfg->sensors[i].type == SENSOR_TYPE_INFRASTRUCTURE_STATUS)
        {
            uint8_t gpio_pin = device_cfg->sensors[i].config.infrastructure_status.gpio_pin;

            if (gpio_pin < 1)
            {
                ESP_LOGW(TAG, "Device config infrastructureStatus sensor with array index %d: gpio pin out of bounds.", i);
                return ESP_FAIL;
            }

            snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_GPIO_PIN_KEY_FMT, i);
            if (nvs_cfg_set_int(key, gpio_pin) != ESP_OK)
            {
                ESP_LOGW(TAG, "Device config infrastructureStatus sensor with array index %d: gpio pin failed to write to NVS.", i);
                return ESP_FAIL;
            }
        }
        else if (device_cfg->sensors[i].type == SENSOR_TYPE_TEMPERATURE_HUMIDITY ||
                 device_cfg->sensors[i].type == SENSOR_TYPE_LIGHT_INTENSITY ||
                 device_cfg->sensors[i].type == SENSOR_TYPE_ACCEL ||
                 device_cfg->sensors[i].type == SENSOR_TYPE_GNSS)
        {
            uint8_t i2c_sda_pin = device_cfg->sensors[i].type == SENSOR_TYPE_LIGHT_INTENSITY
                                      ? device_cfg->sensors[i].config.light_intensity.i2c_sda_pin
                                      : device_cfg->sensors[i].type == SENSOR_TYPE_ACCEL
                                            ? device_cfg->sensors[i].config.accel.i2c_sda_pin
                                            : device_cfg->sensors[i].type == SENSOR_TYPE_GNSS
                                                  ? device_cfg->sensors[i].config.gnss.i2c_sda_pin
                                            : device_cfg->sensors[i].config.temperature_humidity.i2c_sda_pin;
            uint8_t i2c_scl_pin = device_cfg->sensors[i].type == SENSOR_TYPE_LIGHT_INTENSITY
                                      ? device_cfg->sensors[i].config.light_intensity.i2c_scl_pin
                                      : device_cfg->sensors[i].type == SENSOR_TYPE_ACCEL
                                            ? device_cfg->sensors[i].config.accel.i2c_scl_pin
                                            : device_cfg->sensors[i].type == SENSOR_TYPE_GNSS
                                                  ? device_cfg->sensors[i].config.gnss.i2c_scl_pin
                                            : device_cfg->sensors[i].config.temperature_humidity.i2c_scl_pin;
            const char *sensor_type_name =
                device_cfg->sensors[i].type == SENSOR_TYPE_LIGHT_INTENSITY
                    ? "lightIntensity"
                    : device_cfg->sensors[i].type == SENSOR_TYPE_ACCEL
                          ? "accelerometer"
                          : device_cfg->sensors[i].type == SENSOR_TYPE_GNSS
                                ? "gnss"
                    : "temperatureHumidity";

            if (i2c_sda_pin < 1 || i2c_scl_pin < 1)
            {
                ESP_LOGW(TAG, "Device config %s sensor with array index %d: i2c sda or scl pin number out of bounds.", sensor_type_name, i);
                return ESP_FAIL;
            }

            snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_I2C_SDA_PIN_KEY_FMT, i);
            if (nvs_cfg_set_int(key, i2c_sda_pin) != ESP_OK)
            {
                ESP_LOGW(TAG, "Device config %s sensor with array index %d: i2c sda pin failed to write to NVS.", sensor_type_name, i);
                return ESP_FAIL;
            }

            snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_I2C_SCL_PIN_KEY_FMT, i);
            if (nvs_cfg_set_int(key, i2c_scl_pin) != ESP_OK)
            {
                ESP_LOGW(TAG, "Device config %s sensor with array index %d: i2c scl pin failed to write to NVS.", sensor_type_name, i);
                return ESP_FAIL;
            }

            if (device_cfg->sensors[i].type == SENSOR_TYPE_ACCEL)
            {
                snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_POLL_INTERVAL_MS_KEY_FMT, i);
                if (nvs_cfg_set_int(key, device_cfg->sensors[i].config.accel.poll_interval_ms) != ESP_OK)
                {
                    ESP_LOGW(TAG, "Device config accelerometer sensor with array index %d: poll interval failed to write to NVS.", i);
                    return ESP_FAIL;
                }

                snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_FALL_THRESHOLD_G_KEY_FMT, i);
                if (nvs_cfg_set_float(key, device_cfg->sensors[i].config.accel.fall_threshold_g) != ESP_OK)
                {
                    ESP_LOGW(TAG, "Device config accelerometer sensor with array index %d: fall threshold failed to write to NVS.", i);
                    return ESP_FAIL;
                }
            }
        }
        else if (device_cfg->sensors[i].type == SENSOR_TYPE_MIC)
        {
            int i2s_bclk_pin = device_cfg->sensors[i].config.mic.i2s_bclk_pin;
            int i2s_lrck_pin = device_cfg->sensors[i].config.mic.i2s_lrck_pin;
            int i2s_din_pin = device_cfg->sensors[i].config.mic.i2s_din_pin;

            if (i2s_bclk_pin < 1 || i2s_lrck_pin < 1 || i2s_din_pin < 1)
            {
                ESP_LOGW(TAG, "Device config noiseLevel sensor with array index %d: i2s pin number out of bounds.", i);
                return ESP_FAIL;
            }

            snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_I2S_BCLK_PIN_KEY_FMT, i);
            if (nvs_cfg_set_int(key, (uint32_t)i2s_bclk_pin) != ESP_OK)
            {
                ESP_LOGW(TAG, "Device config noiseLevel sensor with array index %d: i2s bclk pin failed to write to NVS.", i);
                return ESP_FAIL;
            }

            snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_I2S_LRCK_PIN_KEY_FMT, i);
            if (nvs_cfg_set_int(key, (uint32_t)i2s_lrck_pin) != ESP_OK)
            {
                ESP_LOGW(TAG, "Device config noiseLevel sensor with array index %d: i2s lrck pin failed to write to NVS.", i);
                return ESP_FAIL;
            }

            snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_I2S_DIN_PIN_KEY_FMT, i);
            if (nvs_cfg_set_int(key, (uint32_t)i2s_din_pin) != ESP_OK)
            {
                ESP_LOGW(TAG, "Device config noiseLevel sensor with array index %d: i2s din pin failed to write to NVS.", i);
                return ESP_FAIL;
            }

            snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_POLL_INTERVAL_MS_KEY_FMT, i);
            if (nvs_cfg_set_int(key, device_cfg->sensors[i].config.mic.poll_interval_ms) != ESP_OK)
            {
                ESP_LOGW(TAG, "Device config noiseLevel sensor with array index %d: poll interval failed to write to NVS.", i);
                return ESP_FAIL;
            }

            snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_NOISE_THRESHOLD_DB_KEY_FMT, i);
            if (nvs_cfg_set_float(key, device_cfg->sensors[i].config.mic.noise_threshold_db) != ESP_OK)
            {
                ESP_LOGW(TAG, "Device config noiseLevel sensor with array index %d: noise threshold failed to write to NVS.", i);
                return ESP_FAIL;
            }

            snprintf(key, sizeof(key), DEVICE_CONFIG_SENSOR_DB_OFFSET_KEY_FMT, i);
            if (nvs_cfg_set_float(key, device_cfg->sensors[i].config.mic.db_offset) != ESP_OK)
            {
                ESP_LOGW(TAG, "Device config noiseLevel sensor with array index %d: db offset failed to write to NVS.", i);
                return ESP_FAIL;
            }
        }
        else
        {
            ESP_LOGW(TAG, "Device config sensor with array index %d type is unsupported.", i);
            return ESP_FAIL;
        }
    }

    return ESP_OK;
}

esp_err_t config_write_device_config(const char *json)
{
    if (!json || json[0] == '\0')
    {
        return ESP_ERR_INVALID_ARG;
    }

    cJSON *parsed_json = cJSON_Parse(json);
    if (parsed_json == NULL)
    {
        ESP_LOGW(TAG, "Failed to parse device config JSON.");
        return ESP_ERR_INVALID_RESPONSE;
    }

    device_config_t *device_cfg = (device_config_t *)calloc(1, sizeof(device_config_t));
    if (device_cfg == NULL)
    {
        cJSON_Delete(parsed_json);
        ESP_LOGE(TAG, "Failed to allocate parsed device config buffer.");
        return ESP_FAIL;
    }

    esp_err_t err = config_parse_device_config(parsed_json, device_cfg);

    cJSON_Delete(parsed_json);

    if (err != ESP_OK)
    {
        ESP_LOGW(TAG, "Failed to parse device config from JSON.");
        free(device_cfg);
        return ESP_ERR_INVALID_RESPONSE;
    }
    ESP_LOGI(TAG, "parse success");
    app_context_set_device_cfg(device_cfg);
    err = write_device_config_to_nvs(device_cfg);
    free(device_cfg);
    return err;
}

esp_err_t config_parse_device_config(cJSON *parsed_json, device_config_t *out_device_cfg)
{
    if (parsed_json == NULL || out_device_cfg == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    memset(out_device_cfg, 0, sizeof(device_config_t));

    cJSON *version = cJSON_GetObjectItemCaseSensitive(parsed_json, "version");
    cJSON *sensors = cJSON_GetObjectItemCaseSensitive(parsed_json, "sensors");

    if (!cJSON_IsNumber(version) || !cJSON_IsArray(sensors))
    {
        ESP_LOGW(TAG, "Device config version NAN or sensors list is not an array.");
        return ESP_ERR_INVALID_ARG;
    }

    int sensor_count = cJSON_GetArraySize(sensors);
    if (sensor_count < 0 || sensor_count > DEVICE_CFG_MAX_SENSORS)
    {
        ESP_LOGW(TAG, "Device config contains too many sensors (%d/%d). Consider increasing max sensor count in app_config.", sensor_count, DEVICE_CFG_MAX_SENSORS);
        return ESP_ERR_INVALID_ARG;
    }

    out_device_cfg->version = (uint32_t)cJSON_GetNumberValue(version);
    out_device_cfg->sensor_count = (uint8_t)sensor_count;

    for (int i = 0; i < sensor_count; i++)
    {
        cJSON *sensor = cJSON_GetArrayItem(sensors, i);
        if (!cJSON_IsObject(sensor))
        {
            ESP_LOGW(TAG, "Device config sensor with array index %d is not an object.", i);
            return ESP_ERR_INVALID_ARG;
        }

        cJSON *id = cJSON_GetObjectItemCaseSensitive(sensor, "id");
        cJSON *type = cJSON_GetObjectItemCaseSensitive(sensor, "type");
        cJSON *publish_interval_ms = cJSON_GetObjectItemCaseSensitive(sensor, "publishIntervalMs");

        if (!cJSON_IsString(id) ||
            !cJSON_IsString(type) ||
            !cJSON_IsNumber(publish_interval_ms))
        {
            ESP_LOGW(TAG, "Device config sensor with array index %d id, type or publishIntervalMs in wrong format.", i);
            return ESP_ERR_INVALID_ARG;
        }

        if (strlen(id->valuestring) >= DEVICE_CFG_MAX_SENSOR_ID_LEN)
        {
            ESP_LOGW(TAG, "Device config sensor with array index %d id length overstepped.", i);
            return ESP_ERR_INVALID_ARG;
        }

        strcpy(out_device_cfg->sensors[i].id, id->valuestring);
        out_device_cfg->sensors[i].publish_interval_ms = (uint32_t)cJSON_GetNumberValue(publish_interval_ms);

        if (strcmp(type->valuestring, "indoorLocation") == 0)
        {
            out_device_cfg->sensors[i].type = SENSOR_TYPE_INDOOR_LOCATION;

            cJSON *beacon_mac_addresses = cJSON_GetObjectItemCaseSensitive(sensor, "beaconMacAddresses");
            if (!cJSON_IsArray(beacon_mac_addresses))
            {
                ESP_LOGW(TAG, "Device config indoorLocation sensor with array index %d: beacon list not an array.", i);
                return ESP_ERR_INVALID_ARG;
            }

            int beacon_count = cJSON_GetArraySize(beacon_mac_addresses);
            if (beacon_count < 0 || beacon_count > DEVICE_CFG_MAX_BEACONS_PER_LOCATION_SENSOR)
            {
                ESP_LOGW(TAG, "Device config indoorLocation sensor with array index %d: beacon list not an array.", i);
                return ESP_ERR_INVALID_ARG;
            }

            out_device_cfg->sensors[i].config.indoor_location.beacon_mac_count = (uint8_t)beacon_count;

            for (int j = 0; j < beacon_count; j++)
            {
                cJSON *beacon_mac = cJSON_GetArrayItem(beacon_mac_addresses, j);
                if (!cJSON_IsString(beacon_mac))
                {
                    ESP_LOGW(TAG, "Device config indoorLocation sensor with array index %d: beacon mac not a string.", i);
                    return ESP_ERR_INVALID_ARG;
                }

                if (strlen(beacon_mac->valuestring) >= DEVICE_CFG_MAC_ADDRESS_STR_LEN)
                {
                    ESP_LOGW(TAG, "Device config indoorLocation sensor with array index %d: beacon mac out of bounds.", i);
                    return ESP_ERR_INVALID_ARG;
                }

                strcpy(
                    out_device_cfg->sensors[i].config.indoor_location.beacon_mac_addresses[j],
                    beacon_mac->valuestring);
            }
        }
        else if (strcmp(type->valuestring, "infrastructureStatus") == 0)
        {
            out_device_cfg->sensors[i].type = SENSOR_TYPE_INFRASTRUCTURE_STATUS;

            cJSON *gpio_pin = cJSON_GetObjectItemCaseSensitive(sensor, "gpioPin");
            if (!cJSON_IsNumber(gpio_pin))
            {
                ESP_LOGW(TAG, "Device config infrastructureStatus sensor with array index %d: gpio pin NAN.", i);
                return ESP_ERR_INVALID_ARG;
            }

            int parsed_gpio_pin = (int)cJSON_GetNumberValue(gpio_pin);
            if (parsed_gpio_pin < 1 || parsed_gpio_pin > 255)
            {
                ESP_LOGW(TAG, "Device config infrastructureStatus sensor with array index %d: gpio pin out of bounds.", i);
                return ESP_ERR_INVALID_ARG;
            }

            out_device_cfg->sensors[i].config.infrastructure_status.gpio_pin = (uint8_t)parsed_gpio_pin;
        }
        else if (strcmp(type->valuestring, "temperatureHumidity") == 0)
        {
            out_device_cfg->sensors[i].type = SENSOR_TYPE_TEMPERATURE_HUMIDITY;

            cJSON *i2c_sda_pin = cJSON_GetObjectItemCaseSensitive(sensor, "i2cSdaPin");
            cJSON *i2c_scl_pin = cJSON_GetObjectItemCaseSensitive(sensor, "i2cSclPin");

            if (!cJSON_IsNumber(i2c_sda_pin) || !cJSON_IsNumber(i2c_scl_pin))
            {
                ESP_LOGW(TAG, "Device config temperatureHumidity sensor with array index %d: i2c sda or scl pin NAN.", i);

                return ESP_ERR_INVALID_ARG;
            }

            int sda_pin = (int)cJSON_GetNumberValue(i2c_sda_pin);
            int scl_pin = (int)cJSON_GetNumberValue(i2c_scl_pin);

            if (sda_pin < 1 || sda_pin > 255 || scl_pin < 1 || scl_pin > 255)
            {
                ESP_LOGW(TAG, "Device config temperatureHumidity sensor with array index %d: i2c sda or scl pin number out of bounds.", i);
                return ESP_ERR_INVALID_ARG;
            }

            out_device_cfg->sensors[i].config.temperature_humidity.i2c_sda_pin = (uint8_t)sda_pin;
            out_device_cfg->sensors[i].config.temperature_humidity.i2c_scl_pin = (uint8_t)scl_pin;
        }
        else if (strcmp(type->valuestring, "lightIntensity") == 0)
        {
            out_device_cfg->sensors[i].type = SENSOR_TYPE_LIGHT_INTENSITY;

            cJSON *i2c_sda_pin = cJSON_GetObjectItemCaseSensitive(sensor, "i2cSdaPin");
            cJSON *i2c_scl_pin = cJSON_GetObjectItemCaseSensitive(sensor, "i2cSclPin");

            if (!cJSON_IsNumber(i2c_sda_pin) || !cJSON_IsNumber(i2c_scl_pin))
            {
                ESP_LOGW(TAG, "Device config lightIntensity sensor with array index %d: i2c sda or scl pin NAN.", i);
                return ESP_ERR_INVALID_ARG;
            }

            int sda_pin = (int)cJSON_GetNumberValue(i2c_sda_pin);
            int scl_pin = (int)cJSON_GetNumberValue(i2c_scl_pin);

            if (sda_pin < 1 || sda_pin > 255 || scl_pin < 1 || scl_pin > 255)
            {
                ESP_LOGW(TAG, "Device config lightIntensity sensor with array index %d: i2c sda or scl pin number out of bounds.", i);
                return ESP_ERR_INVALID_ARG;
            }

            out_device_cfg->sensors[i].config.light_intensity.i2c_sda_pin = (uint8_t)sda_pin;
            out_device_cfg->sensors[i].config.light_intensity.i2c_scl_pin = (uint8_t)scl_pin;
        }
        else if (strcmp(type->valuestring, "accelerometer") == 0)
        {
            out_device_cfg->sensors[i].type = SENSOR_TYPE_ACCEL;

            cJSON *i2c_sda_pin = cJSON_GetObjectItemCaseSensitive(sensor, "i2cSdaPin");
            cJSON *i2c_scl_pin = cJSON_GetObjectItemCaseSensitive(sensor, "i2cSclPin");
            cJSON *poll_interval_ms = cJSON_GetObjectItemCaseSensitive(sensor, "pollIntervalMs");
            cJSON *fall_threshold_g = cJSON_GetObjectItemCaseSensitive(sensor, "fallThresholdG");

            if (!cJSON_IsNumber(i2c_sda_pin) ||
                !cJSON_IsNumber(i2c_scl_pin) ||
                !cJSON_IsNumber(poll_interval_ms) ||
                !cJSON_IsNumber(fall_threshold_g))
            {
                ESP_LOGW(TAG, "Device config accelerometer sensor with array index %d: fields in wrong format.", i);
                return ESP_ERR_INVALID_ARG;
            }

            int sda_pin = (int)cJSON_GetNumberValue(i2c_sda_pin);
            int scl_pin = (int)cJSON_GetNumberValue(i2c_scl_pin);
            uint32_t poll_interval = (uint32_t)cJSON_GetNumberValue(poll_interval_ms);
            float threshold = (float)cJSON_GetNumberValue(fall_threshold_g);

            if (sda_pin < 1 || sda_pin > 255 ||
                scl_pin < 1 || scl_pin > 255 ||
                poll_interval < 1 ||
                threshold < 0.0f)
            {
                ESP_LOGW(TAG, "Device config accelerometer sensor with array index %d: values out of bounds.", i);
                return ESP_ERR_INVALID_ARG;
            }

            out_device_cfg->sensors[i].config.accel.i2c_sda_pin = (uint8_t)sda_pin;
            out_device_cfg->sensors[i].config.accel.i2c_scl_pin = (uint8_t)scl_pin;
            out_device_cfg->sensors[i].config.accel.poll_interval_ms = poll_interval;
            out_device_cfg->sensors[i].config.accel.fall_threshold_g = threshold;
        }
        else if (strcmp(type->valuestring, "noiseLevel") == 0)
        {
            out_device_cfg->sensors[i].type = SENSOR_TYPE_MIC;

            cJSON *i2s_bclk_pin = cJSON_GetObjectItemCaseSensitive(sensor, "i2sBclkPin");
            cJSON *i2s_lrck_pin = cJSON_GetObjectItemCaseSensitive(sensor, "i2sLrckPin");
            cJSON *i2s_din_pin = cJSON_GetObjectItemCaseSensitive(sensor, "i2sDinPin");
            cJSON *poll_interval_ms = cJSON_GetObjectItemCaseSensitive(sensor, "pollIntervalMs");
            cJSON *noise_threshold_db = cJSON_GetObjectItemCaseSensitive(sensor, "noiseThresholdDb");
            cJSON *db_offset = cJSON_GetObjectItemCaseSensitive(sensor, "dbOffset");

            if (!cJSON_IsNumber(i2s_bclk_pin) ||
                !cJSON_IsNumber(i2s_lrck_pin) ||
                !cJSON_IsNumber(i2s_din_pin) ||
                !cJSON_IsNumber(poll_interval_ms) ||
                !cJSON_IsNumber(noise_threshold_db) ||
                !cJSON_IsNumber(db_offset))
            {
                ESP_LOGW(TAG, "Device config noiseLevel sensor with array index %d: fields in wrong format.", i);
                return ESP_ERR_INVALID_ARG;
            }

            int bclk_pin = (int)cJSON_GetNumberValue(i2s_bclk_pin);
            int lrck_pin = (int)cJSON_GetNumberValue(i2s_lrck_pin);
            int din_pin = (int)cJSON_GetNumberValue(i2s_din_pin);
            uint32_t poll_interval = (uint32_t)cJSON_GetNumberValue(poll_interval_ms);

            if (bclk_pin < 1 || bclk_pin > 255 ||
                lrck_pin < 1 || lrck_pin > 255 ||
                din_pin < 1 || din_pin > 255 ||
                poll_interval < 1)
            {
                ESP_LOGW(TAG, "Device config noiseLevel sensor with array index %d: i2s pin number out of bounds.", i);
                return ESP_ERR_INVALID_ARG;
            }

            out_device_cfg->sensors[i].config.mic.i2s_bclk_pin = bclk_pin;
            out_device_cfg->sensors[i].config.mic.i2s_lrck_pin = lrck_pin;
            out_device_cfg->sensors[i].config.mic.i2s_din_pin = din_pin;
            out_device_cfg->sensors[i].config.mic.poll_interval_ms = poll_interval;
            out_device_cfg->sensors[i].config.mic.noise_threshold_db = (float)cJSON_GetNumberValue(noise_threshold_db);
            out_device_cfg->sensors[i].config.mic.db_offset = (float)cJSON_GetNumberValue(db_offset);
        }
        else if (strcmp(type->valuestring, "gnss") == 0)
        {
            out_device_cfg->sensors[i].type = SENSOR_TYPE_GNSS;

            cJSON *i2c_sda_pin = cJSON_GetObjectItemCaseSensitive(sensor, "i2cSdaPin");
            cJSON *i2c_scl_pin = cJSON_GetObjectItemCaseSensitive(sensor, "i2cSclPin");

            if (!cJSON_IsNumber(i2c_sda_pin) || !cJSON_IsNumber(i2c_scl_pin))
            {
                ESP_LOGW(TAG, "Device config gnss sensor with array index %d: i2c sda or scl pin NAN.", i);
                return ESP_ERR_INVALID_ARG;
            }

            int sda_pin = (int)cJSON_GetNumberValue(i2c_sda_pin);
            int scl_pin = (int)cJSON_GetNumberValue(i2c_scl_pin);

            if (sda_pin < 1 || sda_pin > 255 || scl_pin < 1 || scl_pin > 255)
            {
                ESP_LOGW(TAG, "Device config gnss sensor with array index %d: i2c sda or scl pin number out of bounds.", i);
                return ESP_ERR_INVALID_ARG;
            }

            out_device_cfg->sensors[i].config.gnss.i2c_sda_pin = (uint8_t)sda_pin;
            out_device_cfg->sensors[i].config.gnss.i2c_scl_pin = (uint8_t)scl_pin;
        }
        else
        {
            return ESP_ERR_INVALID_ARG;
        }
    }

    return ESP_OK;
}
