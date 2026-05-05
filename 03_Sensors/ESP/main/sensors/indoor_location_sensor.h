#pragma once

#include "device_config.h"
#include "esp_err.h"

#include <stdbool.h>
#include <stddef.h>

#define INDOOR_LOCATION_SENSOR_MAX_MATCHES 3

typedef struct
{
    char id[18];
    int signal_strength_dbm;
} indoor_location_sensor_match_t;

typedef struct
{
    size_t match_count;
    indoor_location_sensor_match_t matches[INDOOR_LOCATION_SENSOR_MAX_MATCHES];
    bool saw_ibeacon;
} indoor_location_sensor_reading_t;

esp_err_t indoor_location_sensor_read(
    const indoor_location_config_t *config,
    indoor_location_sensor_reading_t *reading);
