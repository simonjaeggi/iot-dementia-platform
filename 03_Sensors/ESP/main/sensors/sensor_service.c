/**
 * @file sensor_service.c
 * @brief Sensor orchestration and event queuing.
 */

#include "sensor_service.h"

#include "app_config.h"
#include "app_context.h"
#include "accel_sensor.h"
#include "backend_service.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "event_payload_helper.h"
#include "gnss_sensor.h"
#include "indoor_location_sensor.h"
#include "light_intensity_sensor.h"
#include "infrastructure_status_sensor.h"
#include "mic_sensor.h"
#include "temperature_humidity_sensor.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include <stdbool.h>
#include <stdint.h>

#define TAG "sensor_service"
#define SENSOR_TASK_STACK_SIZE 8192
typedef struct
{
    const sensor_config_t *sensor_cfg;
    int64_t last_publish_ms;
    bool state_initialized;
    bool state_active;
} sensor_runtime_context_t;

static sensor_runtime_context_t sensor_runtime_contexts[DEVICE_CFG_MAX_SENSORS];

static bool sensor_publish_interval_elapsed(
    const sensor_runtime_context_t *context,
    int64_t uptime_ms)
{
    if (context == NULL || context->sensor_cfg == NULL)
    {
        return false;
    }

    return context->last_publish_ms <= 0 ||
           (uptime_ms - context->last_publish_ms) >= context->sensor_cfg->publish_interval_ms;
}

static void sensor_mark_published(
    sensor_runtime_context_t *context,
    int64_t uptime_ms)
{
    if (context != NULL)
    {
        context->last_publish_ms = uptime_ms;
    }
}

static uint32_t sensor_poll_interval_ms(const sensor_config_t *sensor_cfg)
{
    if (sensor_cfg == NULL)
    {
        return 1;
    }

    switch (sensor_cfg->type)
    {
    case SENSOR_TYPE_ACCEL:
        return sensor_cfg->config.accel.poll_interval_ms;
    case SENSOR_TYPE_MIC:
        return sensor_cfg->config.mic.poll_interval_ms;
    default:
        return sensor_cfg->publish_interval_ms;
    }
}

static esp_err_t queue_temperature_and_humidity_events(
    const sensor_config_t *sensor_cfg,
    uint32_t boot_id,
    int64_t uptime_ms)
{
    if (sensor_cfg == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    temperature_humidity_sensor_reading_t reading = {0};
    esp_err_t err = temperature_humidity_sensor_read(
        &sensor_cfg->config.temperature_humidity,
        &reading);
    if (err != ESP_OK)
    {
        return err;
    }

    char temperature_payload[MAX_EVENT_SIZE_BYTES];
    size_t temperature_len = 0;
    err = event_payload_build_temperature(
        temperature_payload,
        sizeof(temperature_payload),
        boot_id,
        uptime_ms,
        reading.temperature_c,
        &temperature_len);
    if (err != ESP_OK)
    {
        return err;
    }

    char humidity_payload[MAX_EVENT_SIZE_BYTES];
    size_t humidity_len = 0;
    err = event_payload_build_humidity(
        humidity_payload,
        sizeof(humidity_payload),
        boot_id,
        uptime_ms,
        reading.humidity_pct,
        &humidity_len);
    if (err != ESP_OK)
    {
        return err;
    }

    err = send_event(temperature_payload, (int)temperature_len);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to queue temperature event");
        return err;
    }

    err = send_event(humidity_payload, (int)humidity_len);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to queue humidity event");
        return err;
    }

    ESP_LOGI(TAG,
             "Queued temperature %.2f C and humidity %.2f %%",
             reading.temperature_c,
             reading.humidity_pct);
    return ESP_OK;
}

static esp_err_t queue_indoor_location_events(
    const sensor_config_t *sensor_cfg,
    uint32_t boot_id,
    int64_t uptime_ms)
{
    if (sensor_cfg == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    indoor_location_sensor_reading_t result = {0};
    esp_err_t err = indoor_location_sensor_read(
        &sensor_cfg->config.indoor_location,
        &result);
    if (err != ESP_OK)
    {
        return err;
    }

    if (result.match_count == 0)
    {
        return ESP_OK;
    }

    char payload[MAX_EVENT_SIZE_BYTES];
    size_t payload_len = 0;
    err = event_payload_build_indoor_location(
        payload,
        sizeof(payload),
        boot_id,
        uptime_ms,
        &result,
        &payload_len);
    if (err != ESP_OK)
    {
        return err;
    }

    err = send_event(payload, (int)payload_len);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to queue BLE beacon event");
        return err;
    }

    ESP_LOGI(TAG,
             "Queued BLE beacon event with %u beacon(s)%s",
             (unsigned int)result.match_count,
             result.saw_ibeacon ? " and iBeacon frame" : "");

    return ESP_OK;
}

