/**
 * @file indoor_location_sensor.c
 * @brief Reads nearby BLE beacons and returns matched indoor-location data.
 */

#include "indoor_location_sensor.h"

#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"
#include "host/ble_gap.h"
#include "host/ble_hs.h"
#include "host/ble_hs_adv.h"
#include "host/util/util.h"
#include "nimble/nimble_port.h"
#include "nimble/nimble_port_freertos.h"

#include <stdbool.h>
#include <stdio.h>
#include <string.h>

#define TAG "indoor_location_sensor"

#define BLE_READY_BIT BIT0
#define BLE_SCAN_DONE_BIT BIT1
#define BLE_WAIT_TIMEOUT_MS 2000
#define INDOOR_LOCATION_SCAN_DURATION_SECONDS 30

static EventGroupHandle_t ble_events;
static indoor_location_sensor_reading_t *active_reading;
static const indoor_location_config_t *active_config;
static int active_rssi_sums[INDOOR_LOCATION_SENSOR_MAX_MATCHES];
static uint16_t active_sample_counts[INDOOR_LOCATION_SENSOR_MAX_MATCHES];
static uint8_t own_addr_type;
static int sync_rc;
static bool ble_ready = false;

static void ble_host_task(void *param)
{
    (void)param;
    nimble_port_run();
    nimble_port_freertos_deinit();
}

static void format_mac(const uint8_t *addr, char *out, size_t out_len)
{
    snprintf(out, out_len, "%02X:%02X:%02X:%02X:%02X:%02X",
             addr[5], addr[4], addr[3], addr[2], addr[1], addr[0]);
}

static bool is_allowed_mac(const uint8_t *addr)
{
    if (active_config == NULL)
    {
        return false;
    }

    char mac[18];
    format_mac(addr, mac, sizeof(mac));

    for (size_t i = 0; i < active_config->beacon_mac_count; i++)
    {
        if (strcasecmp(mac, active_config->beacon_mac_addresses[i]) == 0)
        {
            return true;
        }
    }

    return false;
}

static int average_rssi(int sum, uint16_t count)
{
    if (count == 0)
    {
        return 0;
    }

    if (sum >= 0)
    {
        return (sum + (int)(count / 2)) / (int)count;
    }

    return (sum - (int)(count / 2)) / (int)count;
}

static void upsert_match(const uint8_t *addr, int rssi)
{
    if (active_reading == NULL)
    {
        return;
    }

    char mac[18];
    format_mac(addr, mac, sizeof(mac));

    for (size_t i = 0; i < active_reading->match_count; i++)
    {
        if (strcmp(active_reading->matches[i].id, mac) == 0)
        {
            active_rssi_sums[i] += rssi;
            active_sample_counts[i]++;
            active_reading->matches[i].signal_strength_dbm = average_rssi(
                active_rssi_sums[i],
                active_sample_counts[i]);
            return;
        }
    }

    if (active_reading->match_count >= INDOOR_LOCATION_SENSOR_MAX_MATCHES)
    {
        return;
    }

    indoor_location_sensor_match_t *match = &active_reading->matches[active_reading->match_count++];
    snprintf(match->id, sizeof(match->id), "%s", mac);
    active_rssi_sums[active_reading->match_count - 1] = rssi;
    active_sample_counts[active_reading->match_count - 1] = 1;
    match->signal_strength_dbm = rssi;
}

static void on_sync(void)
{
    sync_rc = ble_hs_util_ensure_addr(0);
    if (sync_rc == 0)
    {
        sync_rc = ble_hs_id_infer_auto(0, &own_addr_type);
    }

    xEventGroupSetBits(ble_events, BLE_READY_BIT);
}

