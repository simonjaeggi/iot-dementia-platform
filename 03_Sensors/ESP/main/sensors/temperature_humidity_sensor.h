#pragma once

#include "device_config.h"
#include "esp_err.h"

typedef struct
{
    float temperature_c;
    float humidity_pct;
} temperature_humidity_sensor_reading_t;

esp_err_t temperature_humidity_sensor_read(
    const temperature_humidity_config_t *config,
    temperature_humidity_sensor_reading_t *reading);
