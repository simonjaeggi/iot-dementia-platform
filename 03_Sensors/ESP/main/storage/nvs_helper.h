#pragma once
#include "esp_err.h"
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/**
 * @brief Initialize both NVS partitions ("nvs" and "nvs_cfg").
 *
 * Erases an unreadable partition in case of full pages or version mismatch.
 *
 * @retval ESP_OK NVS is ready for use.
 * @retval ESP_FAIL NVS initialization or erase failed.
 */
esp_err_t nvs_init(void);

/**
 * @brief Log used, free, and total entries for both NVS partitions.
 */
void nvs_log_stats(void);

/**
 * @brief Store a string in NVS.
 *
 * @param key NVS key.
 * @param value String to store.
 * @retval ESP_OK String written to NVS successfully.
 * @retval ESP_FAIL String storage failed.
 */
esp_err_t nvs_set_string(const char *key, const char *value);

/**
 * @brief Retrieve a string value from the runtime NVS partition.
 *
 * @param key NVS key.
 * @param out Buffer to receive the string.
 * @param out_len Capacity of the output buffer in bytes.
 * @retval ESP_OK String read from NVS successfully.
 * @retval ESP_FAIL String read failed.
 */
esp_err_t nvs_get_string(const char *key, char *out, size_t out_len);

/**
 * @brief Store an int value in the runtime NVS partition.
 *
 * @param key NVS key.
 * @param value Value to store.
 * @retval ESP_OK Value written to NVS successfully.
 * @retval ESP_FAIL Value storage failed.
 */
esp_err_t nvs_set_int(const char *key, uint32_t value);

/**
 * @brief Retrieve an int value from the runtime NVS partition.
 *
 * @param key NVS key.
 * @param out Output value.
 * @retval ESP_OK Value read from NVS successfully.
 * @retval ESP_FAIL Value read failed.
 */
esp_err_t nvs_get_int(const char *key, uint32_t *out);

/**
 * @brief Store a float value in the runtime NVS partition.
 *
 * @param key NVS key.
 * @param value Value to store.
 * @retval ESP_OK Value written to NVS successfully.
 * @retval ESP_FAIL Value storage failed.
 */
esp_err_t nvs_set_float(const char *key, float value);

/**
 * @brief Retrieve a float value from the runtime NVS partition.
 *
 * @param key NVS key.
 * @param out Output value.
 * @retval ESP_OK Value read from NVS successfully.
 * @retval ESP_FAIL Value read failed.
 */
esp_err_t nvs_get_float(const char *key, float *out);

/**
 * @brief Store a string in the config NVS partition.
 *
 * @param key NVS key.
 * @param value String to store.
 * @retval ESP_OK String written to NVS successfully.
 * @retval ESP_FAIL String storage failed.
 */
esp_err_t nvs_cfg_set_string(const char *key, const char *value);

/**
 * @brief Retrieve a string value from the config NVS partition.
 *
 * @param key NVS key.
 * @param out Buffer to receive the string.
 * @param out_len Capacity of the output buffer in bytes.
 * @retval ESP_OK String read from NVS successfully.
 * @retval ESP_FAIL String read failed.
 */
esp_err_t nvs_cfg_get_string(const char *key, char *out, size_t out_len);

/**
 * @brief Store an int value in the config NVS partition.
 *
 * @param key NVS key.
 * @param value Value to store.
 * @retval ESP_OK Value written to NVS successfully.
 * @retval ESP_FAIL Value storage failed.
 */
esp_err_t nvs_cfg_set_int(const char *key, uint32_t value);

/**
 * @brief Retrieve an int value from the config NVS partition.
 *
 * @param key NVS key.
 * @param out Output value.
 * @retval ESP_OK Value read from NVS successfully.
 * @retval ESP_FAIL Value read failed.
 */
esp_err_t nvs_cfg_get_int(const char *key, uint32_t *out);

/**
 * @brief Store a float value in the config NVS partition.
 *
 * @param key NVS key.
 * @param value Value to store.
 * @retval ESP_OK Value written to NVS successfully.
 * @retval ESP_FAIL Value storage failed.
 */
esp_err_t nvs_cfg_set_float(const char *key, float value);

/**
 * @brief Retrieve a float value from the config NVS partition.
 *
 * @param key NVS key.
 * @param out Output value.
 * @retval ESP_OK Value read from NVS successfully.
 * @retval ESP_FAIL Value read failed.
 */
esp_err_t nvs_cfg_get_float(const char *key, float *out);

/**
 * @brief Check whether a non-empty string key exists in the config NVS partition.
 *
 * @param key NVS key.
 * @return true Key exists and stores a non-empty string value.
 * @return false Key is missing, empty, or NVS access failed.
 */
bool nvs_cfg_key_exists(const char *key);
