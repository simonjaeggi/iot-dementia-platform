#pragma once

#include "esp_err.h"
#include <stddef.h>
#include <stdbool.h>

esp_err_t provisioning_cert(const char *device_cn, bool force_csr);
int gen_key_and_csr_pem(const char *device_cn,
                        unsigned char *out_key_pem, size_t out_key_pem_size,
                        unsigned char *out_csr_pem, size_t out_csr_pem_size);
bool provisioning_cert_exists(void);
void print_cert_from_nvs(void);
void read_and_store_cert(void);
