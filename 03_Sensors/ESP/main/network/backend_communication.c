/**
 * @file backend_communication.c
 * @brief This file handles HTTP requests and resposonses towards the backend.
 */

#include "app_config.h"
#include "backend_communication.h"
#include "esp_http_client.h"
#include "esp_log.h"
#include "nvs_helper.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define TAG "backend"



extern const unsigned char server_pem_start[] asm("_binary_server_pem_start");

/**
 * @brief Sends an HTTPs request to a server, handling TLS and MTLS connections and memory cleanup.
 *
 * @param url               target web url
 * @param label             label for logging
 * @param method            HTTP method from enum esp_http_client_method_t
 * @param server_cert_pem   cert of target server to verify connection
 * @param client_cert_pem   client cert for MTLS, set NULL if server encryption only.
 * @param client_key_pem    client key for MTLS, set NULL if server encryption only.
 * @param content_type      X-Content-Type header (PUT/POST), set NULL if no message sent
 * @param payload           Message, set NULL if no message sent
 * @param resp_buf          response buffer 
 * @param resp_len          response buffer length
 *
 * @return ESP_OK on success, error code otherwise
 */
static esp_err_t backend_request(
    const char *url,
    const char *label,
    esp_http_client_method_t method,
    const char *server_cert_pem,
    const char *client_cert_pem,   
    const char *client_key_pem,    
    const char *content_type,      
    const char *payload,
    char *resp_buf,
    size_t resp_len
) {
    esp_http_client_config_t cfg = {
        .url = url,
        .method = method,
        .timeout_ms = 5000,
        .cert_pem = server_cert_pem,
        .client_cert_pem = client_cert_pem,
        .client_key_pem = client_key_pem,
    };

    esp_http_client_handle_t client = esp_http_client_init(&cfg);
    if (!client) {
        ESP_LOGE(TAG, "%s init failed", label);
        return ESP_FAIL;
    }

    if (content_type) {
        esp_http_client_set_header(client, "Content-Type", content_type);
    }
    if (payload) {
        esp_http_client_set_post_field(client, payload, (int)strlen(payload));
    }

    esp_err_t err = esp_http_client_perform(client);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "%s perform failed: %s", label, esp_err_to_name(err));
        esp_http_client_cleanup(client);
        return err;
    }

    int status = esp_http_client_get_status_code(client);
    ESP_LOGI(TAG, "%s status: %d", label, status);

    if (resp_buf && resp_len > 0) {
        resp_buf[0] = 0;
    }

    char resp[256];
    int n = 0;
    size_t used = 0;
    while ((n = esp_http_client_read(client, resp, sizeof(resp) - 1)) > 0) {
        resp[n] = 0;
        ESP_LOGI(TAG, "%s resp: %s", label, resp);

        if (resp_buf && resp_len > 1 && used < resp_len - 1) {
            size_t copy_len = (size_t)n;
            if (copy_len > resp_len - 1 - used) {
                copy_len = resp_len - 1 - used;
            }
            memcpy(resp_buf + used, resp, copy_len);
            used += copy_len;
            resp_buf[used] = 0;
        }
    }

    esp_http_client_cleanup(client);
    return ESP_OK;
}

/**
 * @brief 
 *
 * @param 
 *
 * @return 
 */
esp_err_t backend_get_health(const char *backend_hostname) {
    char url[160];
    snprintf(url, sizeof(url), "https://%s:%d/api/health", backend_hostname, BACKEND_HTTPS_PORT);
    ESP_LOGI(TAG, "GET %s", url);

    return backend_request(
        url, "health",
        HTTP_METHOD_GET,
        (const char *)server_pem_start,
        NULL, NULL,
        NULL,
        NULL,
        NULL,
        0
    );
}

