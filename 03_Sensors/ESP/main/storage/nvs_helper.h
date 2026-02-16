#pragma once
#include "esp_err.h"
#include <stddef.h>

void nvs_init(void);
esp_err_t nvs_set_string(const char *key, const char *value);
esp_err_t nvs_get_string(const char *key, char *out, size_t out_len);
