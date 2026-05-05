/**
 * @file gnss_sensor.c
 * @brief Helper for reading DFRobot GNSS module data over I2C.
 */

#include "gnss_sensor.h"

#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "i2cdev.h"

#include <stdbool.h>

#define TAG "gnss_sensor"

#define GNSS_SENSOR_I2C_PORT I2C_NUM_0
#define GNSS_SENSOR_I2C_ADDR 0x20
#define GNSS_SENSOR_I2C_FREQ_HZ 100000

#define GNSS_REG_TIME 0x04
#define GNSS_REG_LAT 0x07
#define GNSS_REG_LON_DIR 0x0C
#define GNSS_REG_LON 0x0D
#define GNSS_REG_LAT_DIR 0x12
#define GNSS_REG_SATS_USED 0x13
#define GNSS_REG_ALT 0x14
#define GNSS_REG_ID 0x1E
#define GNSS_REG_GNSS_MODE 0x22
#define GNSS_REG_SLEEP_MODE 0x23
#define GNSS_REG_RGB_MODE 0x24

#define GNSS_MODE_GPS_BEIDOU_GLONASS 0x07
#define GNSS_RGB_OFF 0x00
#define GNSS_RGB_ON 0x05
#define GNSS_POWER_ENABLE 0x00

static bool sensor_ready = false;
static gnss_sensor_config_t active_config = {0};
static i2c_dev_t sensor_dev = {0};

static esp_err_t gnss_write_reg(uint8_t reg, uint8_t value)
{
    return i2c_dev_write_reg(&sensor_dev, reg, &value, sizeof(value));
}

static esp_err_t gnss_read_reg(uint8_t reg, uint8_t *data, size_t len)
{
    if (data == NULL || len == 0)
    {
        return ESP_ERR_INVALID_ARG;
    }

    return i2c_dev_read_reg(&sensor_dev, reg, data, len);
}

static esp_err_t gnss_sensor_init(const gnss_sensor_config_t *config)
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
        .port = GNSS_SENSOR_I2C_PORT,
        .addr = GNSS_SENSOR_I2C_ADDR,
        .cfg = {
            .sda_io_num = config->i2c_sda_pin,
            .scl_io_num = config->i2c_scl_pin,
            .sda_pullup_en = GPIO_PULLUP_ENABLE,
            .scl_pullup_en = GPIO_PULLUP_ENABLE,
            .master.clk_speed = GNSS_SENSOR_I2C_FREQ_HZ,
        },
    };

    uint8_t device_id = 0;
    err = gnss_read_reg(GNSS_REG_ID, &device_id, sizeof(device_id));
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "Failed to read GNSS device ID for SDA=%d SCL=%d: %s",
                 config->i2c_sda_pin,
                 config->i2c_scl_pin,
                 esp_err_to_name(err));
        sensor_dev = (i2c_dev_t){0};
        return err;
    }

    if (device_id != GNSS_SENSOR_I2C_ADDR)
    {
        ESP_LOGE(TAG,
                 "Unexpected GNSS device ID 0x%02X on SDA=%d SCL=%d",
                 device_id,
                 config->i2c_sda_pin,
                 config->i2c_scl_pin);
        sensor_dev = (i2c_dev_t){0};
        return ESP_ERR_NOT_FOUND;
    }

    err = gnss_write_reg(GNSS_REG_SLEEP_MODE, GNSS_POWER_ENABLE);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "Failed to enable GNSS power for SDA=%d SCL=%d: %s",
                 config->i2c_sda_pin,
                 config->i2c_scl_pin,
                 esp_err_to_name(err));
        sensor_dev = (i2c_dev_t){0};
        return err;
    }
    vTaskDelay(pdMS_TO_TICKS(50));

    err = gnss_write_reg(GNSS_REG_GNSS_MODE, GNSS_MODE_GPS_BEIDOU_GLONASS);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "Failed to set GNSS mode for SDA=%d SCL=%d: %s",
                 config->i2c_sda_pin,
                 config->i2c_scl_pin,
                 esp_err_to_name(err));
        sensor_dev = (i2c_dev_t){0};
        return err;
    }
    vTaskDelay(pdMS_TO_TICKS(50));

    err = gnss_write_reg(GNSS_REG_RGB_MODE, GNSS_RGB_ON);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "Failed to set GNSS RGB state for SDA=%d SCL=%d: %s",
                 config->i2c_sda_pin,
                 config->i2c_scl_pin,
                 esp_err_to_name(err));
        sensor_dev = (i2c_dev_t){0};
        return err;
    }
    vTaskDelay(pdMS_TO_TICKS(50));

    active_config = *config;
    sensor_ready = true;
    return ESP_OK;
}

