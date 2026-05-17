# Thesis Project Repository

This repository contains the full stack for the thesis project:

- `01_Frontend`: web frontend
- `02_Backend`: backend API and database setup
- `03_Sensors`: ESP firmware and device provisioning tools
- `04_Deployment_Files`: deployment configuration
- `05_Documentation`: project documentation, including the thesis and the thesis video

## Folder Structure

```text
.
├── 01_Frontend/
│   └── src/
├── 02_Backend/
│   ├── db/
│   ├── drizzle/
│   └── src/
├── 03_Sensors/
│   ├── ESP/
│   └── device-provisioning/
├── 04_Deployment_Files/
├── 05_Documentation/
└── README.md
```

## Documentation Map
Frontend, Backend and Sensor Firmware have individual README files for more specific details.

### Frontend

- [`01_Frontend/README.md`](01_Frontend/README.md): frontend-specific setup and development notes

### Backend

- [`02_Backend/README.md`](02_Backend/README.md): backend setup, database setup, certificates, Caddy, and backend-side device certificate requirements

### Sensors and Provisioning

- [`03_Sensors/ESP/README.md`](03_Sensors/ESP/README.md): ESP firmware notes, certificate provisioning flow, and AP provisioning
- [`03_Sensors/device-provisioning/README.md`](03_Sensors/device-provisioning/README.md): host-side provisioning scripts for issuing certificates, registering them in the backend, and sending them to the device


## Adding a Sensor
This is a note for future maintainers. It aims to guide a developer through the process of adding a new sensor to the system.

Adding support for a new sensor usually touches both the backend and the ESP firmware. The backend defines the configuration and event contract, and the ESP implements the actual sensor handling and emits payloads that match that contract.

1. Define the sensor configuration shape and event payload shape on the backend.
2. Extend the ESP device configuration model so it can parse, store, and reload that sensor configuration from NVS.
3. Implement the sensor-specific firmware logic and event generation on the ESP.
4. Validate that the backend config sent to the device matches the ESP parser.
5. If the new sensor should be visible in the UI or notifications, update the frontend separately.
