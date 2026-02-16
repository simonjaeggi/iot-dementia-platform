/**
 * @file provisioning_cert.c
 * @brief This file contains code to generate a CSR. Intended to be used during device manufacturing.
 */

#include <stdio.h>
#include <stdlib.h>

#include "app_config.h"
#include "provisioning_cert.h"
#include "esp_err.h"
#include "esp_log.h"
#include <stdbool.h>
#include <string.h>
#include "nvs_helper.h"
#include "nvs.h"

#include "mbedtls/pk.h"
#include "mbedtls/ecp.h"
#include "mbedtls/ctr_drbg.h"
#include "mbedtls/entropy.h"
#include "mbedtls/x509_csr.h"

#include <time.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"


#define RNG_PERS "esp32-csr"
#define KEY_CURVE MBEDTLS_ECP_DP_SECP256R1
#define HASH_ALG MBEDTLS_MD_SHA256


static const char *TAG = "prov_cert";

/**
 * @brief Free all resources after creating CSR.
 *
 * @param ent Entropy context
 * @param rng Random generator context
 * @param key Key context
 * @param req CSR writer context
 */
static void cleanup(mbedtls_entropy_context *ent,
                    mbedtls_ctr_drbg_context *rng,
                    mbedtls_pk_context *key,
                    mbedtls_x509write_csr *req)
{
    mbedtls_x509write_csr_free(req);
    mbedtls_pk_free(key);
    mbedtls_ctr_drbg_free(rng);
    mbedtls_entropy_free(ent);
}

/**
 * @brief Generate a CSR using an existing private key.
 *
 * @param device_cn        Common name for the CSR, preferably unique
 * @param key_pem          Existing private key in PEM format
 * @param key_pem_len      Length of private key buffer
 * @param out_csr_pem      Buffer to receive the CSR PEM
 * @param out_csr_pem_size Size of CSR buffer
 *
 * @return 0 on success, non-zero error code on failure
 */
static int gen_csr_from_key_pem(const char *device_cn,
                                const unsigned char *key_pem, size_t key_pem_len,
                                unsigned char *out_csr_pem, size_t out_csr_pem_size)
{
    int result = 0;

    mbedtls_entropy_context entropy;
    mbedtls_entropy_init(&entropy);

    mbedtls_ctr_drbg_context random_generator;
    mbedtls_ctr_drbg_init(&random_generator);

    mbedtls_pk_context key_context;
    mbedtls_pk_init(&key_context);

    mbedtls_x509write_csr csr_writer;
    mbedtls_x509write_csr_init(&csr_writer);

    result = mbedtls_ctr_drbg_seed(&random_generator,
                                   mbedtls_entropy_func,
                                   &entropy,
                                   (const unsigned char *)RNG_PERS,
                                   strlen(RNG_PERS));
    if (result)
    {
        cleanup(&entropy, &random_generator, &key_context, &csr_writer);
        return result;
    }

    result = mbedtls_pk_parse_key(&key_context,
                                  key_pem, key_pem_len,
                                  NULL, 0,
                                  mbedtls_ctr_drbg_random, &random_generator);
    if (result)
    {
        cleanup(&entropy, &random_generator, &key_context, &csr_writer);
        return result;
    }

    char subject_string[128];
    snprintf(subject_string, sizeof(subject_string), "CN=%s", device_cn);

    mbedtls_x509write_csr_set_md_alg(&csr_writer, HASH_ALG);
    mbedtls_x509write_csr_set_key(&csr_writer, &key_context);

    result = mbedtls_x509write_csr_set_subject_name(&csr_writer, subject_string);
    if (result)
    {
        cleanup(&entropy, &random_generator, &key_context, &csr_writer);
        return result;
    }

    memset(out_csr_pem, 0, out_csr_pem_size);
    result = mbedtls_x509write_csr_pem(&csr_writer,
                                       out_csr_pem,
                                       out_csr_pem_size,
                                       mbedtls_ctr_drbg_random,
                                       &random_generator);
    if (result)
    {
        cleanup(&entropy, &random_generator, &key_context, &csr_writer);
        return result;
    }

    cleanup(&entropy, &random_generator, &key_context, &csr_writer);
    return 0;
}

/**
 * @brief Generate a CSR, optionally even if a cert already exists.
 *
 * @param device_cn Common name for the CSR, preferably unique
 * @param force_csr When true, generate a CSR even if a cert already exists
 *
 * @return ESP_OK on success, error code otherwise
 */
