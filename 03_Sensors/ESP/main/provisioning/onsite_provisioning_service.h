#pragma once

#include "esp_err.h"
#include <stdbool.h>

/**
 * @brief Start HTTPS provisioning (SoftAP + HTTPS server).
 *
 * @retval ESP_OK SoftAP and HTTPS server started successfully.
 * @retval ESP_FAIL SoftAP or HTTPS server startup failed.
 */
esp_err_t start_https_and_softap(void);
