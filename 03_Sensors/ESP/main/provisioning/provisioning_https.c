/**
 * This file provides all wifi provisioning functionality the ESPs need to get information about the Wifi and the main backend server.
 * - Creates AP and HTTPS endpoint 
 * - Accepts post via html form containing SSID, pw and backend hostname/ip
 *  
 */ 

#include "app_config.h"
#include "provisioning_https.h"

#include <string.h>
#include <stdio.h>

#include "esp_log.h"
#include "esp_err.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "esp_wifi.h"

#include "esp_https_server.h"
#include "esp_http_server.h"
#include "nvs_helper.h"

static const char *TAG = "prov";

extern const unsigned char prov_server_crt_start[] asm("_binary_prov_server_crt_start");
extern const unsigned char prov_server_crt_end[]   asm("_binary_prov_server_crt_end");
extern const unsigned char prov_server_key_start[] asm("_binary_prov_server_key_start");
extern const unsigned char prov_server_key_end[]   asm("_binary_prov_server_key_end");

static httpd_handle_t server = NULL;
static provisioning_https_config_t cfg;

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
    esp_err_t ssid_err = nvs_set_string(cfg.ssid_key, ssid);
    esp_err_t pass_err = nvs_set_string(cfg.password_key, pass);
    esp_err_t host_err = nvs_set_string(cfg.host_key, host);

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
    provisioning_https_stop();
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

static esp_err_t start_softap(const provisioning_https_config_t *c)
{
    esp_netif_init();
    esp_event_loop_create_default();
    esp_netif_create_default_wifi_ap();

    wifi_init_config_t wcfg = WIFI_INIT_CONFIG_DEFAULT();
    esp_wifi_init(&wcfg);

    wifi_config_t ap = {0};
    strncpy((char *)ap.ap.ssid, c->ap_ssid, sizeof(ap.ap.ssid));
    strncpy((char *)ap.ap.password, c->ap_pass, sizeof(ap.ap.password));
    ap.ap.ssid_len = strlen(c->ap_ssid);
    ap.ap.channel = c->ap_channel;
    ap.ap.max_connection = c->max_sta_conn;
    ap.ap.authmode = (c->ap_pass[0] == 0) ? WIFI_AUTH_OPEN : WIFI_AUTH_WPA2_PSK;

    esp_wifi_set_mode(WIFI_MODE_AP);
    esp_wifi_set_config(WIFI_IF_AP, &ap);
    esp_wifi_start();

    ESP_LOGI(TAG, "AP ready: https://192.168.4.1/");
    return ESP_OK;
}

static esp_err_t start_https(void)
{
    httpd_ssl_config_t conf = HTTPD_SSL_CONFIG_DEFAULT();
    conf.servercert = (const unsigned char *)prov_server_crt_start;
    conf.servercert_len = prov_server_crt_end - prov_server_crt_start;
    conf.prvtkey_pem = (const unsigned char *)prov_server_key_start;
    conf.prvtkey_len = prov_server_key_end - prov_server_key_start;

    esp_err_t err = httpd_ssl_start(&server, &conf);
    if (err != ESP_OK) return err;

    httpd_register_uri_handler(server, &uri_root);
    httpd_register_uri_handler(server, &uri_set);

    return ESP_OK;
}

esp_err_t provisioning_https_start(void)
{
    if (server) return ESP_OK;

    cfg = (provisioning_https_config_t){
        .ap_ssid = PROV_AP_SSID,
        .ap_pass = PROV_AP_PASS,
        .ap_channel = PROV_AP_CHANNEL,
        .max_sta_conn = PROV_AP_MAX_STA_CONN,
        .ssid_key = WIFI_SSID_KEY,
        .password_key = WIFI_PASSWORD_KEY,
        .host_key = BACKEND_HOST_KEY,
    };

    start_softap(&cfg);
    return start_https();
}

esp_err_t provisioning_https_stop(void)
{
    if (server) {
        httpd_ssl_stop(server);
        server = NULL;
    }

    esp_wifi_stop();
    memset(&cfg, 0, sizeof(cfg));

    return ESP_OK;
}