esp_err_t provisioning_cert(const char *device_cn, bool force_csr)
{
    if (!device_cn || device_cn[0] == '\0')
    {
        ESP_LOGE(TAG, "Device CN not provided");
        return ESP_ERR_INVALID_ARG;
    }

    unsigned char *key_pem = (unsigned char *)malloc(DEVICE_PEM_BUF_SIZE);
    unsigned char *csr_pem = (unsigned char *)malloc(DEVICE_PEM_BUF_SIZE);
    if (!key_pem || !csr_pem)
    {
        free(key_pem);
        free(csr_pem);
        ESP_LOGE(TAG, "Failed to allocate CSR buffers");
        return ESP_ERR_NO_MEM;
    }

    if (!force_csr &&
        nvs_get_string(DEVICE_CERT_PEM_KEY, (char *)csr_pem, DEVICE_PEM_BUF_SIZE) == ESP_OK &&
        csr_pem[0])
    {
        ESP_LOGI(TAG, "Device Cert found in NVS. No new provisioning required.");
        free(key_pem);
        free(csr_pem);
        return ESP_OK;
    }

    bool have_key = (nvs_get_string(DEVICE_KEY_PEM_KEY, (char *)key_pem, DEVICE_PEM_BUF_SIZE) == ESP_OK &&
                     key_pem[0]);

    int rc = 0;
    if (have_key)
    {
        ESP_LOGI(TAG, "Using existing keypair from NVS to generate CSR.");
        rc = gen_csr_from_key_pem(device_cn,
                                  key_pem, strlen((char *)key_pem) + 1,
                                  csr_pem, DEVICE_PEM_BUF_SIZE);
        if (rc != 0)
        {
            ESP_LOGE(TAG, "gen_csr_from_key_pem failed: %d", rc);
            free(key_pem);
            free(csr_pem);
            return ESP_FAIL;
        }
    }
    else
    {
        if (force_csr)
        {
            ESP_LOGW(TAG, "Cert exists but key missing. Generating new keypair.");
        }

        rc = gen_key_and_csr_pem(device_cn,
                                 key_pem, DEVICE_PEM_BUF_SIZE,
                                 csr_pem, DEVICE_PEM_BUF_SIZE);
        if (rc != 0)
        {
            ESP_LOGE(TAG, "gen_key_and_csr_pem failed: %d", rc);
            free(key_pem);
            free(csr_pem);
            return ESP_FAIL;
        }

        esp_err_t err = nvs_set_string(DEVICE_KEY_PEM_KEY, (const char *)key_pem);
        if (err != ESP_OK)
        {
            ESP_LOGE(TAG, "nvs_set_string failed: %s", esp_err_to_name(err));
            free(key_pem);
            free(csr_pem);
            return err;
        }
    }

    printf("%s", (const char *)csr_pem);
    free(key_pem);
    free(csr_pem);
    return ESP_OK;
}

/**
 * @brief Generate an ECC keypair and CSR in PEM format.
 *
 * @param device_cn        Common name for the CSR, preferably unique
 * @param out_key_pem      Buffer to receive the private key PEM
 * @param out_key_pem_sz   Size of private key buffer
 * @param out_csr_pem      Buffer to receive the CSR PEM
 * @param out_csr_pem_sz   Size of CSR buffer
 *
 * @return 0 on success, non-zero error code on failure
 */
int gen_key_and_csr_pem(const char *device_cn,
                        unsigned char *out_key_pem, size_t out_key_pem_size,
                        unsigned char *out_csr_pem, size_t out_csr_pem_size)
{
    int result = 0;

    mbedtls_entropy_context entropy;
    mbedtls_entropy_init(&entropy);

    mbedtls_ctr_drbg_context random_generator;
    mbedtls_ctr_drbg_init(&random_generator);

    mbedtls_pk_context key_context;
    mbedtls_pk_init(&key_context);

    mbedtls_x509write_csr csr_writer;
    mbedtls_x509write_csr_init(&csr_writer);

    result = mbedtls_ctr_drbg_seed(&random_generator,
                                   mbedtls_entropy_func,
                                   &entropy,
                                   (const unsigned char *)RNG_PERS,
                                   strlen(RNG_PERS));
    if (result)
    {
        cleanup(&entropy, &random_generator, &key_context, &csr_writer);
        return result;
    }

    result = mbedtls_pk_setup(&key_context,
                              mbedtls_pk_info_from_type(MBEDTLS_PK_ECKEY));
    if (result)
    {
        cleanup(&entropy, &random_generator, &key_context, &csr_writer);
        return result;
    }

    result = mbedtls_ecp_gen_key(KEY_CURVE,
                                 mbedtls_pk_ec(key_context),
                                 mbedtls_ctr_drbg_random,
                                 &random_generator);
    if (result)
    {
        cleanup(&entropy, &random_generator, &key_context, &csr_writer);
        return result;
    }

    memset(out_key_pem, 0, out_key_pem_size);
    result = mbedtls_pk_write_key_pem(&key_context,
                                      out_key_pem,
                                      out_key_pem_size);
    if (result)
    {
        cleanup(&entropy, &random_generator, &key_context, &csr_writer);
        return result;
    }

    char subject_string[128];
    snprintf(subject_string, sizeof(subject_string), "CN=%s", device_cn);

    mbedtls_x509write_csr_set_md_alg(&csr_writer, HASH_ALG);
    mbedtls_x509write_csr_set_key(&csr_writer, &key_context);

    result = mbedtls_x509write_csr_set_subject_name(&csr_writer, subject_string);
    if (result)
    {
        cleanup(&entropy, &random_generator, &key_context, &csr_writer);
        return result;
    }

    memset(out_csr_pem, 0, out_csr_pem_size);
    result = mbedtls_x509write_csr_pem(&csr_writer,
                                       out_csr_pem,
                                       out_csr_pem_size,
                                       mbedtls_ctr_drbg_random,
                                       &random_generator);
    if (result)
    {
        cleanup(&entropy, &random_generator, &key_context, &csr_writer);
        return result;
    }

    cleanup(&entropy, &random_generator, &key_context, &csr_writer);
    return 0;
}

