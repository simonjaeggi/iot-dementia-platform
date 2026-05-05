#pragma once

#include "config/device_config.h"
#include "esp_err.h"

#include <stdbool.h>
#include <stdint.h>

typedef struct
{
    uint8_t hour;
    uint8_t minute;
    uint8_t second;
    double latitude_deg;
    double longitude_deg;
    uint8_t satellites_used;
    double altitude_m;
} gnss_sensor_reading_t;

/**
 * @brief Read UTC time and position data from the GNSS module over I2C.
 *
 * The helper initializes the DFRobot TEL0157-compatible GNSS module on first
 * use, enables power, selects GPS + BeiDou + GLONASS mode, enables the RGB
 * indicator, and then reads UTC time, latitude, longitude, satellite count,
 * and altitude.
 *
 * @param config GNSS configuration.
 * @param reading Output reading structure.
 * @retval ESP_OK GNSS data was read successfully.
 * @retval ESP_ERR_INVALID_ARG config or reading is NULL.
 * @retval ESP_ERR_NOT_FOUND The module did not report the expected I2C ID.
 * @retval ESP_FAIL I2C initialization or communication failed.
 */
esp_err_t gnss_sensor_read(
    const gnss_sensor_config_t *config,
    gnss_sensor_reading_t *reading);
