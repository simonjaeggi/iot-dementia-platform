#include "onsite_provisioning_service.h"
#include "app_config.h"
#include "app_context.h"
#include "nvs_helper.h"

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

static const char *TAG = "onsite_prov_service";

extern const unsigned char prov_server_crt_start[] asm("_binary_prov_server_crt_start");
extern const unsigned char prov_server_crt_end[] asm("_binary_prov_server_crt_end");
extern const unsigned char prov_server_key_start[] asm("_binary_prov_server_key_start");
extern const unsigned char prov_server_key_end[] asm("_binary_prov_server_key_end");

static httpd_handle_t server = NULL;
static char ap_ssid[33];
static const char *ap_pass;
static uint8_t ap_channel;
static uint8_t max_sta_conn;
static const char *ssid_key;
static const char *password_key;
static const char *host_key;

/**
 * @brief HTTP handler for the root path that serves the provisioning form.
 *
 * @param req Incoming HTTP request.
 * @return Error code returned by httpd_resp_send().
 * @retval ESP_OK Response sent successfully.
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
 * @brief Parse provisioning form data and store it in NVS. Reboots the device once NVS is written.
 *
 * @param req Incoming HTTP request.
 * @return Error code describing the request result.
 * @retval ESP_OK Provisioning data was stored and the response was sent.
 * @retval ESP_FAIL Request validation, storage, or response sending failed.
 */
static esp_err_t handle_set(httpd_req_t *req)
{
    char body[512];
    int len = httpd_req_recv(req, body, sizeof(body) - 1);
    if (len <= 0)
    {
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

    if (!ssid_err && !pass_err && !host_err)
    {
        snprintf(resp, sizeof(resp),
                 "Wifi and Server information was received and stored successfully. "
                 "The device will reboot in %d s and connect to the entered Wifi. "
                 "If there are connectivity issues, consider activating the provisioning "
                 "mode again and input correct device details.",
                 PROV_HTTPS_STOP_DELAY_SEC);
    }
    else
    {
        snprintf(resp, sizeof(resp),
                 "Failed to store Wifi and Server information. "
                 "The device will reboot itself in %d s. Please wait %d s and try again. ",
                 PROV_HTTPS_STOP_DELAY_SEC, PROV_HTTPS_STOP_DELAY_SEC+30);
    }

    httpd_resp_set_type(req, "text/plain");
    esp_err_t send_err = httpd_resp_send(req, resp, HTTPD_RESP_USE_STRLEN);

    vTaskDelay(pdMS_TO_TICKS(PROV_HTTPS_STOP_DELAY_SEC * 1000));
    esp_restart();
    return send_err;
}

static const httpd_uri_t uri_root = {
    .uri = "/",
    .method = HTTP_GET,
    .handler = handle_root};

static const httpd_uri_t uri_set = {
    .uri = "/set",
    .method = HTTP_POST,
    .handler = handle_set};

/**
 * @brief Start a SoftAP for provisioning.
 *
 * @retval ESP_OK SoftAP started successfully.
 * @retval ESP_FAIL SoftAP startup failed.
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
 * @retval ESP_OK HTTPS server started successfully.
 * @retval ESP_FAIL HTTPS server startup failed.
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

esp_err_t start_https_and_softap(void)
{
    if (server)
        return ESP_OK;

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
