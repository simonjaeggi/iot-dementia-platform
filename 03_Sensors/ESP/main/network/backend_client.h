#pragma once
#include "esp_err.h"
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/**
 * @brief Sends backend get request to fetch device config using HTTPs over mTLS.
 *
 * @param backend_hostname  hostname to connect to
 * @param device_cert_pem   client cert (PEM) for mTLS
 * @param device_key_pem    client key (PEM) for mTLS
 * @param out_buf           buffer to write output to
 * @param out_len           length of output buffer
 * 
 * @return ESP_OK on success; specific error codes otherwise.
 * @retval ESP_OK                   Returned 2xx HTTP response
 * @retval ESP_ERR_INVALID_ARG      Invalid arguments
 * @retval ESP_ERR_INVALID_RESPONSE Returned non 2xx HTTP response
 * @retval ESP_FAIL                 Request failed (details logged)
 */
esp_err_t backend_get_config(const char *backend_hostname,
                             const char *device_cert_pem,
                             const char *device_key_pem,
                             char *out_buf,
                             size_t out_len);
/**
 * @brief Sends backend post to report device alive and check for config change using HTTPs over mTLS.
 *
 * @param backend_hostname  hostname to connect to
 * @param device_cert_pem   client cert (PEM) for mTLS
 * @param device_key_pem    client key (PEM) for mTLS
 * @param config_version    current config version
 * @param config_changed    output flag buffer to indicate if device config is up to date
 * 
 * @return ESP_OK on success; specific error codes otherwise.
 * @retval ESP_OK                   Returned 2xx HTTP response
 * @retval ESP_ERR_INVALID_ARG      Invalid arguments
 * @retval ESP_ERR_INVALID_RESPONSE Returned non 2xx HTTP response
 * @retval ESP_FAIL                 Request failed (details logged)
 */
esp_err_t backend_post_report(const char *backend_hostname,
                              const char *device_cert_pem,
                              const char *device_key_pem,
                              uint32_t config_version,
                              bool *config_changed);
/**
 * @brief Sends backend post request to send a device event using HTTPs over mTLS.
 *
 * @param backend_hostname  hostname to connect to
 * @param device_cert_pem   client cert (PEM) for mTLS
 * @param device_key_pem    client key (PEM) for mTLS
 * @param payload           event payload
 * @param payload_len       event payload length in bytes
 * 
 * @return ESP_OK on success; specific error codes otherwise.
 * @retval ESP_OK                   Returned 2xx HTTP response
 * @retval ESP_ERR_INVALID_ARG      Invalid arguments
 * @retval ESP_ERR_INVALID_RESPONSE Returned non 2xx HTTP response
 * @retval ESP_FAIL                 Request failed (details logged)
 */
esp_err_t backend_post_event(const char *backend_hostname,
                             const char *device_cert_pem,
                             const char *device_key_pem,
                             const uint8_t *payload,
                             size_t payload_len);
