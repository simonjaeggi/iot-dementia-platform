#pragma once

#include "esp_err.h"
#include "sensors/indoor_location_sensor.h"

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/**
 * @brief Creates the JSON payload for a system boot event.
 *
 * @param out Output buffer for the JSON payload.
 * @param out_len Capacity of the output buffer in bytes.
 * @param boot_id Current boot ID for event context.
 * @param uptime_ms Uptime in milliseconds when the event occurred.
 * @param out_written Optional pointer that receives the number of bytes written,
 *     excluding the terminating null byte.
 * @retval ESP_OK Payload created successfully.
 * @retval ESP_ERR_INVALID_ARG If out is NULL or out_len is 0.
 * @retval ESP_ERR_INVALID_SIZE If the output buffer is too small or formatting fails.
 */
esp_err_t event_payload_build_system_boot(
    char *out,
    size_t out_len,
    uint32_t boot_id,
    int64_t uptime_ms,
    size_t *out_written);

/**
 * @brief Creates the JSON payload for a temperature event.
 *
 * @param out Output buffer for the JSON payload.
 * @param out_len Capacity of the output buffer in bytes.
 * @param boot_id Current boot ID for event context.
 * @param uptime_ms Uptime in milliseconds when the event occurred.
 * @param value_c Temperature value in degrees Celsius.
 * @param out_written Optional pointer that receives the number of bytes written,
 *     excluding the terminating null byte.
 * @retval ESP_OK Payload created successfully.
 * @retval ESP_ERR_INVALID_ARG If out is NULL or out_len is 0.
 * @retval ESP_ERR_INVALID_SIZE If the output buffer is too small or formatting fails.
 */
esp_err_t event_payload_build_temperature(
    char *out,
    size_t out_len,
    uint32_t boot_id,
    int64_t uptime_ms,
    float value_c,
    size_t *out_written);

/**
 * @brief Creates the JSON payload for a humidity event.
 *
 * @param out Output buffer for the JSON payload.
 * @param out_len Capacity of the output buffer in bytes.
 * @param boot_id Current boot ID for event context.
 * @param uptime_ms Uptime in milliseconds when the event occurred.
 * @param humidity_pct Relative humidity in percent.
 * @param out_written Optional pointer that receives the number of bytes written,
 *     excluding the terminating null byte.
 * @retval ESP_OK Payload created successfully.
 * @retval ESP_ERR_INVALID_ARG If out is NULL or out_len is 0.
 * @retval ESP_ERR_INVALID_SIZE If the output buffer is too small or formatting fails.
 */
esp_err_t event_payload_build_humidity(
    char *out,
    size_t out_len,
    uint32_t boot_id,
    int64_t uptime_ms,
    float humidity_pct,
    size_t *out_written);

/**
 * @brief Creates the JSON payload for a light intensity event.
 *
 * @param out Output buffer for the JSON payload.
 * @param out_len Capacity of the output buffer in bytes.
 * @param boot_id Current boot ID for event context.
 * @param uptime_ms Uptime in milliseconds when the event occurred.
 * @param lux Light intensity in lux.
 * @param out_written Optional pointer that receives the number of bytes written,
 *     excluding the terminating null byte.
 * @retval ESP_OK Payload created successfully.
 * @retval ESP_ERR_INVALID_ARG If out is NULL or out_len is 0.
 * @retval ESP_ERR_INVALID_SIZE If the output buffer is too small or formatting fails.
 */
esp_err_t event_payload_build_light_intensity(
    char *out,
    size_t out_len,
    uint32_t boot_id,
    int64_t uptime_ms,
    uint16_t lux,
    size_t *out_written);

/**
 * @brief Creates the JSON payload for an infrastructure status event.
 *
 * @param out Output buffer for the JSON payload.
 * @param out_len Capacity of the output buffer in bytes.
 * @param boot_id Current boot ID for event context.
 * @param uptime_ms Uptime in milliseconds when the event occurred.
 * @param is_closed Whether the monitored infrastructure is currently closed.
 * @param out_written Optional pointer that receives the number of bytes written,
 *     excluding the terminating null byte.
 * @retval ESP_OK Payload created successfully.
 * @retval ESP_ERR_INVALID_ARG If out is NULL or out_len is 0.
 * @retval ESP_ERR_INVALID_SIZE If the output buffer is too small or formatting fails.
 */
esp_err_t event_payload_build_infrastructure(
    char *out,
    size_t out_len,
    uint32_t boot_id,
    int64_t uptime_ms,
    bool is_closed,
    size_t *out_written);

