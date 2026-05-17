# Overview
Bun + Hono Backend connecting to a PostgreSQL database.

## Folder Structure

```text
.
├── db/
├── drizzle/
├── src/
│   ├── api/
│   ├── db/
│   ├── email/
│   ├── push/
│   ├── shared/
│   └── software-update/
├── Dockerfile
├── package.json
└── README.md
```

- `db`: local development database Docker Compose setup
- `drizzle`: database migrations
- `src/api`: HTTP routes, controllers and services
- `src/db`: database connection and schema
- `src/email`, `src/push`, `src/software-update`: external service integration


# Backend Setup
This is a setup guide that assumes the gateway and backend are running on the same machine. It uses the names and configuration parameters from the thesis deployment, which should be adjusted for the need of the situation for other deployments. 

## Requirements
- Bun
- Docker + Docker Compose
- Caddy

## Environment
Create `.env` in the project root (see [`.env.example`](.env.example)).

## Install Dependencies

```bash
bun install
```

## Database (Postgres + Drizzle) - Development Setup

Start the database:

```bash
bun run db:up
```
> If Linux complains about missing permissions, set them first:

```bash
sudo usermod -aG docker $USER
newgrp docker
```
Test the DB connection (replace DB information with .env parameters):

```bash
sudo apt update
sudo apt install -y postgresql-client

psql "postgresql://username:supersecretpgpw@localhost:5432/myapp_db" -c "SELECT 1;"

```


Apply migrations:

```bash
bunx drizzle-kit migrate
```

Stop the database:

```bash
bun run db:down
```

Delete the DB volume (deletes all data):

```bash
bun run db:delete
```

## Ntfy Setup (if self-hosted ntfy is used)
```bash
sudo docker run -v /var/cache/ntfy:/var/cache/ntfy -v /etc/ntfy:/etc/ntfy -p 127.0.0.1:8080:80 -itd binwiederhier/ntfy serve --cache-file /var/cache/ntfy/cache.db
```


## Keys, Certificates, and Caddy Setup
### Server Certificate (for TLS encryption)
```bash
mkdir -p ~/server-certs
cd ~/server-certs

openssl genrsa -out bscraspi.local.key 2048

openssl req -x509 -new -nodes \
  -key bscraspi.local.key \
  -sha256 \
  -days 3650 \
  -out bscraspi.local.crt \
  -subj "/CN=bscraspi.local"
```

### Device CA (for device client certificates)
```bash
mkdir -p ~/device-ca
cd ~/device-ca
openssl genrsa -out device-ca.key 4096
openssl req -x509 -new -nodes \
  -key device-ca.key \
  -sha256 \
  -days 3650 \
  -out device-ca.pem \
  -subj "/CN=BscThesis Device CA"
```

### Install and Set Up Caddy

Copy the certificates:
```bash
sudo mkdir -p /etc/caddy/certs
sudo cp ~/server-certs/bscraspi.local.crt /etc/caddy/certs/
sudo cp ~/server-certs/bscraspi.local.key /etc/caddy/certs/

sudo cp ~/device-ca/device-ca.pem /etc/caddy/certs/device-ca.pem
sudo chown -R caddy:caddy /etc/caddy/certs
sudo chmod 644 /etc/caddy/certs/bscraspi.local.crt
sudo chmod 600 /etc/caddy/certs/bscraspi.local.key
sudo chmod 644 /etc/caddy/certs/device-ca.pem
```

If Caddy runs as the non-root `caddy` user and should fetch Tailscale certificates, allow that user in Tailscale:

```bash
sudo nano /etc/default/tailscaled
```

Set:

```bash
TS_PERMIT_CERT_UID=caddy
```

Then restart Tailscale:

```bash
sudo systemctl restart tailscaled
```

Configure Caddy:
```bash
sudo nano /etc/caddy/Caddyfile
```

Add the reverse proxy configuration [`04_Deployment_Files/Caddyfile/`](../04_Deployment_Files/Caddyfile).

Format and reload Caddy:
```bash
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## Run the Server

```bash
bun run dev
```

## Device Certificates

The backend authorizes devices by certificate fingerprint. A device certificate must be present in the `device_certificates` table and must not be revoked, otherwise the backend rejects the mTLS connection even if the certificate is otherwise valid.

This README only covers the backend-side prerequisites:

1. Create the device CA.
2. Issue device certificates with that CA.
3. Ensure each issued certificate is registered in `device_certificates`.

The device provisioning is documented in the ESP READMEs:

- ESP/device workflow: [`../03_Sensors/ESP/README.md`](../03_Sensors/ESP/README.md)
- Provisioning scripts and host-side commands: [`../03_Sensors/device-provisioning/README.md`](../03_Sensors/device-provisioning/README.md)

# Code Maintenance
This section is aimed to help a future maintainer or developer by providing guidance.

## Adding a Sensor (Backend-Side)
This is the backend specific guidance to adding a new sensor to the system. 

When adding a new sensor, the backend is responsible for defining the configuration and event contract that the ESP must follow.

### Configuration Contract

Update the device configuration schema in `src/api/device/zod/device-config.schema.ts`.
If the sensor should be included in a station template, also update `src/api/device/device-config.templates.ts`.

The resulting JSON shape must match the ESP parser, including field names and numeric types.

### Event Contract

If the sensor emits a new event type or changes the payload of an existing one, update `src/api/event/zod/event.schema.ts`.

The `events.data` column is stored as JSONB, so sensor payload changes usually do not require a dedicated database migration unless you also change relational tables or enums.

### Related Backend Areas

Depending on how the sensor should behave in the platform, you may also need to update:

- notification threshold schemas in `src/api/notification/zod`
- event consumers or derived-state logic in `src/api/event`
- any backend-side templates that assign default configs to devices

## Adding a Notification Type

When adding a new notification type:

1. Decide on the threshold shape and adjust it.
   Update [`src/api/notification/zod/threshold.schema.ts`](src/api/notification/zod/threshold.schema.ts) and, if needed, [`src/api/notification/zod/subscription.types.ts`](src/api/notification/zod/subscription.types.ts).
2. Model the necessary database table to derive state from.
   Update [`src/db/schema.ts`](src/db/schema.ts), [`src/db/types.ts`](src/db/types.ts), and add a migration in [`drizzle/`](drizzle/).
3. Add a state updater that is called on event creation and add it to the pipeline.
   Add or adjust a file in [`src/api/event/derived-state/`](src/api/event/derived-state/) and register it in [`src/api/event/derived-state/derived-state.service.ts`](src/api/event/derived-state/derived-state.service.ts).
4. Add a notification processor for that event type.
   Add or adjust a file in [`src/api/notification/stateful/`](src/api/notification/stateful/) and register it in [`src/api/notification/stateful/stateful-notification.service.ts`](src/api/notification/stateful/stateful-notification.service.ts).

As a sidenote, the frontend should also be updated.
