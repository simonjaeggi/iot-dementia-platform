#pragma once

#include <stdbool.h>
#include <stdint.h>
#include "esp_err.h"

/**
 * @brief Initialize Wi-Fi service resources and register event handlers.
 *
 * @retval ESP_OK Wi-Fi service initialized successfully.
 * @retval ESP_FAIL Initialization failed.
 */
esp_err_t wifi_init(void);

/**
 * @brief Spawn the background task that manages Wi-Fi connection and reconnects.
 *
 * Uses the SSID and password from the application context.
 *
 * @retval ESP_OK Connector task started successfully.
 * @retval ESP_FAIL Wi-Fi is not initialized or task creation failed.
 */
esp_err_t spawn_wifi_connector_task(void);

/**
 * @brief Wait until the station has an IP connection.
 *
 * @param timeout_ms Maximum time to wait in milliseconds.
 * @retval ESP_OK Wi-Fi is connected.
 * @retval ESP_ERR_TIMEOUT Timed out while waiting for a connection.
 * @retval ESP_FAIL Service is not initialized.
 */
esp_err_t wifi_wait_for_connection(uint32_t timeout_ms);