/**
 * @brief Check whether a device certificate is stored in NVS.
 *
 * @return true if the certificate exists, false otherwise
 */
bool provisioning_cert_exists(void)
{
    nvs_init();
    nvs_handle_t h;
    esp_err_t err = nvs_open("storage", NVS_READONLY, &h);
    if (err != ESP_OK)
        return false;

    size_t required = 0;
    err = nvs_get_str(h, DEVICE_CERT_PEM_KEY, NULL, &required);
    nvs_close(h);

    return (err == ESP_OK && required > 1);
}

/**
 * @brief Print the currently stored device certificate from NVS.
 */
void print_cert_from_nvs(void)
{
    char *pem = malloc(DEVICE_PEM_BUF_SIZE);
    if (!pem)
    {
        ESP_LOGE(TAG, "malloc failed (print cert)");
        return;
    }

    if (nvs_get_string(DEVICE_CERT_PEM_KEY, pem, DEVICE_PEM_BUF_SIZE) == ESP_OK && pem[0])
    {
        ESP_LOGI(TAG, "Cert currently in NVS (%d bytes):", (int)strlen(pem));
        printf("----- CERT FROM NVS START -----\n%s\n----- CERT FROM NVS END -----\n", pem);
    }
    else
    {
        ESP_LOGI(TAG, "No cert stored in NVS yet");
    }

    free(pem);
}

/**
 * @brief Helper function to read a PEM certificate from stdin with timeouts.
 *
 * @param out      Output buffer for the PEM certificate
 * @param out_size Size of output buffer
 *
 * @return true if a complete certificate was read, false otherwise
 */
static bool read_pem_cert(char *out, size_t out_size)
{
    static const char BEGIN[] = "-----BEGIN CERTIFICATE-----";
    static const char END[]   = "-----END CERTIFICATE-----";

    char line[256];
    size_t used = 0;
    bool capturing = false;

    if (!out || out_size == 0) return false;
    out[0] = 0;

    ESP_LOGI(TAG, "Paste certificate (PEM). Waiting for BEGIN (%ds)...", PROV_CERT_READ_TIMEOUT_MS/1000);

    TickType_t start = xTaskGetTickCount();
    const TickType_t timeout = pdMS_TO_TICKS(PROV_CERT_READ_TIMEOUT_MS);

    while ((xTaskGetTickCount() - start) < timeout)
    {
        if (!fgets(line, sizeof line, stdin)) {
            vTaskDelay(pdMS_TO_TICKS(50));
            continue;
        }

        if (!capturing) {
            if (!strstr(line, BEGIN)) continue;
            capturing = true;
            start = xTaskGetTickCount(); 
        }

        size_t len = strlen(line);
        if (used + len + 1 >= out_size) {
            ESP_LOGE(TAG, "Buffer too small");
            return false;
        }

        memcpy(out + used, line, len);
        used += len;
        out[used] = 0;

        if (strstr(line, END)) {
            ESP_LOGI(TAG, "END detected (%d bytes)", (int)used);
            return true;
        }
    }

    ESP_LOGE(TAG, "Timeout waiting for certificate");
    return false;
}

/**
 * @brief Read a PEM certificate from stdin and store it in NVS.
 */
void read_and_store_cert(void)
{
    char *pem = malloc(DEVICE_PEM_BUF_SIZE);
    if (!pem)
    {
        ESP_LOGE(TAG, "malloc failed (read cert)");
        return;
    }

    ESP_LOGI(TAG, "Paste PEM certificate now...");

    if (read_pem_cert(pem, DEVICE_PEM_BUF_SIZE))
    {
        ESP_LOGI(TAG, "Captured %d bytes", (int)strlen(pem));

        if (nvs_set_string(DEVICE_CERT_PEM_KEY, pem) == ESP_OK)
        {
            ESP_LOGI(TAG, "Cert stored to NVS");
        }
        else
        {
            ESP_LOGE(TAG, "Failed to store cert to NVS");
        }

        printf("----- CERT JUST STORED START -----\n%s\n----- CERT JUST STORED END -----\n", pem);
    }
    else
    {
        ESP_LOGE(TAG, "Failed to read PEM certificate");
    }

    free(pem);
}
