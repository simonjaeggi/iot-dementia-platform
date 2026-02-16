#pragma once

#include <stdint.h>
#include "esp_err.h"

typedef struct {
    const char *ap_ssid;
    const char *ap_pass;
    uint8_t ap_channel;
    uint8_t max_sta_conn;

    const char *ssid_key;
    const char *password_key;
    const char *host_key;
} provisioning_https_config_t;

esp_err_t provisioning_https_start(void);
esp_err_t provisioning_https_stop(void);
