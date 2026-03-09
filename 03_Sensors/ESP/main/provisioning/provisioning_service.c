/**
 * Provisioning service:
 * - HTTPS provisioning (SoftAP + HTTPS server)
 * - Certificate provisioning (CSR generation and cert storage)
 */

#include "provisioning_service.h"
#include "cert_helper.h"
#include "app_config.h"
#include "app_context.h"
#include "nvs_helper.h"
#include "nvs.h"

#include "esp_log.h"
#include "esp_err.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "esp_wifi.h"

#include "esp_https_server.h"
#include "esp_http_server.h"

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include <string.h>
#include <stdio.h>
#include <stdlib.h>

static const char *TAG = "prov_service";

extern const unsigned char prov_server_crt_start[] asm("_binary_prov_server_crt_start");
extern const unsigned char prov_server_crt_end[]   asm("_binary_prov_server_crt_end");
extern const unsigned char prov_server_key_start[] asm("_binary_prov_server_key_start");
extern const unsigned char prov_server_key_end[]   asm("_binary_prov_server_key_end");

static httpd_handle_t server = NULL;
static char ap_ssid[33];
static const char *ap_pass;
static uint8_t ap_channel;
static uint8_t max_sta_conn;
static const char *ssid_key;
static const char *password_key;
static const char *host_key;

/**
 * @brief HTTP handler for root path. Provides form to input configuration.
 *
 * @param req Incoming HTTP request
 * @return ESP_OK on success; ESP_FAIL if the response could not be sent.
 * @retval ESP_OK   Response sent successfully
 * @retval ESP_FAIL Response send failed
 */
static esp_err_t handle_root(httpd_req_t *req)
{
    static const char *html =
        "<!doctype html><html><head>"
        "<meta charset='utf-8'/>"
        "<meta name='viewport' content='width=device-width,initial-scale=1'/>"
        "<title>Setup</title></head><body>"
        "<h2>Device setup</h2>"
        "<form method='POST' action='/set'>"
        "WiFi SSID<br><input name='ssid' maxlength='32' required><br><br>"
        "Password<br><input name='password' type='password' maxlength='64'><br><br>"
        "Server Host / IP<br><input name='host' maxlength='63' required><br><br>"
        "<button type='submit'>Save</button>"
        "</form></body></html>";

    httpd_resp_set_type(req, "text/html");
    return httpd_resp_send(req, html, HTTPD_RESP_USE_STRLEN);
}

/**
 * @brief Parse provisioning form data and store it in NVS.
 *
 * @param req Incoming HTTP request
 * @return ESP_OK on success; ESP_FAIL on validation, storage, or response error.
 * @retval ESP_OK   Provisioning data stored and response sent
 * @retval ESP_FAIL Invalid request data or response send failed
 */
static esp_err_t handle_set(httpd_req_t *req)
{
    char body[512];
    int len = httpd_req_recv(req, body, sizeof(body) - 1);
    if (len <= 0) {
        httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "Empty body");
        return ESP_FAIL;
    }
    body[len] = 0;

    char ssid[33] = {0};
    char pass[65] = {0};
    char host[64] = {0};

    if (httpd_query_key_value(body, "ssid", ssid, sizeof(ssid)) != ESP_OK ||
        httpd_query_key_value(body, "host", host, sizeof(host)) != ESP_OK ||
        ssid[0] == 0 || host[0] == 0)
    {
        httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "Missing ssid or host");
        return ESP_FAIL;
    }

    httpd_query_key_value(body, "password", pass, sizeof(pass));

    ESP_LOGI(TAG, "Received provisioning data. ssid=%s host=%s", ssid, host);
    esp_err_t ssid_err = nvs_set_string(ssid_key, ssid);
    esp_err_t pass_err = nvs_set_string(password_key, pass);
    esp_err_t host_err = nvs_set_string(host_key, host);

    ESP_LOGI(TAG, "NVS write result: ssid=%s host=%s pass=%s",
             esp_err_to_name(ssid_err),
             esp_err_to_name(host_err),
             esp_err_to_name(pass_err));

    char resp[256];
    snprintf(resp, sizeof(resp),
             "Wifi and Server information was received. "
             "The device will stop provisioning mode in %d s and connect to the entered "
             "Wifi and server. "
             "If there are connectivity issues, consider activating the provisioning "
             "mode again and input correct device details.",
             PROV_HTTPS_STOP_DELAY_SEC);

    httpd_resp_set_type(req, "text/plain");
    esp_err_t send_err = httpd_resp_send(req, resp, HTTPD_RESP_USE_STRLEN);
    provisioning_service_https_stop();
    return send_err;
}

