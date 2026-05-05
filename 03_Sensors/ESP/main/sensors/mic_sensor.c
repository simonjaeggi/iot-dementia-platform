/**
 * @file mic_sensor.c
 * @brief Helper for reading dBFS level data from an I2S microphone.
 */

#include "mic_sensor.h"

#include "driver/i2s_std.h"
#include "esp_log.h"

#include <math.h>
#include <stdint.h>
#include <string.h>

#define TAG "mic_sensor"

#define MIC_SENSOR_SAMPLE_RATE_HZ 16000
#define MIC_SENSOR_SAMPLE_COUNT 256
#define MIC_SENSOR_DOWNSHIFT_BITS 14
#define MIC_SENSOR_TIMEOUT_MS 1000
#define MIC_SENSOR_MIN_DBFS -120.0f

static bool sensor_ready = false;
static mic_sensor_config_t active_config = {0};
static int32_t sample_buffer[MIC_SENSOR_MAX_SAMPLES];
static i2s_chan_handle_t rx_channel = NULL;

static bool mic_sensor_requires_reinit(const mic_sensor_config_t *config)
{
    return !sensor_ready ||
           active_config.i2s_bclk_pin != config->i2s_bclk_pin ||
           active_config.i2s_lrck_pin != config->i2s_lrck_pin ||
           active_config.i2s_din_pin != config->i2s_din_pin;
}

static esp_err_t mic_sensor_validate_config(const mic_sensor_config_t *config)
{
    if (config == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    if (config->i2s_bclk_pin < 0 ||
        config->i2s_lrck_pin < 0 ||
        config->i2s_din_pin < 0)
    {
        return ESP_ERR_INVALID_ARG;
    }

    return ESP_OK;
}

static esp_err_t mic_sensor_init(const mic_sensor_config_t *config)
{
    esp_err_t err = mic_sensor_validate_config(config);
    if (err != ESP_OK)
    {
        return err;
    }

    if (!mic_sensor_requires_reinit(config))
    {
        return ESP_OK;
    }

    if (sensor_ready)
    {
        err = i2s_channel_disable(rx_channel);
        if (err != ESP_OK && err != ESP_ERR_INVALID_STATE)
        {
            ESP_LOGE(TAG,
                     "i2s_channel_disable failed for BCLK=%d LRCK=%d DIN=%d: %s",
                     config->i2s_bclk_pin,
                     config->i2s_lrck_pin,
                     config->i2s_din_pin,
                     esp_err_to_name(err));
            return err;
        }

        err = i2s_del_channel(rx_channel);
        if (err != ESP_OK)
        {
            ESP_LOGE(TAG,
                     "i2s_del_channel failed for BCLK=%d LRCK=%d DIN=%d: %s",
                     config->i2s_bclk_pin,
                     config->i2s_lrck_pin,
                     config->i2s_din_pin,
                     esp_err_to_name(err));
            return err;
        }

        rx_channel = NULL;
        sensor_ready = false;
    }

    i2s_chan_config_t channel_config = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_AUTO, I2S_ROLE_MASTER);
    err = i2s_new_channel(&channel_config, NULL, &rx_channel);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "i2s_new_channel failed for BCLK=%d LRCK=%d DIN=%d: %s",
                 config->i2s_bclk_pin,
                 config->i2s_lrck_pin,
                 config->i2s_din_pin,
                 esp_err_to_name(err));
        return err;
    }

    i2s_std_config_t std_config = {
        .clk_cfg = I2S_STD_CLK_DEFAULT_CONFIG(MIC_SENSOR_SAMPLE_RATE_HZ),
        .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(
            I2S_DATA_BIT_WIDTH_32BIT,
            I2S_SLOT_MODE_MONO),
        .gpio_cfg = {
            .mclk = I2S_GPIO_UNUSED,
            .bclk = config->i2s_bclk_pin,
            .ws = config->i2s_lrck_pin,
            .dout = I2S_GPIO_UNUSED,
            .din = config->i2s_din_pin,
            .invert_flags = {
                .mclk_inv = false,
                .bclk_inv = false,
                .ws_inv = false,
            },
        },
    };
    std_config.slot_cfg.slot_mask = I2S_STD_SLOT_LEFT;

    err = i2s_channel_init_std_mode(rx_channel, &std_config);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "i2s_channel_init_std_mode failed for BCLK=%d LRCK=%d DIN=%d: %s",
                 config->i2s_bclk_pin,
                 config->i2s_lrck_pin,
                 config->i2s_din_pin,
                 esp_err_to_name(err));
        i2s_del_channel(rx_channel);
        rx_channel = NULL;
        return err;
    }

    err = i2s_channel_enable(rx_channel);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "i2s_channel_enable failed for BCLK=%d LRCK=%d DIN=%d: %s",
                 config->i2s_bclk_pin,
                 config->i2s_lrck_pin,
                 config->i2s_din_pin,
                 esp_err_to_name(err));
        i2s_del_channel(rx_channel);
        rx_channel = NULL;
        return err;
    }

    active_config = *config;
    sensor_ready = true;
    return ESP_OK;
}

esp_err_t mic_sensor_read(
    const mic_sensor_config_t *config,
    mic_sensor_reading_t *reading)
{
    if (reading == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    esp_err_t err = mic_sensor_init(config);
    if (err != ESP_OK)
    {
        return err;
    }

    memset(sample_buffer, 0, MIC_SENSOR_SAMPLE_COUNT * sizeof(sample_buffer[0]));

    size_t bytes_read = 0;
    err = i2s_channel_read(
        rx_channel,
        sample_buffer,
        MIC_SENSOR_SAMPLE_COUNT * sizeof(sample_buffer[0]),
        &bytes_read,
        MIC_SENSOR_TIMEOUT_MS);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG,
                 "i2s_channel_read failed for BCLK=%d LRCK=%d DIN=%d: %s",
                 config->i2s_bclk_pin,
                 config->i2s_lrck_pin,
                 config->i2s_din_pin,
                 esp_err_to_name(err));
        return err;
    }

    if (bytes_read == 0)
    {
        return ESP_ERR_INVALID_SIZE;
    }

    size_t count = bytes_read / sizeof(sample_buffer[0]);
    double sum = 0.0;
    for (size_t i = 0; i < count; i++)
    {
        int32_t sample = sample_buffer[i] >> MIC_SENSOR_DOWNSHIFT_BITS;
        sum += (double)sample;
    }

    double mean = sum / (double)count;
    double sum_sq = 0.0;
    for (size_t i = 0; i < count; i++)
    {
        double sample = (double)(sample_buffer[i] >> MIC_SENSOR_DOWNSHIFT_BITS) - mean;
        sum_sq += sample * sample;
    }

    reading->sample_count = count;
    double rms = sqrt(sum_sq / (double)count);
    double full_scale = (double)INT32_MAX / (double)(1U << MIC_SENSOR_DOWNSHIFT_BITS);
    if (rms <= 0.0 || full_scale <= 0.0)
    {
        reading->level_dbfs = MIC_SENSOR_MIN_DBFS;
        return ESP_OK;
    }

    double dbfs = 20.0 * log10(rms / full_scale);
    if (dbfs < MIC_SENSOR_MIN_DBFS)
    {
        dbfs = MIC_SENSOR_MIN_DBFS;
    }

    reading->level_dbfs = (float)dbfs;

    return ESP_OK;
}
