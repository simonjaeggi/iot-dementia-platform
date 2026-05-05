#pragma once
#include <stddef.h>
#include <stdint.h>
#include "device_config.h"
#define WIFI_SSID_MAX_LEN 33
#define WIFI_PASSWORD_MAX_LEN 65
#define BACKEND_HOSTNAME_MAX_LEN 64

/**
 * @brief Get the Wi-Fi SSID buffer from the application context.
 *
 * @return Pointer to the buffer. The string is null-terminated when set.
 */
char *app_context_wifi_ssid(void);

/**
 * @brief Get the size of the Wi-Fi SSID buffer.
 *
 * @return Buffer size in bytes, including space for the null terminator.
 */
size_t app_context_wifi_ssid_len(void);

/**
 * @brief Get the Wi-Fi password buffer from the application context.
 *
 * @return Pointer to the buffer. The string is null-terminated when set.
 */
char *app_context_wifi_password(void);

/**
 * @brief Get the size of the Wi-Fi password buffer.
 *
 * @return Buffer size in bytes, including space for the null terminator.
 */
size_t app_context_wifi_password_len(void);

/**
 * @brief Get the backend host buffer from the application context.
 *
 * @return Pointer to the buffer. The string is null-terminated when set.
 */
char *app_context_backend_host(void);

/**
 * @brief Get the size of the backend host buffer.
 *
 * @return Buffer size in bytes, including space for the null terminator.
 */
size_t app_context_backend_host_len(void);

/**
 * @brief Get the device name buffer from the application context.
 *
 * @return Pointer to the buffer. The string is null-terminated when set.
 */
char *app_context_device_name(void);

/**
 * @brief Get the size of the device name buffer.
 *
 * @return Buffer size in bytes, including space for the null terminator.
 */
size_t app_context_device_name_len(void);

/**
 * @brief Get the boot ID from the application context.
 *
 * @return Boot ID value.
 */
uint32_t app_context_boot_id(void);

/**
 * @brief Set the boot ID in the application context.
 *
 * @param boot_id Boot ID value.
 */
void app_context_set_boot_id(uint32_t boot_id);

/**
 * @brief Get the device configuration from the application context.
 *
 * @return Pointer to the device configuration.
 */
const device_config_t *app_context_device_cfg(void);

/**
 * @brief Set the device configuration in the application context.
 *
 * @param new_device_cfg Pointer to the new device configuration.
 */
void app_context_set_device_cfg(const device_config_t *new_device_cfg);