static const httpd_uri_t uri_root = {
    .uri = "/",
    .method = HTTP_GET,
    .handler = handle_root
};

static const httpd_uri_t uri_set = {
    .uri = "/set",
    .method = HTTP_POST,
    .handler = handle_set
};

/**
 * @brief Start a SoftAP for provisioning.
 *
 * @param c Provisioning AP configuration
 * @return ESP_OK on success; ESP_FAIL otherwise.
 * @retval ESP_OK   SoftAP started
 * @retval ESP_FAIL SoftAP start failed (details logged)
 */
static esp_err_t start_softap(void)
{
    esp_err_t err = esp_netif_init();
    if (err != ESP_OK && err != ESP_ERR_INVALID_STATE)
    {
        ESP_LOGE(TAG, "esp_netif_init failed: %s", esp_err_to_name(err));
        return ESP_FAIL;
    }

    err = esp_event_loop_create_default();
    if (err != ESP_OK && err != ESP_ERR_INVALID_STATE)
    {
        ESP_LOGE(TAG, "esp_event_loop_create_default failed: %s", esp_err_to_name(err));
        return ESP_FAIL;
    }

    if (!esp_netif_create_default_wifi_ap())
    {
        ESP_LOGE(TAG, "esp_netif_create_default_wifi_ap failed");
        return ESP_FAIL;
    }

    wifi_init_config_t wcfg = WIFI_INIT_CONFIG_DEFAULT();
    err = esp_wifi_init(&wcfg);
    if (err != ESP_OK && err != ESP_ERR_INVALID_STATE)
    {
        ESP_LOGE(TAG, "esp_wifi_init failed: %s", esp_err_to_name(err));
        return ESP_FAIL;
    }

    wifi_config_t ap = {0};
    strncpy((char *)ap.ap.ssid, ap_ssid, sizeof(ap.ap.ssid));
    strncpy((char *)ap.ap.password, ap_pass, sizeof(ap.ap.password));
    ap.ap.ssid_len = strlen(ap_ssid);
    ap.ap.channel = ap_channel;
    ap.ap.max_connection = max_sta_conn;
    ap.ap.authmode = (ap_pass[0] == 0) ? WIFI_AUTH_OPEN : WIFI_AUTH_WPA2_PSK;

    err = esp_wifi_set_mode(WIFI_MODE_AP);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "esp_wifi_set_mode failed: %s", esp_err_to_name(err));
        return ESP_FAIL;
    }
    err = esp_wifi_set_config(WIFI_IF_AP, &ap);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "esp_wifi_set_config failed: %s", esp_err_to_name(err));
        return ESP_FAIL;
    }
    err = esp_wifi_start();
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "esp_wifi_start failed: %s", esp_err_to_name(err));
        return ESP_FAIL;
    }

    ESP_LOGI(TAG, "AP ready: https://192.168.4.1/");
    return ESP_OK;
}

/**
 * @brief Start the HTTPS server and register provisioning handlers.
 *
 * @return ESP_OK on success; ESP_FAIL otherwise.
 * @retval ESP_OK   HTTPS server started
 * @retval ESP_FAIL HTTPS server start failed (details logged)
 */
static esp_err_t start_https(void)
{
    httpd_ssl_config_t conf = HTTPD_SSL_CONFIG_DEFAULT();
    conf.servercert = (const unsigned char *)prov_server_crt_start;
    conf.servercert_len = prov_server_crt_end - prov_server_crt_start;
    conf.prvtkey_pem = (const unsigned char *)prov_server_key_start;
    conf.prvtkey_len = prov_server_key_end - prov_server_key_start;

    esp_err_t err = httpd_ssl_start(&server, &conf);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "httpd_ssl_start failed: %s", esp_err_to_name(err));
        return ESP_FAIL;
    }

    httpd_register_uri_handler(server, &uri_root);
    httpd_register_uri_handler(server, &uri_set);

    return ESP_OK;
}

