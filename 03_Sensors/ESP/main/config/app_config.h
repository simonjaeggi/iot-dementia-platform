#pragma once

// If set, prompt for a new certificate even if one is found in NVS.
#define PROV_CERT_OVERWRITE 0
// If set, force a new CSR even if a certificate already exists.
#define PROV_CSR_OVERWRITE 0
// If set, print the currently stored device certificate from NVS during boot.
#define PROV_PRINT_NVS_CERT_ON_BOOT 0
// If set, start HTTPS provisioning even if configuration already exists.
#define PROV_HTTPS_FORCE_START 0


#define PROV_HTTPS_STOP_DELAY_SEC 30
#define PROV_AP_SSID_PREFIX "SENSOR_CONF_"
#define PROV_AP_PASS "test_esp"
#define PROV_AP_CHANNEL 1
#define PROV_AP_MAX_STA_CONN 2
#define PROV_CERT_READ_TIMEOUT_MS 120000

// Wi-Fi.
// On disconnect, attempt to reconnect up to WIFI_RECON_ATTEMPTS times.
// If 0, retry forever.
#define WIFI_RECON_ATTEMPTS 0

// NVS.
#define WIFI_SSID_KEY "WIFI_SSID"
#define WIFI_PASSWORD_KEY "WIFI_PW"
#define BACKEND_HOST_KEY "BACKEND"
#define DEVICE_NAME_KEY "DEVICE_NAME"
#define BOOT_ID_KEY "BOOT_ID"
#define DEVICE_CERT_PEM_KEY "DEV_CERT_PEM"
#define DEVICE_KEY_PEM_KEY "DEV_KEY_PEM"

// Device configuration NVS keys. These may need to change if counts increase
// because NVS keys are limited to 15 characters.
#define DEVICE_CONFIG_VERSION_KEY "DEV_CFG_VER"
#define DEVICE_CONFIG_SENSOR_COUNT_KEY "SENS_CNT"

#define DEVICE_CONFIG_SENSOR_ID_KEY_FMT "SEN%d_ID"
#define DEVICE_CONFIG_SENSOR_TYPE_KEY_FMT "SEN%d_TYPE"
#define DEVICE_CONFIG_SENSOR_PUBLISH_INTERVAL_MS_KEY_FMT "SEN%d_INT"

#define DEVICE_CONFIG_SENSOR_BEACON_MAC_COUNT_KEY_FMT "SEN%d_B_CNT"
#define DEVICE_CONFIG_SENSOR_BEACON_MAC_KEY_FMT "SEN%d_B%d"

#define DEVICE_CONFIG_SENSOR_I2C_SDA_PIN_KEY_FMT "SEN%d_SDA"
#define DEVICE_CONFIG_SENSOR_I2C_SCL_PIN_KEY_FMT "SEN%d_SCL"
#define DEVICE_CONFIG_SENSOR_GPIO_PIN_KEY_FMT "SEN%d_GPIO"
#define DEVICE_CONFIG_SENSOR_I2S_BCLK_PIN_KEY_FMT "SEN%d_BCLK"
#define DEVICE_CONFIG_SENSOR_I2S_LRCK_PIN_KEY_FMT "SEN%d_LRCK"
#define DEVICE_CONFIG_SENSOR_I2S_DIN_PIN_KEY_FMT "SEN%d_DIN"
#define DEVICE_CONFIG_SENSOR_POLL_INTERVAL_MS_KEY_FMT "SEN%d_POLL"
#define DEVICE_CONFIG_SENSOR_FALL_THRESHOLD_G_KEY_FMT "SEN%d_FALL"
#define DEVICE_CONFIG_SENSOR_NOISE_THRESHOLD_DB_KEY_FMT "SEN%d_NTHR"
#define DEVICE_CONFIG_SENSOR_DB_OFFSET_KEY_FMT "SEN%d_DBOF"

// Important buffers.
#define DEVICE_PEM_BUF_SIZE 4096
#define DEVICE_CONFIG_JSON_RECV_BUF_SIZE 2048
#define EVENT_BUFFER_CAPACITY_BYTES (64 * 1024)

#define MAX_EVENT_SIZE_BYTES 512
// Backend.
#define BACKEND_HTTPS_PORT 443
#define BACKEND_MTLS_PORT 8443
#define REPORT_INTERVAL_MS 30000

// Device name.
#define DEVICE_NAME_FMT "esp-%d"
#define DEVICE_NAME_MAX_LEN 16

// Events.
#define EVENT_BUFFER_SEND_TIMEOUT_MS 1000

// Wi-Fi connectivity.
#define WIFI_CONNECT_MAX_ATTEMPTS 10
#define WIFI_CONNECT_TIMEOUT_MS 30000
#define WIFI_CONNECT_RETRY_DELAY_MS 1000
#define WIFI_CONNECT_BACKOFF_DELAY_MS 30000

// Device configuration.
#define DEVICE_CFG_MAX_SENSORS 5
#define DEVICE_CFG_MAX_SENSOR_ID_LEN 17
#define DEVICE_CFG_MAX_BEACONS_PER_LOCATION_SENSOR 16
#define DEVICE_CFG_MAC_ADDRESS_STR_LEN 18
// If the device receives a corrupt configuration, it does not create an alert
// every time. To avoid flooding the backend, it creates one every N reports.
#define DEVICE_CFG_CORRUPT_SEND_EVENT_EVERY 50
