#pragma once

#include "esp_err.h"

#include <stddef.h>
#include <stdint.h>

/**
 * @brief Initialize the event ring buffer.
 */
void init_event_buffer(void);

/**
 * @brief Push an event into the ring buffer.
 *
 * If the event is larger than the buffer capacity, it is dropped. If it does not
 * fit, the oldest events are dropped until it fits.
 *
 * @param data Event data pointer.
 * @param length Event size in bytes.
 * @retval ESP_OK Event was enqueued.
 * @retval ESP_ERR_INVALID_ARG Data is NULL or length is 0.
 * @retval ESP_ERR_INVALID_STATE The event buffer is not initialized.
 * @retval ESP_ERR_INVALID_SIZE The event is larger than the buffer capacity.
 * @retval ESP_FAIL The event could not be enqueued.
 */
esp_err_t event_buffer_push(const void *data, size_t length);

/**
 * @brief Pop the next event and return a heap-allocated copy.
 *
 * Blocks until an event is available. The caller must free the returned buffer.
 *
 * @param out_data Output pointer to the allocated event buffer.
 * @param out_len Output length of the event buffer.
 * @param drop_counter_at_pop Optional output of the drop counter at the time of
 *     pop.
 * @retval ESP_OK Event data was copied and returned.
 * @retval ESP_ERR_INVALID_ARG out_data or out_len is NULL.
 * @retval ESP_ERR_INVALID_STATE The event buffer is not initialized.
 * @retval ESP_ERR_INVALID_SIZE A zero-length event was received.
 * @retval ESP_ERR_NO_MEM Memory allocation failed while copying the event.
 * @retval ESP_FAIL No event data was returned.
 */
esp_err_t event_buffer_pop_copy(uint8_t **out_data, size_t *out_len, uint32_t *drop_counter_at_pop);

/**
 * @brief Return the number of dropped events since initialization.
 *
 * @return Drop counter value.
 */
uint32_t event_buffer_get_drop_counter(void);