static double gnss_decode_latitude(const uint8_t *data)
{
    uint8_t lat_dd = data[0];
    uint8_t lat_mm = data[1];
    uint32_t lat_mmmmm = ((uint32_t)data[2] << 16) |
                         ((uint32_t)data[3] << 8) |
                         (uint32_t)data[4];

    return (double)lat_dd +
           ((double)lat_mm / 60.0) +
           ((double)lat_mmmmm / 100000.0 / 60.0);
}

static double gnss_decode_longitude(const uint8_t *data)
{
    uint8_t lon_ddd = data[0];
    uint8_t lon_mm = data[1];
    uint32_t lon_mmmmm = ((uint32_t)data[2] << 16) |
                         ((uint32_t)data[3] << 8) |
                         (uint32_t)data[4];

    return (double)lon_ddd +
           ((double)lon_mm / 60.0) +
           ((double)lon_mmmmm / 100000.0 / 60.0);
}

static double gnss_decode_decimal_2(const uint8_t *data)
{
    return (double)(((uint16_t)(data[0] & 0x7F) << 8) | data[1]) +
           ((double)data[2] / 100.0);
}

esp_err_t gnss_sensor_read(
    const gnss_sensor_config_t *config,
    gnss_sensor_reading_t *reading)
{
    if (config == NULL || reading == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    esp_err_t err = gnss_sensor_init(config);
    if (err != ESP_OK)
    {
        return err;
    }

    uint8_t time_data[3] = {0};
    uint8_t lat_data[6] = {0};
    uint8_t lon_data[6] = {0};
    uint8_t lat_dir = 0;
    uint8_t lon_dir = 0;
    uint8_t sats_used = 0;
    uint8_t alt_data[3] = {0};

    err = gnss_read_reg(GNSS_REG_TIME, time_data, sizeof(time_data));
    if (err != ESP_OK)
    {
        return err;
    }

    err = gnss_read_reg(GNSS_REG_LAT, lat_data, sizeof(lat_data));
    if (err != ESP_OK)
    {
        return err;
    }

    err = gnss_read_reg(GNSS_REG_LON, lon_data, sizeof(lon_data));
    if (err != ESP_OK)
    {
        return err;
    }

    err = gnss_read_reg(GNSS_REG_LAT_DIR, &lat_dir, sizeof(lat_dir));
    if (err != ESP_OK)
    {
        return err;
    }

    err = gnss_read_reg(GNSS_REG_LON_DIR, &lon_dir, sizeof(lon_dir));
    if (err != ESP_OK)
    {
        return err;
    }

    err = gnss_read_reg(GNSS_REG_SATS_USED, &sats_used, sizeof(sats_used));
    if (err != ESP_OK)
    {
        return err;
    }

    err = gnss_read_reg(GNSS_REG_ALT, alt_data, sizeof(alt_data));
    if (err != ESP_OK)
    {
        return err;
    }

    reading->hour = time_data[0];
    reading->minute = time_data[1];
    reading->second = time_data[2];
    reading->latitude_deg = gnss_decode_latitude(lat_data);
    reading->longitude_deg = gnss_decode_longitude(lon_data);
    if (lat_dir == 'S')
    {
        reading->latitude_deg = -reading->latitude_deg;
    }
    if (lon_dir == 'W')
    {
        reading->longitude_deg = -reading->longitude_deg;
    }
    reading->satellites_used = sats_used;
    reading->altitude_m = gnss_decode_decimal_2(alt_data);

    return ESP_OK;
}
