#pragma once
#include "esp_err.h"
#include <stddef.h>

/**
 * @brief Load configuration values from NVS into app context.
 *
 * Loads backend host, Wi-Fi SSID/password, ensures device name exists,
 * and updates boot id if not updated yet.
 *
 * @return ESP_OK on success; ESP_FAIL otherwise.
 * @retval ESP_OK   Context loaded from NVS
 * @retval ESP_FAIL Required values missing or read failed (details logged)
 */
esp_err_t config_service_set_context(void);

/**
 * @brief Retrieve device config JSON from NVS.
 *
 * @param out_json Output buffer for JSON config
 * @param out_len  Output buffer length
 * @return ESP_OK on success; specific error codes otherwise.
 * @retval ESP_OK               Device config found and written to buffer
 * @retval ESP_ERR_INVALID_ARG  Invalid arguments
 * @retval ESP_FAIL             Read failed (buffer set to empty string)
 */
esp_err_t config_service_read_device_config(char *out_json, size_t out_len);

/**
 * @brief Write device config JSON to NVS.
 *
 * @param json Input buffer containing device config
 * @return ESP_OK on success; specific error codes otherwise.
 * @retval ESP_OK               Config written to NVS successfully
 * @retval ESP_ERR_INVALID_ARG  Invalid arguments
 * @retval ESP_FAIL             Write failed
 */
esp_err_t config_service_write_device_config(const char *json);
