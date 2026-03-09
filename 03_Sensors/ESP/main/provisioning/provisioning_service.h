#pragma once

#include "esp_err.h"
#include <stdbool.h>

/**
 * @brief Start HTTPS provisioning (SoftAP + HTTPS server).
 *
 * @return ESP_OK on success; ESP_FAIL otherwise.
 * @retval ESP_OK   SoftAP and HTTPS server started
 * @retval ESP_FAIL Failed to start SoftAP or HTTPS server
 */
esp_err_t provisioning_service_https_start(void);

/**
 * @brief Stop HTTPS provisioning (HTTPS server + SoftAP).
 *
 * @return ESP_OK on success; ESP_FAIL otherwise.
 * @retval ESP_OK   Provisioning server stopped
 * @retval ESP_FAIL Failed to stop HTTPS server or SoftAP
 */
esp_err_t provisioning_service_https_stop(void);

/**
 * @brief Generate a CSR, optionally even if a cert already exists.
 *
 * @param device_cn Common name for the CSR, preferably unique
 * @param force_csr When true, generate a CSR even if a cert already exists
 * @return ESP_OK on success; ESP_FAIL otherwise.
 * @retval ESP_OK   CSR generated and printed
 * @retval ESP_FAIL CSR generation failed (details logged)
 */
esp_err_t provisioning_service_cert_generate_csr(const char *device_cn, bool force_csr);

/**
 * @brief Check whether a device certificate is stored in NVS.
 *
 * @return true if the certificate exists, false otherwise
 */
bool provisioning_service_cert_exists(void);

/**
 * @brief Print the currently stored device certificate from NVS.
 */
void provisioning_service_cert_print_from_nvs(void);

/**
 * @brief Read a PEM certificate from stdin and store it in NVS.
 */
void provisioning_service_cert_read_and_store(void);
