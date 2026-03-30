#pragma once

// if set, prompt for a new certificate, even if one is found in NVS
#define PROV_CERT_OVERWRITE 0
// if set, force a new CSR even if a cert already exists
#define PROV_CSR_OVERWRITE 0
// if set, start HTTPS provisioning even if config already exists
#define PROV_HTTPS_FORCE_START 0


#define PROV_HTTPS_STOP_DELAY_SEC 30
#define PROV_AP_SSID_PREFIX "SENSOR_CONF_"
#define PROV_AP_PASS "test_esp"
#define PROV_AP_CHANNEL 1
#define PROV_AP_MAX_STA_CONN 2
#define PROV_CERT_READ_TIMEOUT_MS 120000

// Wifi
// On disconnect attempt WIFI_RECON_ATTEMPTS times
// If 0, run try forever.
#define WIFI_RECON_ATTEMPTS 0

// NVS
#define WIFI_SSID_KEY "WIFI_SSID"
#define WIFI_PASSWORD_KEY "WIFI_PW"
#define BACKEND_HOST_KEY "BACKEND"
#define DEVICE_NAME_KEY "DEVICE_NAME"
#define BOOT_ID_KEY "BOOT_ID"
#define DEVICE_CERT_PEM_KEY "DEV_CERT_PEM"
#define DEVICE_KEY_PEM_KEY "DEV_KEY_PEM"
#define DEVICE_CONFIG_JSON_KEY "DEV_CFG_JSON"

// Important buffers
#define DEVICE_PEM_BUF_SIZE 4096
#define DEVICE_CONFIG_JSON_BUF_SIZE 2048
#define EVENT_BUFFER_CAPACITY_BYTES (64 * 1024)

#define MAX_EVENT_SIZE_BYTES 512
// Backend
#define BACKEND_HTTPS_PORT 443
#define BACKEND_MTLS_PORT 8443
#define REPORT_INTERVAL_MS 5000

// Device name
#define DEVICE_NAME_FORMAT "esp-%d"
#define DEVICE_NAME_MAX_LEN 16

// Events
#define EVENT_BUFFER_SEND_TIMEOUT_MS 1000

// Wifi connectivity
#define WIFI_CONNECT_MAX_ATTEMPTS 10
#define WIFI_CONNECT_TIMEOUT_MS 30000
#define WIFI_CONNECT_RETRY_DELAY_MS 1000
