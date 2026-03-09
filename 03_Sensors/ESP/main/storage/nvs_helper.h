#pragma once
#include "esp_err.h"
#include <stddef.h>
#include <stdint.h>

/**
 * @brief Initialize NVS flash storage if not already initialized.
 *
 * Erases NVS in case of full pages or version mismatch.
 *
 * @return ESP_OK on success; ESP_FAIL otherwise.
 * @retval ESP_OK   NVS ready for use
 * @retval ESP_FAIL NVS init or erase failed (details logged)
 */
esp_err_t nvs_init(void);
/**
 * @brief Store a string in NVS.
 *
 * @param key   NVS key
 * @param value String to store
 * @return ESP_OK on success; ESP_FAIL otherwise.
 * @retval ESP_OK   String written to NVS
 * @retval ESP_FAIL Store failed (details logged)
 */
esp_err_t nvs_set_string(const char *key, const char *value);
/**
 * @brief Retrieve a string value from NVS.
 *
 * @param key      NVS key
 * @param out      Buffer to receive the string
 * @param out_len  Size of output buffer
 * @return ESP_OK on success; ESP_FAIL otherwise.
 * @retval ESP_OK   String read from NVS
 * @retval ESP_FAIL Read failed (details logged)
 */
esp_err_t nvs_get_string(const char *key, char *out, size_t out_len);

/**
 * @brief Store an int value in NVS.
 *
 * @param key   NVS key
 * @param value Value to store
 * @return ESP_OK on success; ESP_FAIL otherwise.
 * @retval ESP_OK   Value written to NVS
 * @retval ESP_FAIL Store failed (details logged)
 */
esp_err_t nvs_set_int(const char *key, uint32_t value);
/**
 * @brief Retrieve an int value from NVS.
 *
 * @param key  NVS key
 * @param out  Output value
 * @return ESP_OK on success; ESP_FAIL otherwise.
 * @retval ESP_OK   Value read from NVS
 * @retval ESP_FAIL Read failed (details logged)
 */
esp_err_t nvs_get_int(const char *key, uint32_t *out);