esp_err_t provisioning_service_https_start(void)
{
    if (server) return ESP_OK;

    ap_pass = PROV_AP_PASS;
    ap_channel = PROV_AP_CHANNEL;
    max_sta_conn = PROV_AP_MAX_STA_CONN;
    ssid_key = WIFI_SSID_KEY;
    password_key = WIFI_PASSWORD_KEY;
    host_key = BACKEND_HOST_KEY;

    char *device_name = app_context_device_name();
    snprintf(ap_ssid, sizeof(ap_ssid), "%s%s", PROV_AP_SSID_PREFIX, device_name);

    if (start_softap() != ESP_OK)
    {
        ESP_LOGE(TAG, "SoftAP start failed");
        return ESP_FAIL;
    }

    if (start_https() != ESP_OK)
    {
        ESP_LOGE(TAG, "HTTPS server start failed");
        return ESP_FAIL;
    }

    return ESP_OK;
}

esp_err_t provisioning_service_https_stop(void)
{
    esp_err_t result = ESP_OK;

    if (server) {
        esp_err_t err = httpd_ssl_stop(server);
        if (err != ESP_OK)
        {
            ESP_LOGE(TAG, "httpd_ssl_stop failed: %s", esp_err_to_name(err));
            result = ESP_FAIL;
        }
        server = NULL;
    }

    esp_err_t err = esp_wifi_stop();
    if (err != ESP_OK && err != ESP_ERR_WIFI_NOT_INIT && err != ESP_ERR_WIFI_NOT_STARTED)
    {
        ESP_LOGE(TAG, "esp_wifi_stop failed: %s", esp_err_to_name(err));
        result = ESP_FAIL;
    }
    memset(ap_ssid, 0, sizeof(ap_ssid));
    ap_pass = NULL;
    ap_channel = 0;
    max_sta_conn = 0;
    ssid_key = NULL;
    password_key = NULL;
    host_key = NULL;

    return result;
}

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

esp_err_t provisioning_service_cert_generate_csr(const char *device_cn, bool force_csr)
{
    if (!device_cn || device_cn[0] == '\0')
    {
        ESP_LOGE(TAG, "Device CN not provided");
        return ESP_FAIL;
    }

    unsigned char *key_pem = (unsigned char *)malloc(DEVICE_PEM_BUF_SIZE);
    unsigned char *csr_pem = (unsigned char *)malloc(DEVICE_PEM_BUF_SIZE);
    if (!key_pem || !csr_pem)
    {
        free(key_pem);
        free(csr_pem);
        ESP_LOGE(TAG, "Failed to allocate CSR buffers");
        return ESP_FAIL;
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

    if (have_key)
    {
        ESP_LOGI(TAG, "Using existing keypair from NVS to generate CSR.");
        if (cert_helper_gen_csr_from_key_pem(device_cn,
                                             key_pem, strlen((char *)key_pem) + 1,
                                             csr_pem, DEVICE_PEM_BUF_SIZE) != ESP_OK)
        {
            ESP_LOGE(TAG, "cert_helper_gen_csr_from_key_pem failed");
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

        if (cert_helper_gen_key_and_csr_pem(device_cn,
                                            key_pem, DEVICE_PEM_BUF_SIZE,
                                            csr_pem, DEVICE_PEM_BUF_SIZE) != ESP_OK)
        {
            ESP_LOGE(TAG, "cert_helper_gen_key_and_csr_pem failed");
            free(key_pem);
            free(csr_pem);
            return ESP_FAIL;
        }

        if (nvs_set_string(DEVICE_KEY_PEM_KEY, (const char *)key_pem) != ESP_OK)
        {
            ESP_LOGE(TAG, "nvs_set_string failed while storing key");
            free(key_pem);
            free(csr_pem);
            return ESP_FAIL;
        }
    }

    printf("%s", (const char *)csr_pem);
    free(key_pem);
    free(csr_pem);
    return ESP_OK;
}

bool provisioning_service_cert_exists(void)
{
    if (nvs_init() != ESP_OK)
        return false;
    nvs_handle_t h;
    esp_err_t err = nvs_open("storage", NVS_READONLY, &h);
    if (err != ESP_OK)
        return false;

    size_t required = 0;
    err = nvs_get_str(h, DEVICE_CERT_PEM_KEY, NULL, &required);
    nvs_close(h);

    return (err == ESP_OK && required > 1);
}

void provisioning_service_cert_print_from_nvs(void)
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

void provisioning_service_cert_read_and_store(void)
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
