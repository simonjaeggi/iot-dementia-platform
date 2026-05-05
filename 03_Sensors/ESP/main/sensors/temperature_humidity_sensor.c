/**
 * @file temperature_humidity_sensor.c
 * @brief Reads temperature and humidity from the onboard sensor.
 */

#include "temperature_humidity_sensor.h"

#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "i2cdev.h"
#include "si7021.h"

#include <stdbool.h>

#define TAG "temperature_humidity_sensor"

#define TEMPERATURE_HUMIDITY_SENSOR_I2C_PORT I2C_NUM_0
#define TEMPERATURE_HUMIDITY_SENSOR_I2C_FREQ_HZ 100000

static bool sensor_ready = false;
static bool startup_delay_done = false;
static i2c_dev_t sensor_dev;
static temperature_humidity_config_t active_config = {0};

static void temperature_humidity_sensor_cleanup(void)
{
    si7021_free_desc(&sensor_dev);
    sensor_dev = (i2c_dev_t){0};
    sensor_ready = false;
}

static esp_err_t temperature_humidity_sensor_init(const temperature_humidity_config_t *config)
{
    if (config == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    if (sensor_ready &&
        active_config.i2c_sda_pin == config->i2c_sda_pin &&
        active_config.i2c_scl_pin == config->i2c_scl_pin)
    {
        return ESP_OK;
    }

    esp_err_t err = i2cdev_init();
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "i2cdev_init failed for SDA=%d SCL=%d: %s",
                 config->i2c_sda_pin,
                 config->i2c_scl_pin,
                 esp_err_to_name(err));
        return err;
    }

    err = si7021_init_desc(
        &sensor_dev,
        TEMPERATURE_HUMIDITY_SENSOR_I2C_PORT,
        config->i2c_sda_pin,
        config->i2c_scl_pin);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "si7021_init_desc failed for SDA=%d SCL=%d: %s",
                 config->i2c_sda_pin,
                 config->i2c_scl_pin,
                 esp_err_to_name(err));
        temperature_humidity_sensor_cleanup();
        return err;
    }

    sensor_dev.cfg.sda_pullup_en = GPIO_PULLUP_ENABLE;
    sensor_dev.cfg.scl_pullup_en = GPIO_PULLUP_ENABLE;
    sensor_dev.cfg.master.clk_speed = TEMPERATURE_HUMIDITY_SENSOR_I2C_FREQ_HZ;

    err = si7021_reset(&sensor_dev);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "si7021_reset failed for SDA=%d SCL=%d: %s",
                 config->i2c_sda_pin,
                 config->i2c_scl_pin,
                 esp_err_to_name(err));
        temperature_humidity_sensor_cleanup();
        return err;
    }

    if (!startup_delay_done)
    {
        vTaskDelay(pdMS_TO_TICKS(1000));
        startup_delay_done = true;
    }

    vTaskDelay(pdMS_TO_TICKS(20));
    active_config = *config;
    sensor_ready = true;
    return ESP_OK;
}

esp_err_t temperature_humidity_sensor_read(
    const temperature_humidity_config_t *config,
    temperature_humidity_sensor_reading_t *reading)
{
    if (config == NULL || reading == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    esp_err_t err = temperature_humidity_sensor_init(config);
    if (err != ESP_OK)
    {
        return err;
    }

    err = si7021_measure_temperature(&sensor_dev, &reading->temperature_c);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "Temperature read failed for SDA=%d SCL=%d: %s",
                 config->i2c_sda_pin,
                 config->i2c_scl_pin,
                 esp_err_to_name(err));
        return err;
    }

    err = si7021_measure_humidity(&sensor_dev, &reading->humidity_pct);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "Humidity read failed for SDA=%d SCL=%d: %s",
                 config->i2c_sda_pin,
                 config->i2c_scl_pin,
                 esp_err_to_name(err));
        return err;
    }

    return ESP_OK;
}
