#pragma once

#include "esp_err.h"
#include <stdbool.h>

/**
 * @brief Generate a CSR, optionally also if a cert already exists. 
 * If no key is stored in NVS, generate and store the key first. 
 * CSR is printed to serial console.
 *
 * @param device_cn Common name for the CSR, preferably unique.
 * @param force_csr When true, generate a CSR even if a cert already exists.
 * @retval ESP_OK CSR generation succeeded, or generation was skipped because an
 *     existing certificate was already present.
 * @retval ESP_FAIL CSR generation failed.
 */
esp_err_t generate_csr(const char *device_cn, bool force_csr);

/**
 * @brief Check whether a device certificate is stored in NVS.
 *
 * @retval true A device certificate exists in NVS.
 * @retval false No device certificate exists, or the check failed.
 */
bool cert_exists(void);

/**
 * @brief Print the currently stored device certificate from NVS.
 */
void print_cert_from_nvs(void);

/**
 * @brief Read a PEM certificate from standard input and store it in NVS.
 */
void serial_read_and_store_cert(void);
