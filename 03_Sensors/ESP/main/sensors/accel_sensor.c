/**
 * @file accel_sensor.c
 * @brief Helper for reading movement data from an MMA8452Q accelerometer.
 */

#include "accel_sensor.h"

#include "esp_log.h"
#include "i2cdev.h"

#include <math.h>
#include <stdbool.h>

#define TAG "accel_sensor"

#define MMA8452Q_SENSOR_I2C_PORT I2C_NUM_0
#define MMA8452Q_SENSOR_I2C_ADDR 0x1D
#define MMA8452Q_SENSOR_I2C_FREQ_HZ 100000

#define MMA8452Q_REG_OUT_X_MSB 0x01
#define MMA8452Q_REG_WHO_AM_I 0x0D
#define MMA8452Q_REG_XYZ_DATA_CFG 0x0E
#define MMA8452Q_REG_CTRL_REG1 0x2A

#define MMA8452Q_WHO_AM_I_VALUE 0x2A
#define MMA8452Q_CTRL_REG1_ACTIVE 0x01
#define MMA8452Q_CTRL_REG1_ODR_100HZ 0x18

#define MMA8452Q_COUNTS_PER_G_2G 1024.0f

static bool sensor_ready = false;
static accel_sensor_config_t active_config = {0};
static i2c_dev_t sensor_dev = {0};

static esp_err_t mma8452q_write_reg(uint8_t reg, uint8_t value)
{
    return i2c_dev_write_reg(&sensor_dev, reg, &value, sizeof(value));
}

static esp_err_t mma8452q_read_reg(uint8_t reg, uint8_t *value)
{
    if (value == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    return i2c_dev_read_reg(&sensor_dev, reg, value, sizeof(*value));
}

static esp_err_t mma8452q_set_active(bool active)
{
    uint8_t ctrl_reg1 = 0;
    esp_err_t err = mma8452q_read_reg(MMA8452Q_REG_CTRL_REG1, &ctrl_reg1);
    if (err != ESP_OK)
    {
        return err;
    }

    if (active)
    {
        ctrl_reg1 |= MMA8452Q_CTRL_REG1_ACTIVE;
    }
    else
    {
        ctrl_reg1 &= (uint8_t)~MMA8452Q_CTRL_REG1_ACTIVE;
    }

    return mma8452q_write_reg(MMA8452Q_REG_CTRL_REG1, ctrl_reg1);
}

static int16_t mma8452q_decode_axis(uint8_t msb, uint8_t lsb)
{
    uint16_t combined = ((uint16_t)msb << 8) | lsb;
    int32_t raw = (int32_t)(combined >> 4);
    if ((raw & 0x0800) != 0)
    {
        raw -= 0x1000;
    }

    return (int16_t)raw;
}

static esp_err_t accel_sensor_init(const accel_sensor_config_t *config)
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
        sensor_dev = (i2c_dev_t){0};
        sensor_ready = false;
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

    sensor_dev = (i2c_dev_t){
        .port = MMA8452Q_SENSOR_I2C_PORT,
        .addr = MMA8452Q_SENSOR_I2C_ADDR,
        .cfg = {
            .sda_io_num = config->i2c_sda_pin,
            .scl_io_num = config->i2c_scl_pin,
            .sda_pullup_en = GPIO_PULLUP_ENABLE,
            .scl_pullup_en = GPIO_PULLUP_ENABLE,
            .master.clk_speed = MMA8452Q_SENSOR_I2C_FREQ_HZ,
        },
    };

    uint8_t who_am_i = 0;
    err = mma8452q_read_reg(MMA8452Q_REG_WHO_AM_I, &who_am_i);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "Failed to read WHO_AM_I for SDA=%d SCL=%d: %s",
                 config->i2c_sda_pin,
                 config->i2c_scl_pin,
                 esp_err_to_name(err));
        sensor_dev = (i2c_dev_t){0};
        return err;
    }

    if (who_am_i != MMA8452Q_WHO_AM_I_VALUE)
    {
        ESP_LOGE(TAG,
                 "Unexpected WHO_AM_I 0x%02X for MMA8452Q on SDA=%d SCL=%d",
                 who_am_i,
                 config->i2c_sda_pin,
                 config->i2c_scl_pin);
        sensor_dev = (i2c_dev_t){0};
        return ESP_ERR_NOT_FOUND;
    }

    err = mma8452q_set_active(false);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "Failed to enter standby mode for SDA=%d SCL=%d: %s",
                 config->i2c_sda_pin,
                 config->i2c_scl_pin,
                 esp_err_to_name(err));
        sensor_dev = (i2c_dev_t){0};
        return err;
    }

    uint8_t scale_2g = 0x00;
    err = mma8452q_write_reg(MMA8452Q_REG_XYZ_DATA_CFG, scale_2g);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "Failed to configure 2G scale for SDA=%d SCL=%d: %s",
                 config->i2c_sda_pin,
                 config->i2c_scl_pin,
                 esp_err_to_name(err));
        sensor_dev = (i2c_dev_t){0};
        return err;
    }

    err = mma8452q_write_reg(MMA8452Q_REG_CTRL_REG1, MMA8452Q_CTRL_REG1_ODR_100HZ);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "Failed to configure 100 Hz data rate for SDA=%d SCL=%d: %s",
                 config->i2c_sda_pin,
                 config->i2c_scl_pin,
                 esp_err_to_name(err));
        sensor_dev = (i2c_dev_t){0};
        return err;
    }

    err = mma8452q_set_active(true);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "Failed to enter active mode for SDA=%d SCL=%d: %s",
                 config->i2c_sda_pin,
                 config->i2c_scl_pin,
                 esp_err_to_name(err));
        sensor_dev = (i2c_dev_t){0};
        return err;
    }

    active_config = *config;
    sensor_ready = true;
    return ESP_OK;
}

esp_err_t accel_sensor_read(
    const accel_sensor_config_t *config,
    accel_sensor_reading_t *reading)
{
    if (config == NULL || reading == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    esp_err_t err = accel_sensor_init(config);
    if (err != ESP_OK)
    {
        return err;
    }

    uint8_t raw_data[6] = {0};
    err = i2c_dev_read_reg(&sensor_dev, MMA8452Q_REG_OUT_X_MSB, raw_data, sizeof(raw_data));
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "Failed to read acceleration registers for SDA=%d SCL=%d: %s",
                 config->i2c_sda_pin,
                 config->i2c_scl_pin,
                 esp_err_to_name(err));
        return err;
    }

    int16_t raw_x = mma8452q_decode_axis(raw_data[0], raw_data[1]);
    int16_t raw_y = mma8452q_decode_axis(raw_data[2], raw_data[3]);
    int16_t raw_z = mma8452q_decode_axis(raw_data[4], raw_data[5]);

    reading->x_g = (float)raw_x / MMA8452Q_COUNTS_PER_G_2G;
    reading->y_g = (float)raw_y / MMA8452Q_COUNTS_PER_G_2G;
    reading->z_g = (float)raw_z / MMA8452Q_COUNTS_PER_G_2G;
    reading->magnitude_g = sqrtf(
        (reading->x_g * reading->x_g) +
        (reading->y_g * reading->y_g) +
        (reading->z_g * reading->z_g));
    reading->move_g = fabsf(reading->magnitude_g - 1.0f);

    return ESP_OK;
}
