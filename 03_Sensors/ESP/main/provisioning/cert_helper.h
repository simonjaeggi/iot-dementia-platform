#pragma once

#include "esp_err.h"
#include <stddef.h>

/**
 * @brief Generate an ECC keypair and CSR in PEM format.
 *
 * @param device_cn         Common name for the CSR, preferably unique
 * @param out_key_pem       Buffer to receive the private key PEM
 * @param out_key_pem_size  Size of private key buffer
 * @param out_csr_pem       Buffer to receive the CSR PEM
 * @param out_csr_pem_size  Size of CSR buffer
 *
 * @return ESP_OK on success; ESP_FAIL otherwise.
 * @retval ESP_OK   Keypair and CSR generated
 * @retval ESP_FAIL Generation failed
 */
esp_err_t cert_helper_gen_key_and_csr_pem(const char *device_cn,
                                          unsigned char *out_key_pem, size_t out_key_pem_size,
                                          unsigned char *out_csr_pem, size_t out_csr_pem_size);

/**
 * @brief Generate a CSR using an existing private key.
 *
 * @param device_cn        Common name for the CSR, preferably unique
 * @param key_pem          Existing private key in PEM format
 * @param key_pem_len      Length of private key buffer
 * @param out_csr_pem      Buffer to receive the CSR PEM
 * @param out_csr_pem_size Size of CSR buffer
 *
 * @return ESP_OK on success; ESP_FAIL otherwise.
 * @retval ESP_OK   CSR generated
 * @retval ESP_FAIL Generation failed
 */
esp_err_t cert_helper_gen_csr_from_key_pem(const char *device_cn,
                                           const unsigned char *key_pem, size_t key_pem_len,
                                           unsigned char *out_csr_pem, size_t out_csr_pem_size);
