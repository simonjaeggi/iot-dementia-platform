/**
 * @file cert_helper.c
 * @brief CSR and key-generation helpers.
 */

#include "cert_helper.h"
#include "mbedtls/pk.h"
#include "mbedtls/ecp.h"
#include "mbedtls/ctr_drbg.h"
#include "mbedtls/entropy.h"
#include "mbedtls/x509_csr.h"
#include <stdio.h>
#include <string.h>

#define RNG_PERS "esp32-csr"
#define KEY_CURVE MBEDTLS_ECP_DP_SECP256R1
#define HASH_ALG MBEDTLS_MD_SHA256

/**
 * @brief Free mbedTLS contexts used during CSR/key generation.
 *
 * @param ent Entropy context.
 * @param rng CTR-DRBG context.
 * @param key PK context.
 * @param req CSR writer context.
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

esp_err_t gen_csr_from_key(const char *device_cn,
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
        return ESP_FAIL;
    }

    result = mbedtls_pk_parse_key(&key_context,
                                  key_pem, key_pem_len,
                                  NULL, 0,
                                  mbedtls_ctr_drbg_random, &random_generator);
    if (result)
    {
        cleanup(&entropy, &random_generator, &key_context, &csr_writer);
        return ESP_FAIL;
    }

    char subject_string[128];
    snprintf(subject_string, sizeof(subject_string), "CN=%s", device_cn);

    mbedtls_x509write_csr_set_md_alg(&csr_writer, HASH_ALG);
    mbedtls_x509write_csr_set_key(&csr_writer, &key_context);

    result = mbedtls_x509write_csr_set_subject_name(&csr_writer, subject_string);
    if (result)
    {
        cleanup(&entropy, &random_generator, &key_context, &csr_writer);
        return ESP_FAIL;
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
        return ESP_FAIL;
    }

    cleanup(&entropy, &random_generator, &key_context, &csr_writer);
    return ESP_OK;
}

esp_err_t gen_key_and_csr(const char *device_cn,
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
        return ESP_FAIL;
    }

    result = mbedtls_pk_setup(&key_context,
                              mbedtls_pk_info_from_type(MBEDTLS_PK_ECKEY));
    if (result)
    {
        cleanup(&entropy, &random_generator, &key_context, &csr_writer);
        return ESP_FAIL;
    }

    result = mbedtls_ecp_gen_key(KEY_CURVE,
                                 mbedtls_pk_ec(key_context),
                                 mbedtls_ctr_drbg_random,
                                 &random_generator);
    if (result)
    {
        cleanup(&entropy, &random_generator, &key_context, &csr_writer);
        return ESP_FAIL;
    }

    memset(out_key_pem, 0, out_key_pem_size);
    result = mbedtls_pk_write_key_pem(&key_context,
                                      out_key_pem,
                                      out_key_pem_size);
    if (result)
    {
        cleanup(&entropy, &random_generator, &key_context, &csr_writer);
        return ESP_FAIL;
    }

    char subject_string[128];
    snprintf(subject_string, sizeof(subject_string), "CN=%s", device_cn);

    mbedtls_x509write_csr_set_md_alg(&csr_writer, HASH_ALG);
    mbedtls_x509write_csr_set_key(&csr_writer, &key_context);

    result = mbedtls_x509write_csr_set_subject_name(&csr_writer, subject_string);
    if (result)
    {
        cleanup(&entropy, &random_generator, &key_context, &csr_writer);
        return ESP_FAIL;
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
        return ESP_FAIL;
    }

    cleanup(&entropy, &random_generator, &key_context, &csr_writer);
    return ESP_OK;
}
