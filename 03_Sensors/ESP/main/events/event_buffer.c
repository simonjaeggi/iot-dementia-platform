#include "freertos/FreeRTOS.h"
#include "freertos/ringbuf.h"
#include "esp_log.h"
#include "app_config.h"
#include <stdlib.h>
#include <string.h>

#define TAG "event_buffer"

static RingbufHandle_t event_buffer_handle = NULL;

static volatile uint32_t drop_counter = 0;

void init_event_buffer(void)
{
    if (event_buffer_handle != NULL)
    {
        ESP_LOGW(TAG, "Event buffer already initialized");
        return;
    }

    event_buffer_handle = xRingbufferCreate(EVENT_BUFFER_CAPACITY_BYTES, RINGBUF_TYPE_NOSPLIT);

    if (event_buffer_handle == NULL)
    {
        ESP_LOGE(TAG, "Failed to create event buffer (%d bytes)", EVENT_BUFFER_CAPACITY_BYTES);
    }
    else
    {
        ESP_LOGI(TAG, "Event buffer initialized with %d bytes", EVENT_BUFFER_CAPACITY_BYTES);
    }
}

bool event_buffer_push(const void *data, size_t length)
{
    if (event_buffer_handle == NULL)
        return false;
    if (data == NULL || length == 0)
        return false;

    if (length > EVENT_BUFFER_CAPACITY_BYTES)
    {
        ESP_LOGW(TAG, "Event too large (%u bytes), dropping", length);
        return false;
    }

    int dropped_count = 0;

    while (true)
    {
        if (xRingbufferSend(event_buffer_handle, data, length, 0))
        {
            if (dropped_count > 0)
            {
                ESP_LOGW(TAG, "Buffer full: dropped %d oldest event(s) to fit new event (%u bytes)",
                         dropped_count, length);
            }
            return true;
        }

        size_t oldest_length = 0;
        void *oldest_item = xRingbufferReceive(event_buffer_handle,
                                               &oldest_length,
                                               0);
        if (oldest_item == NULL)
        {
            ESP_LOGW(TAG, "Buffer full but could not drop oldest");
            return false;
        }

        drop_counter++;
        vRingbufferReturnItem(event_buffer_handle, oldest_item);

        dropped_count++;
    }
}

bool event_buffer_pop_copy(uint8_t **out_data, size_t *out_len, uint32_t *drop_counter_at_pop)
{
    if (!out_data || !out_len)
    {
        return false;
    }

    size_t event_length = 0;
    void *event_data = xRingbufferReceive(
        event_buffer_handle,
        &event_length,
        portMAX_DELAY);

    if (event_data == NULL)
    {
        return false;
    }

    if (event_length == 0)
    {
        vRingbufferReturnItem(event_buffer_handle, event_data);
        return false;
    }

    uint8_t *event_copy = (uint8_t *)malloc(event_length);
    if (!event_copy)
    {
        ESP_LOGE(TAG, "Out of memory, dropping event (%u bytes)", event_length);
        vRingbufferReturnItem(event_buffer_handle, event_data);
        return false;
    }

    memcpy(event_copy, event_data, event_length);
    vRingbufferReturnItem(event_buffer_handle, event_data);

    *out_data = event_copy;
    *out_len = event_length;
    if (drop_counter_at_pop)
    {
        *drop_counter_at_pop = drop_counter;
    }

    return true;
}

uint32_t event_buffer_get_drop_counter(void)
{
    return drop_counter;
}
