#pragma once
#include <stddef.h>

#define WIFI_SSID_MAX_LEN 33
#define WIFI_PASSWORD_MAX_LEN 65
#define BACKEND_HOSTNAME_MAX_LEN 64

char *app_context_wifi_ssid(void);
size_t app_context_wifi_ssid_len(void);

char *app_context_wifi_password(void);
size_t app_context_wifi_password_len(void);

char *app_context_backend_host(void);
size_t app_context_backend_host_len(void);

char *app_context_device_name(void);
size_t app_context_device_name_len(void);
