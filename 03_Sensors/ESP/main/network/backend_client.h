#pragma once
#include "esp_err.h"
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/**
 * @brief Fetch the device configuration from the backend over HTTPS with mTLS.
 *
 * @param backend_hostname Backend hostname.
 * @param device_cert_pem Client certificate in PEM format for mTLS.
 * @param device_key_pem Client private key in PEM format for mTLS.
 * @param out_buf Output buffer for the response body.
 * @param out_len Capacity of the output buffer in bytes.
 * @return Error code describing the request result.
 * @retval ESP_OK The backend returned a 2xx HTTP response.
 * @retval ESP_ERR_INVALID_ARG One or more arguments are invalid.
 * @retval ESP_ERR_INVALID_RESPONSE The backend returned a non-2xx HTTP response.
 * @retval ESP_FAIL HTTP client initialization failed.
 */
esp_err_t backend_get_config(const char *backend_hostname,
                             const char *device_cert_pem,
                             const char *device_key_pem,
                             char *out_buf,
                             size_t out_len);

/**
 * @brief Report device liveness and check for configuration changes over HTTPS
 * with mTLS.
 *
 * If the backend returns a 2xx response with an invalid or incomplete JSON
 * body, the function logs a warning, leaves *config_changed false, and
 * returns ESP_OK.
 *
 * @param backend_hostname Backend hostname.
 * @param device_cert_pem Client certificate in PEM format for mTLS.
 * @param device_key_pem Client private key in PEM format for mTLS.
 * @param config_version Current device configuration version.
 * @param config_changed Output flag set to true when the backend requires a
 *     configuration update.
 * @return Error code describing the request result.
 * @retval ESP_OK The backend returned a 2xx HTTP response.
 * @retval ESP_ERR_INVALID_ARG One or more arguments are invalid.
 * @retval ESP_ERR_INVALID_RESPONSE The backend returned a non-2xx HTTP response.
 * @retval ESP_FAIL HTTP client initialization failed.
 */
esp_err_t backend_post_report(const char *backend_hostname,
                              const char *device_cert_pem,
                              const char *device_key_pem,
                              uint32_t config_version,
                              bool *config_changed);

/**
 * @brief Send a device event to the backend over HTTPS with mTLS.
 *
 * @param backend_hostname Backend hostname.
 * @param device_cert_pem Client certificate in PEM format for mTLS.
 * @param device_key_pem Client private key in PEM format for mTLS.
 * @param payload Event payload.
 * @param payload_len Event payload length in bytes.
 * @return Error code describing the request result.
 * @retval ESP_OK The backend returned a 2xx HTTP response.
 * @retval ESP_ERR_INVALID_ARG One or more arguments are invalid.
 * @retval ESP_ERR_INVALID_RESPONSE The backend returned a non-2xx HTTP response.
 * @retval ESP_FAIL HTTP client initialization failed.
 */
esp_err_t backend_post_event(const char *backend_hostname,
                             const char *device_cert_pem,
                             const char *device_key_pem,
                             const uint8_t *payload,
                             size_t payload_len);