static esp_err_t queue_light_intensity_events(
    const sensor_config_t *sensor_cfg,
    uint32_t boot_id,
    int64_t uptime_ms)
{
    if (sensor_cfg == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    light_intensity_sensor_reading_t reading = {0};
    esp_err_t err = light_intensity_sensor_read(
        &sensor_cfg->config.light_intensity,
        &reading);
    if (err != ESP_OK)
    {
        return err;
    }

    char payload[MAX_EVENT_SIZE_BYTES];
    size_t payload_len = 0;
    err = event_payload_build_light_intensity(
        payload,
        sizeof(payload),
        boot_id,
        uptime_ms,
        reading.lux,
        &payload_len);
    if (err != ESP_OK)
    {
        return err;
    }

    err = send_event(payload, (int)payload_len);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to queue light intensity event");
        return err;
    }

    ESP_LOGI(TAG, "Queued light intensity %u lux", (unsigned int)reading.lux);
    return ESP_OK;
}


static esp_err_t queue_infrastructure_status_events(
    sensor_runtime_context_t *context,
    uint32_t boot_id,
    int64_t uptime_ms)
{
    const sensor_config_t *sensor_cfg = context ? context->sensor_cfg : NULL;
    if (sensor_cfg == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    infrastructure_status_sensor_reading_t reading = {0};
    esp_err_t err = infrastructure_status_sensor_read(
        &sensor_cfg->config.infrastructure_status,
        &reading);
    if (err != ESP_OK)
    {
        return err;
    }

    bool is_closed = reading.is_closed;
    bool should_publish = !context->state_initialized ||
                          (is_closed != context->state_active);
    context->state_initialized = true;
    context->state_active = is_closed;
    if (!should_publish)
    {
        return ESP_OK;
    }

    char payload[MAX_EVENT_SIZE_BYTES];
    size_t payload_len = 0;
    err = event_payload_build_infrastructure(
        payload,
        sizeof(payload),
        boot_id,
        uptime_ms,
        is_closed,
        &payload_len);
    if (err != ESP_OK)
    {
        return err;
    }

    err = send_event(payload, (int)payload_len);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to queue infrastructure status event");
        return err;
    }

    sensor_mark_published(context, uptime_ms);
    ESP_LOGI(TAG,
             "Queued infrastructure event for %s: %s",
             sensor_cfg->id,
             is_closed ? "closed" : "open");
    return ESP_OK;
}

static esp_err_t queue_noise_level_events(
    sensor_runtime_context_t *context,
    uint32_t boot_id,
    int64_t uptime_ms)
{
    const sensor_config_t *sensor_cfg = context ? context->sensor_cfg : NULL;
    if (sensor_cfg == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    mic_sensor_reading_t reading = {0};
    esp_err_t err = mic_sensor_read(&sensor_cfg->config.mic, &reading);
    if (err != ESP_OK)
    {
        return err;
    }

    float approx_db = reading.level_dbfs + sensor_cfg->config.mic.db_offset;
    bool state_active = approx_db >= sensor_cfg->config.mic.noise_threshold_db;
    bool should_publish = state_active &&
                          (!context->state_active ||
                           sensor_publish_interval_elapsed(context, uptime_ms));
    context->state_initialized = true;
    context->state_active = state_active;
    if (!should_publish)
    {
        return ESP_OK;
    }

    char payload[MAX_EVENT_SIZE_BYTES];
    size_t payload_len = 0;
    err = event_payload_build_noise_level(
        payload,
        sizeof(payload),
        boot_id,
        uptime_ms,
        approx_db,
        reading.level_dbfs,
        &payload_len);
    if (err != ESP_OK)
    {
        return err;
    }

    err = send_event(payload, (int)payload_len);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to queue noise level event");
        return err;
    }

    sensor_mark_published(context, uptime_ms);
    ESP_LOGI(TAG,
             "Queued noise level %.2f dB (%.2f dBFS)",
             approx_db,
             reading.level_dbfs);
    return ESP_OK;
}

static esp_err_t queue_gnss_events(
    const sensor_config_t *sensor_cfg,
    uint32_t boot_id,
    int64_t uptime_ms)
{
    if (sensor_cfg == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    gnss_sensor_reading_t reading = {0};
    esp_err_t err = gnss_sensor_read(&sensor_cfg->config.gnss, &reading);
    if (err != ESP_OK)
    {
        return err;
    }

    if (reading.satellites_used == 0)
    {
        ESP_LOGW(TAG, "Skipping GNSS event because no satellites were reported.");
        return ESP_OK;
    }

    char payload[MAX_EVENT_SIZE_BYTES];
    size_t payload_len = 0;
    err = event_payload_build_outdoor_location(
        payload,
        sizeof(payload),
        boot_id,
        uptime_ms,
        reading.latitude_deg,
        reading.longitude_deg,
        reading.satellites_used,
        reading.altitude_m,
        &payload_len);
    if (err != ESP_OK)
    {
        return err;
    }

    err = send_event(payload, (int)payload_len);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to queue GNSS event");
        return err;
    }

    ESP_LOGI(TAG,
             "Queued GNSS location %.8f %.8f with %u satellites",
             reading.latitude_deg,
             reading.longitude_deg,
             (unsigned int)reading.satellites_used);
    return ESP_OK;
}

