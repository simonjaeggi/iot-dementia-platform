#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/**
 * @brief Initialize the event ring buffer.
 *
 */
void init_event_buffer(void);
/**
 * @brief Push an event into the ring buffer.
 *
 * If the event is larger than the buffer capacity, it is dropped. If it does not
 * fit, the oldest events are dropped until it fits.
 *
 * @param data   Event data pointer
 * @param length Event size in bytes
 * @return true if enqueued; false otherwise.
 * @retval true  Event was enqueued
 * @retval false Invalid args, buffer not initialized, or event could not be enqueued
 */
bool event_buffer_push(const void *data, size_t length);
/**
 * @brief Pop the next event and return a heap-allocated copy.
 *
 * Blocks until an event is available. The caller must free the returned buffer.
 *
 * @param out_data             Output pointer to the allocated event buffer
 * @param out_len              Output length of the event buffer
 * @param drop_counter_at_pop  Optional output of drop counter at time of pop
 * @return true if an event was returned; false otherwise.
 * @retval true  Event data copied and returned
 * @retval false Invalid args, no event, or allocation failed
 */
bool event_buffer_pop_copy(uint8_t **out_data, size_t *out_len, uint32_t *drop_counter_at_pop);
/**
 * @brief Return the number of dropped events since initialization.
 *
 * @return Drop counter value
 */
uint32_t event_buffer_get_drop_counter(void);
