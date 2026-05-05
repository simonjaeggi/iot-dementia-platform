#pragma once

#include "esp_err.h"
#include <stddef.h>

/**
 * @brief Generate an ECC key pair and CSR in PEM format.
 *
 * @param device_cn Common name for the CSR, preferably unique.
 * @param out_key_pem Buffer to receive the private key PEM.
 * @param out_key_pem_size Capacity of the private key buffer in bytes.
 * @param out_csr_pem Buffer to receive the CSR PEM.
 * @param out_csr_pem_size Capacity of the CSR buffer in bytes.
 * @retval ESP_OK Key pair and CSR generated successfully.
 * @retval ESP_FAIL Generation failed.
 */
esp_err_t gen_key_and_csr(const char *device_cn,
                                          unsigned char *out_key_pem, size_t out_key_pem_size,
                                          unsigned char *out_csr_pem, size_t out_csr_pem_size);

/**
 * @brief Generate a CSR using an existing private key.
 *
 * @param device_cn Common name for the CSR, preferably unique.
 * @param key_pem Existing private key in PEM format.
 * @param key_pem_len Length of the private key buffer in bytes.
 * @param out_csr_pem Buffer to receive the CSR PEM.
 * @param out_csr_pem_size Capacity of the CSR buffer in bytes.
 * @retval ESP_OK CSR generated successfully.
 * @retval ESP_FAIL Generation failed.
 */
esp_err_t gen_csr_from_key(const char *device_cn,
                                           const unsigned char *key_pem, size_t key_pem_len,
                                           unsigned char *out_csr_pem, size_t out_csr_pem_size);
