/**
 * @file nvs_helper.c
 * @brief Lightweight wrappers around the ESP-IDF NVS API.
 */

#include "nvs_flash.h"
#include "nvs.h"
#include "nvs_helper.h"
#include "esp_log.h"
#define NVS_NAMESPACE "storage"

static bool nvs_ready = false;
static const char *TAG = "nvs_helper";

static uint32_t float_to_u32(float value)
{
    union
    {
        float f;
        uint32_t u;
    } bits = {.f = value};

    return bits.u;
}

static float u32_to_float(uint32_t value)
{
    union
    {
        float f;
        uint32_t u;
    } bits = {.u = value};

    return bits.f;
}

esp_err_t nvs_init(void)
{
    if (nvs_ready)
        return ESP_OK;

    esp_err_t err = nvs_flash_init();
    if (err == ESP_ERR_NVS_NO_FREE_PAGES ||
        err == ESP_ERR_NVS_NEW_VERSION_FOUND)
    {
        esp_err_t erase_err = nvs_flash_erase();
        if (erase_err != ESP_OK)
        {
            ESP_LOGE(TAG, "nvs_flash_erase failed: %s", esp_err_to_name(erase_err));
            return ESP_FAIL;
        }
        err = nvs_flash_init();
    }

    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "nvs_flash_init failed: %s", esp_err_to_name(err));
        return ESP_FAIL;
    }

    nvs_ready = true;
    return ESP_OK;
}

esp_err_t nvs_set_string(const char *key, const char *value)
{
    if (!key || !value)
    {
        ESP_LOGE(TAG, "nvs_set_string invalid args");
        return ESP_FAIL;
    }
    esp_err_t init_err = nvs_init();
    if (init_err != ESP_OK)
        return ESP_FAIL;
    nvs_handle_t h;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &h);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "nvs_open failed: %s", esp_err_to_name(err));
        return ESP_FAIL;
    }

    err = nvs_set_str(h, key, value);
    if (err == ESP_OK)
        err = nvs_commit(h);
    if (err != ESP_OK)
        ESP_LOGE(TAG, "nvs_set/commit failed: %s", esp_err_to_name(err));

    nvs_close(h);
    return (err == ESP_OK) ? ESP_OK : ESP_FAIL;
}

esp_err_t nvs_get_string(const char *key, char *out, size_t out_len)
{
    if (!key || !out || out_len == 0)
    {
        ESP_LOGE(TAG, "nvs_get_string invalid args");
        return ESP_FAIL;
    }
    out[0] = 0;
    esp_err_t init_err = nvs_init();
    if (init_err != ESP_OK)
        return ESP_FAIL;
    nvs_handle_t h;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READONLY, &h);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "nvs_open failed: %s", esp_err_to_name(err));
        return ESP_FAIL;
    }

    size_t len = out_len;
    err = nvs_get_str(h, key, out, &len);

    nvs_close(h);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "nvs_get_str failed for key %s: %s", key, esp_err_to_name(err));
        out[0] = 0;
        return ESP_FAIL;
    }
    return ESP_OK;
}

esp_err_t nvs_set_int(const char *key, uint32_t value)
{
    if (!key)
    {
        ESP_LOGE(TAG, "nvs_set_int invalid args");
        return ESP_FAIL;
    }
    esp_err_t init_err = nvs_init();
    if (init_err != ESP_OK)
        return ESP_FAIL;
    nvs_handle_t h;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &h);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "nvs_open failed: %s", esp_err_to_name(err));
        return ESP_FAIL;
    }

    err = nvs_set_u32(h, key, value);
    if (err == ESP_OK)
        err = nvs_commit(h);
    if (err != ESP_OK)
        ESP_LOGE(TAG, "nvs_set_int/commit failed: %s", esp_err_to_name(err));

    nvs_close(h);
    return (err == ESP_OK) ? ESP_OK : ESP_FAIL;
}

esp_err_t nvs_get_int(const char *key, uint32_t *out)
{
    if (!key || !out)
    {
        ESP_LOGE(TAG, "nvs_get_int invalid args");
        return ESP_FAIL;
    }
    *out = 0;
    esp_err_t init_err = nvs_init();
    if (init_err != ESP_OK)
        return ESP_FAIL;
    nvs_handle_t h;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READONLY, &h);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "nvs_open failed: %s", esp_err_to_name(err));
        return ESP_FAIL;
    }

    err = nvs_get_u32(h, key, out);
    nvs_close(h);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "nvs_get_int failed for key %s: %s", key, esp_err_to_name(err));
        *out = 0;
        return ESP_FAIL;
    }
    return ESP_OK;
}

esp_err_t nvs_set_float(const char *key, float value)
{
    return nvs_set_int(key, float_to_u32(value));
}

esp_err_t nvs_get_float(const char *key, float *out)
{
    if (!out)
    {
        ESP_LOGE(TAG, "nvs_get_float invalid args");
        return ESP_FAIL;
    }

    uint32_t raw = 0;
    esp_err_t err = nvs_get_int(key, &raw);
    if (err != ESP_OK)
    {
        *out = 0.0f;
        return err;
    }

    *out = u32_to_float(raw);
    return ESP_OK;
}
