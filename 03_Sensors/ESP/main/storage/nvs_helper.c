#include "nvs_flash.h"
#include "nvs.h"
#include "nvs_helper.h"
#include "esp_log.h"

#define PART_RT  "nvs"
#define PART_CFG "nvs_cfg"
#define NS_RT    "rt"
#define NS_CFG   "cfg"

static bool nvs_ready = false;
static const char *TAG = "nvs_helper";

static uint32_t float_to_u32(float v) { union { float f; uint32_t u; } b = { .f = v }; return b.u; }
static float    u32_to_float(uint32_t v) { union { float f; uint32_t u; } b = { .u = v }; return b.f; }

static void log_part_stats(const char *part)
{
    nvs_stats_t s;
    if (nvs_get_stats(part, &s) == ESP_OK) {
        ESP_LOGI(TAG, "stats[%s] used=%u free=%u total=%u namespaces=%u",
                 part, (unsigned)s.used_entries, (unsigned)s.free_entries,
                 (unsigned)s.total_entries, (unsigned)s.namespace_count);
    }
}

void nvs_log_stats(void)
{
    log_part_stats(PART_RT);
    log_part_stats(PART_CFG);
}

static esp_err_t init_part(const char *part)
{
    esp_err_t err = nvs_flash_init_partition(part);
    if (err == ESP_ERR_NVS_NO_FREE_PAGES || err == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_LOGE(TAG, "Partition '%s' unreadable (%s); erasing — data will be lost!",
                 part, esp_err_to_name(err));
        if (nvs_flash_erase_partition(part) != ESP_OK) return ESP_FAIL;
        err = nvs_flash_init_partition(part);
    }
    if (err != ESP_OK)
        ESP_LOGE(TAG, "nvs_flash_init_partition('%s') failed: %s", part, esp_err_to_name(err));
    return err;
}

esp_err_t nvs_init(void)
{
    if (nvs_ready) return ESP_OK;
    if (init_part(PART_RT)  != ESP_OK) return ESP_FAIL;
    if (init_part(PART_CFG) != ESP_OK) return ESP_FAIL;
    nvs_ready = true;
    nvs_log_stats();
    return ESP_OK;
}

esp_err_t nvs_set_string(const char *key, const char *value)
{
    if (!key || !value || nvs_init() != ESP_OK) return ESP_FAIL;
    nvs_handle_t h;
    if (nvs_open_from_partition(PART_RT, NS_RT, NVS_READWRITE, &h) != ESP_OK) return ESP_FAIL;
    esp_err_t err = nvs_set_str(h, key, value);
    if (err == ESP_OK) err = nvs_commit(h);
    nvs_close(h);
    if (err != ESP_OK) ESP_LOGE(TAG, "set_str[%s/%s]: %s", PART_RT, key, esp_err_to_name(err));
    return err == ESP_OK ? ESP_OK : ESP_FAIL;
}

esp_err_t nvs_get_string(const char *key, char *out, size_t out_len)
{
    if (!key || !out || out_len == 0 || nvs_init() != ESP_OK) return ESP_FAIL;
    out[0] = 0;
    nvs_handle_t h;
    if (nvs_open_from_partition(PART_RT, NS_RT, NVS_READONLY, &h) != ESP_OK) return ESP_FAIL;
    size_t len = out_len;
    esp_err_t err = nvs_get_str(h, key, out, &len);
    nvs_close(h);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "get_str[%s/%s]: %s", PART_RT, key, esp_err_to_name(err));
        if (err == ESP_ERR_NVS_NOT_FOUND) log_part_stats(PART_RT);
        out[0] = 0;
        return ESP_FAIL;
    }
    return ESP_OK;
}

esp_err_t nvs_set_int(const char *key, uint32_t value)
{
    if (!key || nvs_init() != ESP_OK) return ESP_FAIL;
    nvs_handle_t h;
    if (nvs_open_from_partition(PART_RT, NS_RT, NVS_READWRITE, &h) != ESP_OK) return ESP_FAIL;
    esp_err_t err = nvs_set_u32(h, key, value);
    if (err == ESP_OK) err = nvs_commit(h);
    nvs_close(h);
    if (err != ESP_OK) ESP_LOGE(TAG, "set_u32[%s/%s]: %s", PART_RT, key, esp_err_to_name(err));
    return err == ESP_OK ? ESP_OK : ESP_FAIL;
}

