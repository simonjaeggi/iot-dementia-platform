#pragma once

#include "config/device_config.h"
#include "esp_err.h"

#include <stddef.h>
#include <stdint.h>

#define MIC_SENSOR_MAX_SAMPLES 512

typedef struct
{
    float level_dbfs;
    size_t sample_count;
} mic_sensor_reading_t;

/**
 * @brief Read a dBFS level estimate from an I2S microphone.
 *
 * @param config Microphone configuration.
 * @param reading Output reading structure.
 * @retval ESP_OK Microphone data was read successfully.
 * @retval ESP_ERR_INVALID_ARG config or reading is NULL or the pin assignment
 *     is invalid.
 * @retval ESP_ERR_INVALID_SIZE No sample data was returned.
 * @retval ESP_FAIL Microphone initialization failed.
 */
esp_err_t mic_sensor_read(
    const mic_sensor_config_t *config,
    mic_sensor_reading_t *reading);