static int gap_event(struct ble_gap_event *event, void *arg)
{
    (void)arg;

    if (event->type == BLE_GAP_EVENT_DISC_COMPLETE)
    {
        xEventGroupSetBits(ble_events, BLE_SCAN_DONE_BIT);
        return 0;
    }

    if (event->type != BLE_GAP_EVENT_DISC || !is_allowed_mac(event->disc.addr.val))
    {
        return 0;
    }

    struct ble_hs_adv_fields fields;
    if (ble_hs_adv_parse_fields(&fields, event->disc.data, event->disc.length_data) != 0)
    {
        return 0;
    }

    bool saw_ibeacon = fields.mfg_data &&
                       fields.mfg_data_len >= 4 &&
                       fields.mfg_data[0] == 0x4C &&
                       fields.mfg_data[1] == 0x00 &&
                       fields.mfg_data[2] == 0x02 &&
                       fields.mfg_data[3] == 0x15;

    if (active_reading != NULL)
    {
        upsert_match(event->disc.addr.val, event->disc.rssi);
        active_reading->saw_ibeacon = active_reading->saw_ibeacon || saw_ibeacon;
    }

    return 0;
}

static esp_err_t indoor_location_sensor_init(void)
{
    if (ble_ready)
    {
        return ESP_OK;
    }

    if (ble_events == NULL)
    {
        ble_events = xEventGroupCreate();
        if (ble_events == NULL)
        {
            return ESP_ERR_NO_MEM;
        }
    }

    esp_err_t err = nimble_port_init();
    if (err != ESP_OK)
    {
        return err;
    }

    sync_rc = 0;
    ble_hs_cfg.sync_cb = on_sync;
    xEventGroupClearBits(ble_events, BLE_READY_BIT);
    nimble_port_freertos_init(ble_host_task);

    EventBits_t bits = xEventGroupWaitBits(ble_events,
                                           BLE_READY_BIT,
                                           pdTRUE,
                                           pdFALSE,
                                           pdMS_TO_TICKS(BLE_WAIT_TIMEOUT_MS));
    if ((bits & BLE_READY_BIT) == 0)
    {
        return ESP_ERR_TIMEOUT;
    }

    if (sync_rc != 0)
    {
        return ESP_FAIL;
    }

    ble_ready = true;
    return ESP_OK;
}

esp_err_t indoor_location_sensor_read(
    const indoor_location_config_t *config,
    indoor_location_sensor_reading_t *reading)
{
    if (config == NULL || reading == NULL)
    {
        return ESP_ERR_INVALID_ARG;
    }

    esp_err_t err = indoor_location_sensor_init();
    if (err != ESP_OK)
    {
        return err;
    }

    memset(reading, 0, sizeof(*reading));
    memset(active_rssi_sums, 0, sizeof(active_rssi_sums));
    memset(active_sample_counts, 0, sizeof(active_sample_counts));
    active_config = config;
    active_reading = reading;

    struct ble_gap_disc_params scan_params = {
        .itvl = 0x50,
        .window = 0x50,
        .filter_policy = 0,
        .limited = 0,
        .passive = 0,
        .filter_duplicates = 0,
    };

    xEventGroupClearBits(ble_events, BLE_SCAN_DONE_BIT);
    int rc = ble_gap_disc(own_addr_type,
                          INDOOR_LOCATION_SCAN_DURATION_SECONDS * 1000,
                          &scan_params,
                          gap_event,
                          NULL);
    if (rc != 0)
    {
        active_config = NULL;
        active_reading = NULL;
        return ESP_FAIL;
    }

    EventBits_t bits = xEventGroupWaitBits(
        ble_events,
        BLE_SCAN_DONE_BIT,
        pdTRUE,
        pdFALSE,
        pdMS_TO_TICKS(INDOOR_LOCATION_SCAN_DURATION_SECONDS * 1000 + BLE_WAIT_TIMEOUT_MS));
    active_config = NULL;
    active_reading = NULL;

    if ((bits & BLE_SCAN_DONE_BIT) == 0)
    {
        ble_gap_disc_cancel();
        return ESP_ERR_TIMEOUT;
    }

    return ESP_OK;
}
