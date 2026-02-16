#pragma once
#include "esp_err.h"
#include <stdbool.h>
#include <stddef.h>

esp_err_t backend_get_health(const char *backend_hostname);
esp_err_t backend_get_config(const char *backend_hostname, char *out_buf, size_t out_len);
esp_err_t backend_put_report(const char *backend_hostname, bool *config_changed);
