#pragma once
#include "esp_err.h"
#include <stddef.h>

esp_err_t read_prov_config(const char *backend_key, char *backend_out, size_t backend_len,
                           const char *ssid_key, char *ssid_out, size_t ssid_len,
                           const char *pw_key, char *pw_out, size_t pw_len);
esp_err_t read_device_config(char *out_json, size_t out_len, const char *cfg_key);
esp_err_t write_device_config(const char *json, const char *cfg_key);
void device_config_ensure_device_name(void);
