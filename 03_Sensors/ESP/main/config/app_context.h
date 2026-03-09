#pragma once
#include <stddef.h>
#include <stdint.h>

#define WIFI_SSID_MAX_LEN 33
#define WIFI_PASSWORD_MAX_LEN 65
#define BACKEND_HOSTNAME_MAX_LEN 64

/**
 * @brief Get Wi-Fi SSID from context.
 *
 * @return Buffer pointer (null-terminated when set).
 */
char *app_context_wifi_ssid(void);
/**
 * @brief Get size of the Wi-Fi SSID buffer.
 *
 * @return Buffer size in bytes, including space for the null terminator.
 */
size_t app_context_wifi_ssid_len(void);

/**
 * @brief Get Wi-Fi password from context.
 *
 * @return Buffer pointer (null-terminated when set).
 */
char *app_context_wifi_password(void);
/**
 * @brief Get size of the Wi-Fi password buffer.
 *
 * @return Buffer size in bytes, including space for the null terminator.
 */
size_t app_context_wifi_password_len(void);

/**
 * @brief Get backend host from context.
 *
 * @return Buffer pointer (null-terminated when set).
 */
char *app_context_backend_host(void);
/**
 * @brief Get size of the backend host buffer.
 *
 * @return Buffer size in bytes, including space for the null terminator.
 */
size_t app_context_backend_host_len(void);

/**
 * @brief Get device name from context.
 *
 * @return Buffer pointer (null-terminated when set).
 */
char *app_context_device_name(void);
/**
 * @brief Get size of the device name buffer.
 *
 * @return Buffer size in bytes, including space for the null terminator.
 */
size_t app_context_device_name_len(void);

/**
 * @brief Get boot id from context.
 *
 * @return Boot id value.
 */
uint32_t app_context_boot_id(void);
/**
 * @brief Set boot id in context.
 *
 * @param boot_id Boot id value.
 */
void app_context_set_boot_id(uint32_t boot_id);