esp_err_t nvs_get_int(const char *key, uint32_t *out)
{
    if (!key || !out || nvs_init() != ESP_OK) return ESP_FAIL;
    *out = 0;
    nvs_handle_t h;
    if (nvs_open_from_partition(PART_RT, NS_RT, NVS_READONLY, &h) != ESP_OK) return ESP_FAIL;
    esp_err_t err = nvs_get_u32(h, key, out);
    nvs_close(h);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "get_u32[%s/%s]: %s", PART_RT, key, esp_err_to_name(err));
        if (err == ESP_ERR_NVS_NOT_FOUND) log_part_stats(PART_RT);
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
    if (!out) return ESP_FAIL;
    uint32_t raw = 0;
    esp_err_t err = nvs_get_int(key, &raw);
    if (err != ESP_OK) { *out = 0.0f; return err; }
    *out = u32_to_float(raw);
    return ESP_OK;
}

esp_err_t nvs_cfg_set_string(const char *key, const char *value)
{
    if (!key || !value || nvs_init() != ESP_OK) return ESP_FAIL;
    nvs_handle_t h;
    if (nvs_open_from_partition(PART_CFG, NS_CFG, NVS_READWRITE, &h) != ESP_OK) return ESP_FAIL;
    esp_err_t err = nvs_set_str(h, key, value);
    if (err == ESP_OK) err = nvs_commit(h);
    nvs_close(h);
    if (err != ESP_OK) ESP_LOGE(TAG, "set_str[%s/%s]: %s", PART_CFG, key, esp_err_to_name(err));
    return err == ESP_OK ? ESP_OK : ESP_FAIL;
}

esp_err_t nvs_cfg_get_string(const char *key, char *out, size_t out_len)
{
    if (!key || !out || out_len == 0 || nvs_init() != ESP_OK) return ESP_FAIL;
    out[0] = 0;
    nvs_handle_t h;
    if (nvs_open_from_partition(PART_CFG, NS_CFG, NVS_READONLY, &h) != ESP_OK) return ESP_FAIL;
    size_t len = out_len;
    esp_err_t err = nvs_get_str(h, key, out, &len);
    nvs_close(h);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "get_str[%s/%s]: %s", PART_CFG, key, esp_err_to_name(err));
        if (err == ESP_ERR_NVS_NOT_FOUND) log_part_stats(PART_CFG);
        out[0] = 0;
        return ESP_FAIL;
    }
    return ESP_OK;
}

esp_err_t nvs_cfg_set_int(const char *key, uint32_t value)
{
    if (!key || nvs_init() != ESP_OK) return ESP_FAIL;
    nvs_handle_t h;
    if (nvs_open_from_partition(PART_CFG, NS_CFG, NVS_READWRITE, &h) != ESP_OK) return ESP_FAIL;
    esp_err_t err = nvs_set_u32(h, key, value);
    if (err == ESP_OK) err = nvs_commit(h);
    nvs_close(h);
    if (err != ESP_OK) ESP_LOGE(TAG, "set_u32[%s/%s]: %s", PART_CFG, key, esp_err_to_name(err));
    return err == ESP_OK ? ESP_OK : ESP_FAIL;
}

esp_err_t nvs_cfg_get_int(const char *key, uint32_t *out)
{
    if (!key || !out || nvs_init() != ESP_OK) return ESP_FAIL;
    *out = 0;
    nvs_handle_t h;
    if (nvs_open_from_partition(PART_CFG, NS_CFG, NVS_READONLY, &h) != ESP_OK) return ESP_FAIL;
    esp_err_t err = nvs_get_u32(h, key, out);
    nvs_close(h);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "get_u32[%s/%s]: %s", PART_CFG, key, esp_err_to_name(err));
        if (err == ESP_ERR_NVS_NOT_FOUND) log_part_stats(PART_CFG);
        *out = 0;
        return ESP_FAIL;
    }
    return ESP_OK;
}

esp_err_t nvs_cfg_set_float(const char *key, float value)
{
    return nvs_cfg_set_int(key, float_to_u32(value));
}

esp_err_t nvs_cfg_get_float(const char *key, float *out)
{
    if (!out) return ESP_FAIL;
    uint32_t raw = 0;
    esp_err_t err = nvs_cfg_get_int(key, &raw);
    if (err != ESP_OK) { *out = 0.0f; return err; }
    *out = u32_to_float(raw);
    return ESP_OK;
}

bool nvs_cfg_key_exists(const char *key)
{
    if (!key || nvs_init() != ESP_OK) return false;
    nvs_handle_t h;
    if (nvs_open_from_partition(PART_CFG, NS_CFG, NVS_READONLY, &h) != ESP_OK) return false;
    size_t required = 0;
    esp_err_t err = nvs_get_str(h, key, NULL, &required);
    nvs_close(h);
    return err == ESP_OK && required > 1;
}
