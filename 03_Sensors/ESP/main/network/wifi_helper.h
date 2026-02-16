#pragma once

#include <stdbool.h>
#include "esp_err.h"

esp_err_t wifi_helper_init(void);
esp_err_t wifi_helper_connect(const char *ssid, const char *pass, int max_retry, bool wait_for_ip);
esp_err_t wifi_helper_disconnect(void);
esp_err_t wifi_helper_deinit(void);
