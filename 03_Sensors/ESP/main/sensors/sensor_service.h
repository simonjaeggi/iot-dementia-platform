#pragma once

#include "esp_err.h"

/**
 * @brief Spawn one background task for each sensor in the current device
 * configuration.
 *
 * @retval ESP_OK Sensor tasks started successfully.
 * @retval ESP_ERR_INVALID_STATE Device configuration is unavailable.
 * @retval ESP_FAIL Task creation failed.
 */
esp_err_t spawn_sensor_event_task(void);
