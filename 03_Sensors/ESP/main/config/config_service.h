#pragma once
#include "esp_err.h"
#include <stddef.h>
#include "cJSON.h"
#include "device_config.h"

/**
 * @brief Load configuration values from NVS into the application context.
 *
 * Loads backend host, Wi-Fi SSID/password, ensures device name exists,
 * and updates boot id if not updated yet.
 *
 * @retval ESP_OK Required provisioning values were loaded successfully.
 * @retval ESP_FAIL Required provisioning values are missing or unreadable.
 */
esp_err_t config_set_context(void);

/**
 * @brief Parse a device configuration JSON string and store it in the
 * application context and NVS.
 *
 * @param json Device configuration JSON string.
 * @retval ESP_OK Configuration parsed successfully and stored.
 * @retval ESP_ERR_INVALID_ARG The input JSON string is invalid.
 * @retval ESP_ERR_INVALID_RESPONSE The JSON could not be parsed or validated.
 * @retval ESP_FAIL Memory allocation or storage failed.
 */
esp_err_t config_write_device_config(const char *json);

/**
 * @brief Parses a cJSON object into device_config_t.
 *
 * @param parsed_json Parsed cJSON root object.
 * @param out_device_cfg Output device configuration structure.
 * @retval ESP_OK The configuration was parsed successfully.
 * @retval ESP_ERR_INVALID_ARG The input object is invalid or required fields are
 *     missing or malformed.
 */
esp_err_t config_parse_device_config(cJSON *parsed_json, device_config_t *out_device_cfg);
