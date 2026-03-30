#pragma once

#include "esp_err.h"

/**
 * @brief Creates new task that reports to the backend.
 *
 * @return true if task created successfully, false otherwise
 */
bool spawn_backend_report_task(void);
/**
 * @brief Creates a new task that empties the event buffer queue when network is available.
 *
 * @return true if task created successfully, false otherwise
 */
bool spawn_event_send_task(void);

esp_err_t send_event(const char *payload, int payload_len);
