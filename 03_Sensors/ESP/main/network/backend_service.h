#pragma once

#include "esp_err.h"

/**
 * @brief Create the task that reports device status to the backend.
 *
 * @retval ESP_OK Task created successfully.
 * @retval ESP_FAIL Task creation failed.
 */
esp_err_t spawn_backend_report_task(void);

/**
 * @brief Create the task that sends queued events to the backend when network
 * connectivity is available.
 *
 * @retval ESP_OK Task created successfully.
 * @retval ESP_FAIL Task creation failed.
 */
esp_err_t spawn_event_send_task(void);

/**
 * @brief Queue an event payload for delivery to the backend.
 *
 * @param payload Event payload buffer.
 * @param payload_len Event payload length in bytes.
 * @retval ESP_OK Event queued successfully.
 * @retval ESP_ERR_INVALID_STATE The event buffer is not initialized.
 * @retval ESP_ERR_INVALID_SIZE Payload length is invalid.
 * @retval ESP_FAIL Event could not be enqueued.
 */
esp_err_t send_event(const char *payload, int payload_len);
