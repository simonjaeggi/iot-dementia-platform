# Backend Setup

## Requirements
- Bun
- Docker + Docker Compose

## Install Bun
```bash
curl -fsSL https://bun.com/install | bash
```
(Restart the shell)

## Install Docker

### Raspberry Pi (see the [official docs](https://docs.docker.com/engine/install/raspberry-pi-os/#install-using-the-repository))
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

docker --version
docker compose version
```

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

Install Caddy and copy the certificates:
```bash
sudo apt update
sudo apt install -y caddy

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

Add the reverse proxy configuration below. This assumes the backend runs on port `3000` for users, `8443` for devices, the frontend on port `5173`, and ntfy on port `8444`.
```caddyfile
bscraspi.burmese-economy.ts.net {
	header {
		Strict-Transport-Security "max-age=86400"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "strict-origin-when-cross-origin"
		X-Frame-Options "DENY"
		Content-Security-Policy "
			default-src 'self';
			base-uri 'self';
			object-src 'none';
			frame-ancestors 'none';
			form-action 'self';

			script-src 'self';
			style-src 'self';
			img-src 'self' data:;
			font-src 'self';
			connect-src 'self' wss://bscraspi.burmese-economy.ts.net https://bscraspi.burmese-economy.ts.net;
			worker-src 'self';
		"
	}

	@mtls_on_web path /api/device/mtls /api/device/mtls/*
	handle @mtls_on_web {
		respond "Not Found" 404
	}

	@web_api path /api/auth /api/auth/* /api/device/web /api/device/web/* /api/health /api/event /api/event/* /api/notification /api/notification/* /api/misc/* /api/misc
	handle @web_api {
		reverse_proxy localhost:3000
	}

	@api_other path /api/*
	handle @api_other {
		respond "Not Found" 404
	}

	handle {
		reverse_proxy localhost:5173
	}
}

bscraspi.burmese-economy.ts.net:8444 {
	header {
		Strict-Transport-Security "max-age=86400"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "strict-origin-when-cross-origin"
		X-Frame-Options "DENY"
		Content-Security-Policy "
			default-src 'self';
			base-uri 'self';
			object-src 'none';
			frame-ancestors 'none';
			form-action 'self';

			script-src 'self' 'unsafe-inline';
			style-src 'self' 'unsafe-inline';
			img-src 'self' data: blob:;
			font-src 'self' data:;
			connect-src 'self' https://bscraspi.burmese-economy.ts.net:8444 wss://bscraspi.burmese-economy.ts.net:8444;
			manifest-src 'self';
			worker-src 'self' blob:;
		"
	}

	reverse_proxy 127.0.0.1:8080
}

bscraspi.local:8443, bscraspi.burmese-economy.ts.net:8443 {
	log {
		level DEBUG
	}

	tls /etc/caddy/certs/bscraspi.local.crt /etc/caddy/certs/bscraspi.local.key {
		client_auth {
			mode require_and_verify
			trusted_ca_cert_file /etc/caddy/certs/device-ca.pem
		}
	}

	@mtls_api path /api/device/mtls /api/device/mtls/*
	handle @mtls_api {
		reverse_proxy localhost:3000 {
			header_up X-Device-Fingerprint {tls_client_fingerprint}
			header_up X-Client-Subject {tls_client_subject}
			header_up X-Client-Serial {tls_client_serial}
		}
	}

	handle {
		respond "Not Found" 404
	}
}
```
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

1. Create the device CA in this document.
2. Issue device certificates with that CA.
3. Ensure each issued certificate is registered in `device_certificates`.

The operational provisioning flow lives with the device docs:

- ESP/device workflow: [`../03_Sensors/ESP/README.md`](../03_Sensors/ESP/README.md)
- Provisioning scripts and host-side commands: [`../03_Sensors/device-provisioning/README.md`](../03_Sensors/device-provisioning/README.md)

## Adding a Sensor on the Backend

When adding a new sensor, the backend is responsible for defining the configuration and event contract that the ESP must follow.

### Configuration Contract

Update the device configuration schema in `src/api/device/zod/device-config.schema.ts`.
If the sensor should be included in a station template, also update `src/api/device/device-config.templates.ts`.

The resulting JSON shape must match the ESP parser exactly, including field names and numeric types.

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
The usual entry points are [`../01_Frontend/src/app/settings/settings.config.ts`](../01_Frontend/src/app/settings/settings.config.ts), [`../01_Frontend/src/app/settings/notification-subscription-card.tsx`](../01_Frontend/src/app/settings/notification-subscription-card.tsx), [`../01_Frontend/src/app/settings/notification-subscription-section.tsx`](../01_Frontend/src/app/settings/notification-subscription-section.tsx), and [`../01_Frontend/src/app/settings/settings.tsx`](../01_Frontend/src/app/settings/settings.tsx).