esp_err_t backend_get_config(const char *backend_hostname,
                             char *out_buf,
                             size_t out_len)
{
    if (!backend_hostname || !out_buf || out_len == 0) {
        return ESP_ERR_INVALID_ARG;
    }

    char *device_cert = (char *)calloc(1, DEVICE_PEM_BUF_SIZE);
    char *device_key = (char *)calloc(1, DEVICE_PEM_BUF_SIZE);
    if (!device_cert || !device_key)
    {
        free(device_cert);
        free(device_key);
        return ESP_ERR_NO_MEM;
    }

    if (nvs_get_string(DEVICE_CERT_PEM_KEY, device_cert, DEVICE_PEM_BUF_SIZE) != ESP_OK ||
        nvs_get_string(DEVICE_KEY_PEM_KEY,  device_key,  DEVICE_PEM_BUF_SIZE)  != ESP_OK)
    {
        ESP_LOGE(TAG, "Missing device cert/key in NVS; cannot fetch config");
        free(device_cert);
        free(device_key);
        return ESP_ERR_NOT_FOUND;
    }

    char url[160];
    snprintf(url, sizeof(url), "https://%s:%d/api/device/mtls/config",
             backend_hostname, BACKEND_MTLS_PORT);
    ESP_LOGI(TAG, "GET %s", url);

    esp_err_t err = backend_request(
        url, "config",
        HTTP_METHOD_GET,
        (const char *)server_pem_start,
        device_cert,
        device_key,
        NULL,
        NULL,
        out_buf,
        out_len
    );
    memset(device_key, 0, DEVICE_PEM_BUF_SIZE);
    free(device_key);
    free(device_cert);
    return err;
}

/**
 * @brief 
 *
 * @param 
 * @param 
 *
 * @return 
 */
esp_err_t backend_put_report(const char *backend_hostname,
                             bool *config_changed)
{
    if (!backend_hostname || !config_changed) {
        return ESP_ERR_INVALID_ARG;
    }

    *config_changed = false;

    static char device_cert[DEVICE_PEM_BUF_SIZE];
    static char device_key[DEVICE_PEM_BUF_SIZE];
    char response[256] = {0};

    memset(device_cert, 0, sizeof(device_cert));
    memset(device_key, 0, sizeof(device_key));

    if (nvs_get_string(DEVICE_CERT_PEM_KEY, device_cert, sizeof(device_cert)) != ESP_OK ||
        nvs_get_string(DEVICE_KEY_PEM_KEY,  device_key,  sizeof(device_key))  != ESP_OK) {
        ESP_LOGE(TAG, "Missing device cert/key in NVS; cannot send mTLS report");
        memset(device_key, 0, sizeof(device_key));
        return ESP_ERR_NOT_FOUND;
    }

    // todo outsource config parsing
    uint32_t version = 0;
    char config_json[256] = {0};

    if (nvs_get_string(DEVICE_CONFIG_JSON_KEY, config_json, sizeof(config_json)) == ESP_OK) {
        char *vptr = strstr(config_json, "\"version\":");
        if (vptr) {
            version = (uint32_t)atoi(vptr + 10);
        }
    }

    // protect against buffer overflow by limiting URL length
    char url[160];
    snprintf(url, sizeof(url), "https://%s:%d/api/device/mtls/report",
             backend_hostname, BACKEND_MTLS_PORT);
    ESP_LOGI(TAG, "POST %s", url);

    
    char payload[64];
    snprintf(payload, sizeof(payload),
             "{\"version\":%lu}", (unsigned long)version);

    esp_err_t err = backend_request(
        url, "mtls report",
        HTTP_METHOD_POST,
        (const char *)server_pem_start,
        device_cert,
        device_key,
        "application/json",
        payload,
        response,
        sizeof(response)
    );

    memset(device_key, 0, sizeof(device_key));

    if (err != ESP_OK) {
        return err;
    }

    if (strstr(response, "\"configChanged\":true") != NULL) {
        *config_changed = true;
        ESP_LOGI(TAG, "Server indicates config update required");
    }

    return ESP_OK;
}
