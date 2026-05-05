#pragma once

#include "device_config.h"
#include "esp_err.h"

typedef struct
{
    uint16_t lux;
} light_intensity_sensor_reading_t;

esp_err_t light_intensity_sensor_read(
    const light_intensity_config_t *config,
    light_intensity_sensor_reading_t *reading);
