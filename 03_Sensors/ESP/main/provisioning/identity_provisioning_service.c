#include "identity_provisioning_service.h"
#include "cert_helper.h"
#include "app_config.h"
#include "nvs_helper.h"
#include "nvs.h"

#include "esp_log.h"
#include "esp_err.h"

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include <string.h>
#include <stdio.h>
#include <stdlib.h>

static const char *TAG = "identity_prov_service";

static bool read_pem_cert(char *out, size_t out_size)
{
    static const char BEGIN[] = "-----BEGIN CERTIFICATE-----";
    static const char END[] = "-----END CERTIFICATE-----";

    char line[256];
    size_t used = 0;
    bool capturing = false;

    if (!out || out_size == 0)
        return false;
    out[0] = 0;

    ESP_LOGW(TAG, "Paste certificate (PEM). Waiting for BEGIN (%ds)...", PROV_CERT_READ_TIMEOUT_MS / 1000);

    TickType_t start = xTaskGetTickCount();
    const TickType_t timeout = pdMS_TO_TICKS(PROV_CERT_READ_TIMEOUT_MS);

    while ((xTaskGetTickCount() - start) < timeout)
    {
        if (!fgets(line, sizeof line, stdin))
        {
            vTaskDelay(pdMS_TO_TICKS(50));
            continue;
        }

        if (!capturing)
        {
            if (!strstr(line, BEGIN))
                continue;
            capturing = true;
            start = xTaskGetTickCount();
        }

        size_t len = strlen(line);
        if (used + len + 1 >= out_size)
        {
            ESP_LOGE(TAG, "Buffer too small");
            return false;
        }

        memcpy(out + used, line, len);
        used += len;
        out[used] = 0;

        if (strstr(line, END))
        {
            ESP_LOGI(TAG, "END detected (%d bytes)", (int)used);
            return true;
        }
    }

    ESP_LOGE(TAG, "Timeout waiting for certificate");
    return false;
}

esp_err_t generate_csr(const char *device_cn, bool force_csr)
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
        if (gen_csr_from_key(device_cn,
                                             key_pem, strlen((char *)key_pem) + 1,
                                             csr_pem, DEVICE_PEM_BUF_SIZE) != ESP_OK)
        {
            ESP_LOGE(TAG, "gen_csr_from_key failed");
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

        if (gen_key_and_csr(device_cn,
                                            key_pem, DEVICE_PEM_BUF_SIZE,
                                            csr_pem, DEVICE_PEM_BUF_SIZE) != ESP_OK)
        {
            ESP_LOGE(TAG, "gen_key_and_csr failed");
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

bool cert_exists(void)
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

void print_cert_from_nvs(void)
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

void serial_read_and_store_cert(void)
{
    char *pem = malloc(DEVICE_PEM_BUF_SIZE);
    if (!pem)
    {
        ESP_LOGE(TAG, "malloc failed (read cert)");
        return;
    }

    ESP_LOGW(TAG, "Waiting for certificate input over serial.");

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
