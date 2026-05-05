#pragma once

#include "config/device_config.h"
#include "esp_err.h"

#include <stdint.h>

typedef struct
{
    float x_g;
    float y_g;
    float z_g;
    float magnitude_g;
    float move_g;
} accel_sensor_reading_t;

/**
 * @brief Read accelerometer data from the configured accelerometer.
 * @param config Sensor configuration.
 * @param reading Output reading structure.
 * @retval ESP_OK Sensor data was read successfully.
 * @retval ESP_ERR_INVALID_ARG config or reading is NULL.
 * @retval ESP_FAIL Sensor initialization failed.
 * @retval ESP_ERR_NOT_FOUND The device did not report the expected WHO_AM_I
 *     value.
 */
esp_err_t accel_sensor_read(
    const accel_sensor_config_t *config,
    accel_sensor_reading_t *reading);
