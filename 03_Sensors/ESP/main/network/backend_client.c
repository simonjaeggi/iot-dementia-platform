/**
 * @file backend_client.c
 * @brief Backend HTTP client helpers.
 */

#include "app_config.h"
#include "backend_client.h"
#include "cJSON.h"
#include "esp_http_client.h"
#include "esp_log.h"
#include <inttypes.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define TAG "backend-client"

extern const unsigned char server_pem_start[] asm("_binary_server_crt_start");

typedef struct
{
    char *buffer;
    size_t buffer_len;
    size_t used;
    bool truncated;
} backend_response_buffer_t;

static esp_err_t backend_http_event_handler(esp_http_client_event_t *evt)
{
    if (evt == NULL || evt->event_id != HTTP_EVENT_ON_DATA)
    {
        return ESP_OK;
    }

    backend_response_buffer_t *response = (backend_response_buffer_t *)evt->user_data;
    if (response == NULL || response->buffer == NULL || response->buffer_len == 0 ||
        evt->data == NULL || evt->data_len <= 0)
    {
        return ESP_OK;
    }

    size_t max_payload_len = response->buffer_len - 1;
    if (response->used >= max_payload_len)
    {
        response->truncated = true;
        return ESP_OK;
    }

    size_t copy_len = (size_t)evt->data_len;
    if (copy_len > max_payload_len - response->used)
    {
        copy_len = max_payload_len - response->used;
        response->truncated = true;
    }

    memcpy(response->buffer + response->used, evt->data, copy_len);
    response->used += copy_len;
    response->buffer[response->used] = '\0';

    return ESP_OK;
}

/**
 * @brief Perform an HTTPS request with optional mTLS credentials.
 *
 * The function may also return transport errors from
 * esp_http_client_perform().
 *
 * @param url Target URL.
 * @param label Label used for logging.
 * @param method HTTP method.
 * @param server_cert_pem Server certificate in PEM format used for TLS
 *     verification.
 * @param client_cert_pem Client certificate in PEM format, or NULL when mTLS is
 *     not used.
 * @param client_key_pem Client private key in PEM format, or NULL when mTLS is
 *     not used.
 * @param content_type Content-Type header value, or NULL when no request body is
 *     sent.
 * @param payload Request body, or NULL when no request body is sent.
 * @param payload_len Request body length in bytes.
 * @param resp_buf Output buffer for the response body.
 * @param resp_len Capacity of the response buffer in bytes.
 * @return Error code describing the request result.
 * @retval ESP_OK A 2xx HTTP response was received.
 * @retval ESP_ERR_INVALID_RESPONSE A non-2xx HTTP response was received.
 * @retval ESP_FAIL HTTP client initialization failed.
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
    // TODO: Ensure JSON payloads are built with proper escaping, for example
    // with cJSON.
    // TODO: Recheck whether the current snprintf-based request construction can
    // allow string injection in future call sites.
    backend_response_buffer_t response = {
        .buffer = resp_buf,
        .buffer_len = resp_len,
        .used = 0,
        .truncated = false,
    };

    if (resp_buf != NULL && resp_len > 0)
    {
        resp_buf[0] = '\0';
    }

    esp_http_client_config_t cfg = {
        .url = url,
        .method = method,
        .timeout_ms = 5000,
        .cert_pem = server_cert_pem,
        .client_cert_pem = client_cert_pem,
        .client_key_pem = client_key_pem,
        .event_handler = backend_http_event_handler,
        .user_data = (resp_buf != NULL && resp_len > 0) ? &response : NULL,
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

    if (resp_buf && resp_len > 0 && resp_buf[0] != '\0')
    {
        ESP_LOGI(TAG, "%s resp: %s", label, resp_buf);
    }

    if (response.truncated)
    {
        ESP_LOGW(TAG, "%s response truncated to %u bytes", label, (unsigned int)(resp_len - 1));
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

    cJSON *response_json = cJSON_Parse(response);
    if (response_json == NULL)
    {
        ESP_LOGW(TAG,
                 "Reported version %" PRIu32 ", backend returned invalid JSON report response: %s",
                 config_version,
                 response);
        return ESP_OK;
    }

    cJSON *config_changed_json = cJSON_GetObjectItemCaseSensitive(response_json, "configChanged");
    if (!cJSON_IsBool(config_changed_json))
    {
        ESP_LOGW(
            TAG,
            "Reported version %" PRIu32 ", backend did not confirm config status: %s",
            config_version,
            response);
        cJSON_Delete(response_json);
        return ESP_OK;
    }

    *config_changed = cJSON_IsTrue(config_changed_json);

    if (*config_changed)
    {
        ESP_LOGW(TAG,
                 "Reported version %" PRIu32 ", backend indicates config update required",
                 config_version);
    }
    else
    {
        ESP_LOGI(TAG,
                 "Reported version %" PRIu32 ", backend confirmed up to date",
                 config_version);
    }

    cJSON_Delete(response_json);

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
