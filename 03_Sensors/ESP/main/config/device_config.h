/**
 * @file device_config.h
 * @brief Device configuration types shared across the application.
 *
 * These types represent the validated device configuration stored in NVS and
 * exposed through the application context.
 */

#pragma once
#include <stdint.h>
#include "app_config.h"
typedef enum
{
    SENSOR_TYPE_INDOOR_LOCATION = 0,
    SENSOR_TYPE_TEMPERATURE_HUMIDITY = 1,
    SENSOR_TYPE_LIGHT_INTENSITY = 2,
    SENSOR_TYPE_ACCEL = 3,
    SENSOR_TYPE_MIC = 4,
    SENSOR_TYPE_GNSS = 5,
    SENSOR_TYPE_INFRASTRUCTURE_STATUS = 6,
} sensor_type_t;

typedef struct
{
    char beacon_mac_addresses[DEVICE_CFG_MAX_BEACONS_PER_LOCATION_SENSOR][18];
    uint8_t beacon_mac_count;
} indoor_location_config_t;

typedef struct
{
    uint8_t i2c_sda_pin;
    uint8_t i2c_scl_pin;
} temperature_humidity_config_t;

typedef struct
{
    uint8_t i2c_sda_pin;
    uint8_t i2c_scl_pin;
} light_intensity_config_t;

typedef struct
{
    uint8_t i2c_sda_pin;
    uint8_t i2c_scl_pin;
    uint32_t poll_interval_ms;
    float fall_threshold_g;
} accel_sensor_config_t;

typedef struct
{
    int i2s_bclk_pin;
    int i2s_lrck_pin;
    int i2s_din_pin;
    uint32_t poll_interval_ms;
    float noise_threshold_db;
    float db_offset;
} mic_sensor_config_t;

typedef struct
{
    uint8_t i2c_sda_pin;
    uint8_t i2c_scl_pin;
} gnss_sensor_config_t;

typedef struct
{
    uint8_t gpio_pin;
} infrastructure_status_config_t;

typedef struct
{
    char id[DEVICE_CFG_MAX_SENSOR_ID_LEN];
    sensor_type_t type;
    uint32_t publish_interval_ms;

    union
    {
        indoor_location_config_t indoor_location;
        temperature_humidity_config_t temperature_humidity;
        light_intensity_config_t light_intensity;
        accel_sensor_config_t accel;
        mic_sensor_config_t mic;
        gnss_sensor_config_t gnss;
        infrastructure_status_config_t infrastructure_status;
    } config;
} sensor_config_t;

typedef struct
{
    uint32_t version;
    sensor_config_t sensors[DEVICE_CFG_MAX_SENSORS];
    uint32_t sensor_count;
} device_config_t;
