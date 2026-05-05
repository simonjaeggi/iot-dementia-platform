#pragma once

#include "device_config.h"
#include "esp_err.h"

#include <stdbool.h>

typedef struct
{
    bool is_closed;
} infrastructure_status_sensor_reading_t;

/**
 * @brief Read the current state infrastructure status sensor (high/low).
 *
 * @param config Infrastructure status sensor configuration.
 * @param reading Output reading structure.
 * @retval ESP_OK Sensor state was read successfully.
 * @retval ESP_ERR_INVALID_ARG config or reading is NULL, or the GPIO is
 *     invalid.
 * @retval ESP_FAIL GPIO configuration failed.
 */
esp_err_t infrastructure_status_sensor_read(
    const infrastructure_status_config_t *config,
    infrastructure_status_sensor_reading_t *reading);
