/**
 * @file nvs_helper.c
 * @brief This file contains NVS helper functions for simple read/write functionality.
 *
 */

#include "nvs_flash.h"
#include "nvs.h"
#include "nvs_helper.h"
#include "app_config.h"

static bool nvs_ready = false;

/**
 * @brief Initialize NVS flash storage if not already initialized.
 *
 * Erases NVS in case of full pages or version mismatch.
 */

void nvs_init(void)
{
    if (nvs_ready)
        return;

    esp_err_t err = nvs_flash_init();
    if (err == ESP_ERR_NVS_NO_FREE_PAGES ||
        err == ESP_ERR_NVS_NEW_VERSION_FOUND)
    {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ESP_ERROR_CHECK(nvs_flash_init());
    }

    nvs_ready = true;
}

/**
 * @brief Store a string in NVS.
 *
 * @param key   NVS key
 * @param value String to store
 * @return ESP_OK on success, error code otherwise
 */
esp_err_t nvs_set_string(const char *key, const char *value)
{
    nvs_init();
    nvs_handle_t h;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &h);
    if (err != ESP_OK)
        return err;

    err = nvs_set_str(h, key, value);
    if (err == ESP_OK)
        err = nvs_commit(h);

    nvs_close(h);
    return err;
}

/**
 * @brief Retrieve a string value from NVS.
 *
 * @param key      NVS key
 * @param out      Buffer to receive the string
 * @param out_len  Size of output buffer
 * @return ESP_OK on success, error code otherwise
 */
esp_err_t nvs_get_string(const char *key, char *out, size_t out_len)
{
    nvs_init();
    nvs_handle_t h;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READONLY, &h);
    if (err != ESP_OK)
        return err;

    size_t len = out_len;
    err = nvs_get_str(h, key, out, &len);

    nvs_close(h);
    return err;
}
