#include "event_payload_helper.h"

#include "esp_err.h"

#include <inttypes.h>
#include <stddef.h>
#include <stdio.h>

static esp_err_t finish_payload_write(int written, size_t out_len, size_t *out_written)
{
    if (written < 0 || written >= (int)out_len)
    {
        return ESP_ERR_INVALID_SIZE;
    }

    if (out_written != NULL)
    {
        *out_written = (size_t)written;
    }

    return ESP_OK;
}

esp_err_t event_payload_build_system_boot(
    char *out,
    size_t out_len,
    uint32_t boot_id,
    int64_t uptime_ms,
    size_t *out_written)
{
    if (out == NULL || out_len == 0)
    {
        return ESP_ERR_INVALID_ARG;
    }

    int written = snprintf(
        out,
        out_len,
        "{\"data\":{\"type\":\"systemBoot\",\"source\":{\"bootId\":%" PRIu32 ",\"uptimeMs\":%" PRId64 "}}}",
        boot_id,
        uptime_ms);

    return finish_payload_write(written, out_len, out_written);
}

esp_err_t event_payload_build_temperature(
    char *out,
    size_t out_len,
    uint32_t boot_id,
    int64_t uptime_ms,
    float value_c,
    size_t *out_written)
{
    if (out == NULL || out_len == 0)
    {
        return ESP_ERR_INVALID_ARG;
    }

    int written = snprintf(
        out,
        out_len,
        "{\"data\":{\"type\":\"temperature\",\"source\":{\"bootId\":%" PRIu32 ",\"uptimeMs\":%" PRId64 "},\"data\":{\"value\":%.2f,\"unit\":\"C\"}}}",
        boot_id,
        uptime_ms,
        value_c);

    return finish_payload_write(written, out_len, out_written);
}

esp_err_t event_payload_build_humidity(
    char *out,
    size_t out_len,
    uint32_t boot_id,
    int64_t uptime_ms,
    float humidity_pct,
    size_t *out_written)
{
    if (out == NULL || out_len == 0)
    {
        return ESP_ERR_INVALID_ARG;
    }

    int written = snprintf(
        out,
        out_len,
        "{\"data\":{\"type\":\"humidity\",\"source\":{\"bootId\":%" PRIu32 ",\"uptimeMs\":%" PRId64 "},\"data\":{\"percentage\":%.2f}}}",
        boot_id,
        uptime_ms,
        humidity_pct);

    return finish_payload_write(written, out_len, out_written);
}

esp_err_t event_payload_build_light_intensity(
    char *out,
    size_t out_len,
    uint32_t boot_id,
    int64_t uptime_ms,
    uint16_t lux,
    size_t *out_written)
{
    if (out == NULL || out_len == 0)
    {
        return ESP_ERR_INVALID_ARG;
    }

    int written = snprintf(
        out,
        out_len,
        "{\"data\":{\"type\":\"lightIntensity\",\"source\":{\"bootId\":%" PRIu32 ",\"uptimeMs\":%" PRId64 "},\"data\":{\"lux\":%u}}}",
        boot_id,
        uptime_ms,
        (unsigned int)lux);

    return finish_payload_write(written, out_len, out_written);
}

esp_err_t event_payload_build_infrastructure(
    char *out,
    size_t out_len,
    uint32_t boot_id,
    int64_t uptime_ms,
    bool is_closed,
    size_t *out_written)
{
    if (out == NULL || out_len == 0)
    {
        return ESP_ERR_INVALID_ARG;
    }
    
    int written = snprintf(
        out,
        out_len,
        "{\"data\":{\"type\":\"infrastructure\",\"source\":{\"bootId\":%" PRIu32 ",\"uptimeMs\":%" PRId64 "},\"data\":{\"status\":\"%s\"}}}",
        boot_id,
        uptime_ms,
        is_closed ? "closed" : "open");

    return finish_payload_write(written, out_len, out_written);
}

esp_err_t event_payload_build_acceleration(
    char *out,
    size_t out_len,
    uint32_t boot_id,
    int64_t uptime_ms,
    float magnitude_g,
    size_t *out_written)
{
    if (out == NULL || out_len == 0)
    {
        return ESP_ERR_INVALID_ARG;
    }

    int written = snprintf(
        out,
        out_len,
        "{\"data\":{\"type\":\"acceleration\",\"source\":{\"bootId\":%" PRIu32 ",\"uptimeMs\":%" PRId64 "},\"data\":{\"magnitudeG\":%.3f}}}",
        boot_id,
        uptime_ms,
        magnitude_g);

    return finish_payload_write(written, out_len, out_written);
}

