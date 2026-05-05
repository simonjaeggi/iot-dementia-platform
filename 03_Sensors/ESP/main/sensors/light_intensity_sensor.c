#include "light_intensity_sensor.h"

#include "bh1750.h"
#include "esp_log.h"
#include "i2cdev.h"

#include <stdbool.h>

#define TAG "light_intensity_sensor"

#define LIGHT_INTENSITY_SENSOR_I2C_PORT I2C_NUM_0
#define LIGHT_INTENSITY_SENSOR_I2C_FREQ_HZ 100000

static bool sensor_ready = false;
static i2c_dev_t sensor_dev;
static light_intensity_config_t active_config = {0};

static void light_intensity_sensor_cleanup(void)
{
    bh1750_free_desc(&sensor_dev);
    sensor_dev = (i2c_dev_t){0};
    sensor_ready = false;
}

static esp_err_t light_intensity_sensor_init(const light_intensity_config_t *config)
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

    if (sensor_ready)
    {
        light_intensity_sensor_cleanup();
    }

    esp_err_t err = i2cdev_init();
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "i2cdev_init failed: %s", esp_err_to_name(err));
        return err;
    }

    err = bh1750_init_desc(
        &sensor_dev,
        BH1750_ADDR_LO,
        LIGHT_INTENSITY_SENSOR_I2C_PORT,
        config->i2c_sda_pin,
        config->i2c_scl_pin);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "bh1750_init_desc failed for SDA=%d SCL=%d: %s",
                 config->i2c_sda_pin,
                 config->i2c_scl_pin,
                 esp_err_to_name(err));
        light_intensity_sensor_cleanup();
        return err;
    }

    sensor_dev.cfg.sda_pullup_en = GPIO_PULLUP_ENABLE;
    sensor_dev.cfg.scl_pullup_en = GPIO_PULLUP_ENABLE;
    sensor_dev.cfg.master.clk_speed = LIGHT_INTENSITY_SENSOR_I2C_FREQ_HZ;

    err = bh1750_setup(&sensor_dev, BH1750_MODE_CONTINUOUS, BH1750_RES_HIGH);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "bh1750_setup failed for SDA=%d SCL=%d: %s",
                 config->i2c_sda_pin,
                 config->i2c_scl_pin,
                 esp_err_to_name(err));
        light_intensity_sensor_cleanup();
        return err;
    }

    active_config = *config;
    sensor_ready = true;
    return ESP_OK;
}

esp_err_t light_intensity_sensor_read(
    const light_intensity_config_t *config,
    light_intensity_sensor_reading_t *reading)
{
    if (config == NULL || reading == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    esp_err_t err = light_intensity_sensor_init(config);
    if (err != ESP_OK)
    {
        return err;
    }

    uint16_t lux_raw = 0;
    err = bh1750_read(&sensor_dev, &lux_raw);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "Light intensity read failed for SDA=%d SCL=%d: %s",
                 config->i2c_sda_pin,
                 config->i2c_scl_pin,
                 esp_err_to_name(err));
        return err;
    }

    reading->lux = lux_raw;

    return ESP_OK;
}
