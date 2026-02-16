#include "app_context.h"
#include "app_config.h"

static char wifi_ssid[WIFI_SSID_MAX_LEN];
static char wifi_password[WIFI_PASSWORD_MAX_LEN];
static char backend_host[BACKEND_HOSTNAME_MAX_LEN];
static char device_name[DEVICE_NAME_MAX_LEN];

char *app_context_wifi_ssid(void)
{
    return wifi_ssid;
}

size_t app_context_wifi_ssid_len(void)
{
    return sizeof(wifi_ssid);
}

char *app_context_wifi_password(void)
{
    return wifi_password;
}

size_t app_context_wifi_password_len(void)
{
    return sizeof(wifi_password);
}

char *app_context_backend_host(void)
{
    return backend_host;
}

size_t app_context_backend_host_len(void)
{
    return sizeof(backend_host);
}

char *app_context_device_name(void)
{
    return device_name;
}

size_t app_context_device_name_len(void)
{
    return sizeof(device_name);
}