/**
 * @brief Creates the JSON payload for an acceleration threshold event.
 *
 * @param out Output buffer for the JSON payload.
 * @param out_len Capacity of the output buffer in bytes.
 * @param boot_id Current boot ID for event context.
 * @param uptime_ms Uptime in milliseconds when the event occurred.
 * @param magnitude_g Absolute acceleration magnitude in g.
 * @param out_written Optional pointer that receives the number of bytes written,
 *     excluding the terminating null byte.
 * @retval ESP_OK Payload created successfully.
 * @retval ESP_ERR_INVALID_ARG If out is NULL or out_len is 0.
 * @retval ESP_ERR_INVALID_SIZE If the output buffer is too small or formatting fails.
 */
esp_err_t event_payload_build_acceleration(
    char *out,
    size_t out_len,
    uint32_t boot_id,
    int64_t uptime_ms,
    float magnitude_g,
    size_t *out_written);

/**
 * @brief Creates the JSON payload for a noise level event.
 *
 * @param out Output buffer for the JSON payload.
 * @param out_len Capacity of the output buffer in bytes.
 * @param boot_id Current boot ID for event context.
 * @param uptime_ms Uptime in milliseconds when the event occurred.
 * @param approx_db Approximate sound pressure estimate in dB.
 * @param dbfs Raw microphone reading in dBFS.
 * @param out_written Optional pointer that receives the number of bytes written,
 *     excluding the terminating null byte.
 * @retval ESP_OK Payload created successfully.
 * @retval ESP_ERR_INVALID_ARG If out is NULL or out_len is 0.
 * @retval ESP_ERR_INVALID_SIZE If the output buffer is too small or formatting fails.
 */
esp_err_t event_payload_build_noise_level(
    char *out,
    size_t out_len,
    uint32_t boot_id,
    int64_t uptime_ms,
    float approx_db,
    float dbfs,
    size_t *out_written);

/**
 * @brief Creates the JSON payload for an outdoor location event.
 *
 * @param out Output buffer for the JSON payload.
 * @param out_len Capacity of the output buffer in bytes.
 * @param boot_id Current boot ID for event context.
 * @param uptime_ms Uptime in milliseconds when the event occurred.
 * @param lat Latitude in decimal degrees.
 * @param lng Longitude in decimal degrees.
 * @param satellite_count Number of satellites used.
 * @param altitude_meters Altitude in meters.
 * @param out_written Optional pointer that receives the number of bytes written,
 *     excluding the terminating null byte.
 * @retval ESP_OK Payload created successfully.
 * @retval ESP_ERR_INVALID_ARG If out is NULL or out_len is 0.
 * @retval ESP_ERR_INVALID_SIZE If the output buffer is too small or formatting fails.
 */
esp_err_t event_payload_build_outdoor_location(
    char *out,
    size_t out_len,
    uint32_t boot_id,
    int64_t uptime_ms,
    double lat,
    double lng,
    uint8_t satellite_count,
    double altitude_meters,
    size_t *out_written);

/**
 * @brief Creates the JSON payload for an indoor location event.
 *
 * @param out Output buffer for the JSON payload.
 * @param out_len Capacity of the output buffer in bytes.
 * @param boot_id Current boot ID for event context.
 * @param uptime_ms Uptime in milliseconds when the event occurred.
 * @param result Indoor location reading used to populate the beacon data.
 * @param out_written Optional pointer that receives the number of bytes written,
 *     excluding the terminating null byte.
 * @retval ESP_OK Payload created successfully.
 * @retval ESP_ERR_INVALID_ARG If out is NULL, out_len is 0, or result is NULL.
 * @retval ESP_ERR_INVALID_SIZE If the output buffer is too small or formatting fails.
 */
esp_err_t event_payload_build_indoor_location(
    char *out,
    size_t out_len,
    uint32_t boot_id,
    int64_t uptime_ms,
    const indoor_location_sensor_reading_t *result,
    size_t *out_written);

/**
 * @brief Creates the JSON payload for a corrupt device configuration event.
 *
 * @param out Output buffer for the JSON payload.
 * @param out_len Capacity of the output buffer in bytes.
 * @param boot_id Current boot ID for event context.
 * @param uptime_ms Uptime in milliseconds when the event occurred.
 * @param fallback_version Fallback device configuration version reported in the event.
 * @param out_written Optional pointer that receives the number of bytes written,
 *     excluding the terminating null byte.
 * @retval ESP_OK Payload created successfully.
 * @retval ESP_ERR_INVALID_ARG If out is NULL or out_len is 0.
 * @retval ESP_ERR_INVALID_SIZE If the output buffer is too small or formatting fails.
 */
esp_err_t event_payload_build_corrupt_device_config(
    char *out,
    size_t out_len,
    uint32_t boot_id,
    int64_t uptime_ms,
    uint32_t fallback_version,
    size_t *out_written);
