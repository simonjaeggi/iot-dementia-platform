#pragma once

#include <stdbool.h>
#include "esp_err.h"

/**
 * @brief Initialize Wi-Fi service resources and register event handlers.
 *
 * @return ESP_OK   on success; ESP_FAIL otherwise.
 * @retval ESP_OK   Wi-Fi service initialized
 * @retval ESP_FAIL Init failed (details logged)
 */
esp_err_t wifi_service_init(void);

/**
 * @brief Spawn a background task to manage Wi-Fi connection and reconnects.
 *
 * Uses SSID/password from app context.
 *
 * @return ESP_OK on success; ESP_FAIL otherwise.
 * @retval ESP_OK   Connector task started
 * @retval ESP_FAIL Task creation failed or Wi-Fi not initialized
 */
esp_err_t spawn_wifi_connector_task(void);
