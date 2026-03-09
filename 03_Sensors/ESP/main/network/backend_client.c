/**
 * @file backend_client.c
 * @brief This file handles HTTP requests and resposonses towards the backend.
 */

#include "app_config.h"
#include "backend_client.h"
#include "esp_http_client.h"
#include "esp_log.h"
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
 * @param payload_len       Message length in bytes, 0 if no message sent
 * @param resp_buf          response buffer
 * @param resp_len          response buffer length
 *
 * @return ESP_OK on success; specific error codes otherwise.
 * @retval ESP_OK                   Received 2xx HTTP response
 * @retval ESP_FAIL                 HTTP client not initialised
 * @retval ESP_ERR_INVALID_RESPONSE Received non 2xx HTTP response
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
    size_t payload_len,
    char *resp_buf,
    size_t resp_len)
{
    // todo Ensure JSON payloads are built with escaping (cJSON)
    // todo check if calling backend_request embedding can be used to inject strings with snprintf.
    esp_http_client_config_t cfg = {
        .url = url,
        .method = method,
        .timeout_ms = 5000,
        .cert_pem = server_cert_pem,
        .client_cert_pem = client_cert_pem,
        .client_key_pem = client_key_pem,
    };

    esp_http_client_handle_t client = esp_http_client_init(&cfg);
    if (!client)
    {
        ESP_LOGE(TAG, "%s init failed", label);
        return ESP_FAIL;
    }

    if (content_type)
    {
        esp_http_client_set_header(client, "Content-Type", content_type);
    }
    if (payload && payload_len > 0)
    {
        esp_http_client_set_post_field(client, payload, (int)payload_len);
    }

    esp_err_t err = esp_http_client_perform(client);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "%s perform failed: %s", label, esp_err_to_name(err));
        esp_http_client_cleanup(client);
        return err;
    }

    int status = esp_http_client_get_status_code(client);
    ESP_LOGI(TAG, "%s status: %d", label, status);

    if (resp_buf && resp_len > 0)
    {
        resp_buf[0] = 0;
    }

    char resp[256];
    int n = 0;
    size_t used = 0;
    while ((n = esp_http_client_read(client, resp, sizeof(resp) - 1)) > 0)
    {
        resp[n] = 0;
        ESP_LOGI(TAG, "%s resp: %s", label, resp);

        if (resp_buf && resp_len > 1 && used < resp_len - 1)
        {
            size_t copy_len = (size_t)n;
            if (copy_len > resp_len - 1 - used)
            {
                copy_len = resp_len - 1 - used;
            }
            memcpy(resp_buf + used, resp, copy_len);
            used += copy_len;
            resp_buf[used] = 0;
        }
    }

    esp_http_client_cleanup(client);

    if (status < 200 || status >= 300)
    {
        if (resp_buf && resp_buf[0] != 0)
        {
            ESP_LOGE(TAG, "%s HTTP %d body: %s", label, status, resp_buf);
        }
        else
        {
            ESP_LOGE(TAG, "%s HTTP %d (no body)", label, status);
        }
        return ESP_ERR_INVALID_RESPONSE; 
    }

    return ESP_OK;
}

esp_err_t backend_get_config(const char *backend_hostname,
                             const char *device_cert_pem,
                             const char *device_key_pem,
                             char *out_buf,
                             size_t out_len)
{
    if (!backend_hostname || !device_cert_pem || !device_key_pem || !out_buf || out_len == 0)
    {
        return ESP_ERR_INVALID_ARG;
    }

    char url[160];
    snprintf(url, sizeof(url), "https://%s:%d/api/device/mtls/config",
             backend_hostname, BACKEND_MTLS_PORT);
    ESP_LOGI(TAG, "GET %s", url);

    esp_err_t err = backend_request(
        url, "config",
        HTTP_METHOD_GET,
        (const char *)server_pem_start,
        device_cert_pem,
        device_key_pem,
        NULL,
        NULL,
        0,
        out_buf,
        out_len);
    return err;
}

esp_err_t backend_post_report(const char *backend_hostname,
                             const char *device_cert_pem,
                             const char *device_key_pem,
                             uint32_t config_version,
                             bool *config_changed)
{
    if (!backend_hostname || !device_cert_pem || !device_key_pem || !config_changed)
    {
        return ESP_ERR_INVALID_ARG;
    }

    *config_changed = false;

    char response[256] = {0};

    char url[160];
    snprintf(url, sizeof(url), "https://%s:%d/api/device/mtls/report",
             backend_hostname, BACKEND_MTLS_PORT);
    ESP_LOGI(TAG, "POST %s", url);

    char payload[64];
    snprintf(payload, sizeof(payload),
             "{\"version\":%lu}", (unsigned long)config_version);

    esp_err_t err = backend_request(
        url, "mtls report",
        HTTP_METHOD_POST,
        (const char *)server_pem_start,
        device_cert_pem,
        device_key_pem,
        "application/json",
        payload,
        strlen(payload),
        response,
        sizeof(response));

    if (err != ESP_OK)
    {
        return err;
    }

    if (strstr(response, "\"configChanged\":true") != NULL)
    {
        *config_changed = true;
        ESP_LOGI(TAG, "Server indicates config update required");
    }

    return ESP_OK;
}

esp_err_t backend_post_event(const char *backend_hostname,
                             const char *device_cert_pem,
                             const char *device_key_pem,
                             const uint8_t *payload,
                             size_t payload_len)
{
    if (!backend_hostname || !device_cert_pem || !device_key_pem || !payload || payload_len == 0)
    {
        return ESP_ERR_INVALID_ARG;
    }

    char url[160];
    snprintf(url, sizeof(url),
             "https://%s:%d/api/device/mtls/event",
             backend_hostname,
             BACKEND_MTLS_PORT);

    ESP_LOGI(TAG, "POST %s", url);

    esp_err_t err = backend_request(
        url,
        "event",
        HTTP_METHOD_POST,
        (const char *)server_pem_start,
        device_cert_pem,
        device_key_pem,
        "application/json",
        (const char *)payload,
        payload_len,
        NULL,
        0);

    return err;
}
