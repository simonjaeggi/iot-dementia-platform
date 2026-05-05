/**
 * @file infrastructure_status_sensor.c
 * @brief Helper for reading an active-low hall switch for infrastructure
 * status sensing.
 */

#include "infrastructure_status_sensor.h"

#include "driver/gpio.h"
#include "esp_rom_sys.h"

#include <stdbool.h>

#define INFRASTRUCTURE_STATUS_SENSOR_SAMPLE_COUNT 3
#define INFRASTRUCTURE_STATUS_SENSOR_SAMPLE_DELAY_US 1000

static bool sensor_ready = false;
static int active_gpio_pin = -1;

static esp_err_t infrastructure_status_sensor_init(
    const infrastructure_status_config_t *config)
{
    if (config == NULL || !GPIO_IS_VALID_GPIO(config->gpio_pin))
    {
        return ESP_ERR_INVALID_ARG;
    }

    if (sensor_ready && active_gpio_pin == config->gpio_pin)
    {
        return ESP_OK;
    }

    gpio_config_t gpio_cfg = {
        .pin_bit_mask = 1ULL << config->gpio_pin,
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_ENABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };

    esp_err_t err = gpio_config(&gpio_cfg);
    if (err != ESP_OK)
    {
        return err;
    }

    active_gpio_pin = config->gpio_pin;
    sensor_ready = true;
    return ESP_OK;
}

esp_err_t infrastructure_status_sensor_read(
    const infrastructure_status_config_t *config,
    infrastructure_status_sensor_reading_t *reading)
{
    if (reading == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    esp_err_t err = infrastructure_status_sensor_init(config);
    if (err != ESP_OK)
    {
        return err;
    }

    int low_count = 0;
    for (int i = 0; i < INFRASTRUCTURE_STATUS_SENSOR_SAMPLE_COUNT; i++)
    {
        if (gpio_get_level(config->gpio_pin) == 0)
        {
            low_count++;
        }

        if (i + 1 < INFRASTRUCTURE_STATUS_SENSOR_SAMPLE_COUNT)
        {
            esp_rom_delay_us(INFRASTRUCTURE_STATUS_SENSOR_SAMPLE_DELAY_US);
        }
    }

    reading->is_closed = low_count >= ((INFRASTRUCTURE_STATUS_SENSOR_SAMPLE_COUNT / 2) + 1);
    return ESP_OK;
}