static esp_err_t process_accel_events(
    sensor_runtime_context_t *context,
    uint32_t boot_id,
    int64_t uptime_ms)
{
    const sensor_config_t *sensor_cfg = context ? context->sensor_cfg : NULL;
    if (sensor_cfg == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    accel_sensor_reading_t reading = {0};
    esp_err_t err = accel_sensor_read(&sensor_cfg->config.accel, &reading);
    if (err != ESP_OK)
    {
        return err;
    }

    bool state_active = reading.move_g >= sensor_cfg->config.accel.fall_threshold_g;
    bool should_publish = state_active &&
                          (!context->state_active ||
                           sensor_publish_interval_elapsed(context, uptime_ms));
    context->state_initialized = true;
    context->state_active = state_active;
    if (!should_publish)
    {
        return ESP_OK;
    }

    char payload[MAX_EVENT_SIZE_BYTES];
    size_t payload_len = 0;
    err = event_payload_build_acceleration(
        payload,
        sizeof(payload),
        boot_id,
        uptime_ms,
        reading.magnitude_g,
        &payload_len);
    if (err != ESP_OK)
    {
        return err;
    }

    err = send_event(payload, (int)payload_len);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to queue acceleration event");
        return err;
    }

    sensor_mark_published(context, uptime_ms);
    ESP_LOGI(TAG,
             "Queued acceleration event for %s: move=%.3f g threshold=%.3f g",
             sensor_cfg->id,
             reading.move_g,
             sensor_cfg->config.accel.fall_threshold_g);
    return ESP_OK;
}

static esp_err_t queue_sensor_events(sensor_runtime_context_t *context)
{
    const sensor_config_t *sensor_cfg = context ? context->sensor_cfg : NULL;
    if (sensor_cfg == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    uint32_t boot_id = app_context_boot_id();
    int64_t uptime_ms = esp_timer_get_time() / 1000;

    switch (sensor_cfg->type)
    {
    case SENSOR_TYPE_TEMPERATURE_HUMIDITY:
        return queue_temperature_and_humidity_events(sensor_cfg, boot_id, uptime_ms);
    case SENSOR_TYPE_INDOOR_LOCATION:
        return queue_indoor_location_events(sensor_cfg, boot_id, uptime_ms);
    case SENSOR_TYPE_LIGHT_INTENSITY:
        return queue_light_intensity_events(sensor_cfg, boot_id, uptime_ms);
    case SENSOR_TYPE_INFRASTRUCTURE_STATUS:
        return queue_infrastructure_status_events(context, boot_id, uptime_ms);
    case SENSOR_TYPE_MIC:
        return queue_noise_level_events(context, boot_id, uptime_ms);
    case SENSOR_TYPE_GNSS:
        return queue_gnss_events(sensor_cfg, boot_id, uptime_ms);
    case SENSOR_TYPE_ACCEL:
        return process_accel_events(context, boot_id, uptime_ms);
    default:
        return ESP_ERR_NOT_SUPPORTED;
    }
}

static void sensor_event_task(void *arg)
{
    sensor_runtime_context_t *context = (sensor_runtime_context_t *)arg;
    const sensor_config_t *sensor_cfg = context ? context->sensor_cfg : NULL;

    if (sensor_cfg == NULL)
    {
        vTaskDelete(NULL);
        return;
    }

    while (true)
    {
        esp_err_t err = queue_sensor_events(context);
        if (err != ESP_OK)
        {
            ESP_LOGW(TAG, "Sensor %s read failed: %s", sensor_cfg->id, esp_err_to_name(err));
        }

        vTaskDelay(pdMS_TO_TICKS(sensor_poll_interval_ms(sensor_cfg)));
    }
}

esp_err_t spawn_sensor_event_task(void)
{
    const device_config_t *device_cfg = app_context_device_cfg();
    if (device_cfg == NULL)
    {
        ESP_LOGE(TAG, "Device config unavailable");
        return ESP_ERR_INVALID_STATE;
    }

    for (uint32_t i = 0; i < device_cfg->sensor_count; i++)
    {
        sensor_runtime_contexts[i] = (sensor_runtime_context_t){
            .sensor_cfg = &device_cfg->sensors[i],
            .last_publish_ms = -1,
            .state_initialized = false,
            .state_active = false,
        };
        BaseType_t result = xTaskCreate(
            sensor_event_task,
            device_cfg->sensors[i].id,
            SENSOR_TASK_STACK_SIZE,
            &sensor_runtime_contexts[i],
            5,
            NULL);

        if (result != pdPASS)
        {
            ESP_LOGE(TAG, "Failed to spawn sensor task for %s", device_cfg->sensors[i].id);
            return ESP_FAIL;
        }
    }

    return ESP_OK;
}