esp_err_t event_payload_build_noise_level(
    char *out,
    size_t out_len,
    uint32_t boot_id,
    int64_t uptime_ms,
    float approx_db,
    float dbfs,
    size_t *out_written)
{
    if (out == NULL || out_len == 0)
    {
        return ESP_ERR_INVALID_ARG;
    }

    int written = snprintf(
        out,
        out_len,
        "{\"data\":{\"type\":\"noiseLevel\",\"source\":{\"bootId\":%" PRIu32 ",\"uptimeMs\":%" PRId64 "},\"data\":{\"approx_db\":%.2f,\"dbfs\":%.2f}}}",
        boot_id,
        uptime_ms,
        approx_db,
        dbfs);

    return finish_payload_write(written, out_len, out_written);
}

esp_err_t event_payload_build_outdoor_location(
    char *out,
    size_t out_len,
    uint32_t boot_id,
    int64_t uptime_ms,
    double lat,
    double lng,
    uint8_t satellite_count,
    double altitude_meters,
    size_t *out_written)
{
    if (out == NULL || out_len == 0)
    {
        return ESP_ERR_INVALID_ARG;
    }

    int written = snprintf(
        out,
        out_len,
        "{\"data\":{\"type\":\"outdoorLocation\",\"source\":{\"bootId\":%" PRIu32 ",\"uptimeMs\":%" PRId64 "},\"data\":{\"lat\":%.8f,\"lng\":%.8f,\"satelliteCount\":%u,\"altitudeMeters\":%.2f}}}",
        boot_id,
        uptime_ms,
        lat,
        lng,
        (unsigned int)satellite_count,
        altitude_meters);

    return finish_payload_write(written, out_len, out_written);
}

esp_err_t event_payload_build_indoor_location(
    char *out,
    size_t out_len,
    uint32_t boot_id,
    int64_t uptime_ms,
    const indoor_location_sensor_reading_t *result,
    size_t *out_written)
{
    if (out == NULL || out_len == 0 || result == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    int written = snprintf(
        out,
        out_len,
        "{\"data\":{\"type\":\"indoorLocation\",\"source\":{\"bootId\":%" PRIu32 ",\"uptimeMs\":%" PRId64 "},\"data\":{\"beacons\":[",
        boot_id,
        uptime_ms);
    esp_err_t err = finish_payload_write(written, out_len, out_written);
    if (err != ESP_OK)
    {
        return err;
    }

    size_t used = (size_t)written;
    for (size_t i = 0; i < result->match_count; i++)
    {
        written = snprintf(
            out + used,
            out_len - used,
            "%s{\"id\":\"%s\",\"signalStrengthDbm\":%d}",
            i == 0 ? "" : ",",
            result->matches[i].id,
            result->matches[i].signal_strength_dbm);
        if (written < 0 || written >= (int)(out_len - used))
        {
            return ESP_ERR_INVALID_SIZE;
        }

        used += (size_t)written;
    }

    written = snprintf(out + used, out_len - used, "]}}}");
    if (written < 0 || written >= (int)(out_len - used))
    {
        return ESP_ERR_INVALID_SIZE;
    }

    used += (size_t)written;
    if (out_written != NULL)
    {
        *out_written = used;
    }

    return ESP_OK;
}

esp_err_t event_payload_build_corrupt_device_config(
    char *out,
    size_t out_len,
    uint32_t boot_id,
    int64_t uptime_ms,
    uint32_t fallback_version,
    size_t *out_written)
{
    if (out == NULL || out_len == 0)
    {
        return ESP_ERR_INVALID_ARG;
    }

    int written = snprintf(
        out,
        out_len,
        "{\"data\":{\"type\":\"corruptDeviceConfig\",\"source\":{\"bootId\":%" PRIu32 ",\"uptimeMs\":%" PRId64 "},\"data\":{\"fallbackVersion\":%" PRIu32 "}}}",
        boot_id,
        uptime_ms,
        fallback_version);

    return finish_payload_write(written, out_len, out_written);
}
