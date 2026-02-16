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
### Raspberry Pi (checkout the [official docs](https://docs.docker.com/engine/install/raspberry-pi-os/#install-using-the-repository]))
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

## Install dependencies

```bash
bun install
```

## Database (Postgres + Drizzle)

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
## Keys, certificates, and Caddy setup
### Server Certificate (for TLS encryption)
```bash
mkdir -p ~/server-certs
cd ~/server-certs

openssl genrsa -out bscraspi.local-key.pem 2048

openssl req -x509 -new -nodes \
  -key bscraspi.local-key.pem \
  -sha256 \
  -days 3650 \
  -out bscraspi.local.pem \
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

### Install and Setup Caddy

Install Caddy and copy certificates to folder
```bash
sudo apt update
sudo apt install -y caddy

sudo mkdir -p /etc/caddy/certs
sudo cp ~/server-certs/bscraspi.local.pem /etc/caddy/certs/
sudo cp ~/server-certs/bscraspi.local-key.pem /etc/caddy/certs/

sudo cp ~/device-ca/device-ca.pem /etc/caddy/certs/
sudo chown -R caddy:caddy /etc/caddy/certs
sudo chmod 644 /etc/caddy/certs/bscraspi.local.pem
sudo chmod 600 /etc/caddy/certs/bscraspi.local-key.pem
sudo chmod 644 /etc/caddy/certs/device-ca.pem
```

Configure Caddy
```bash
sudo nano /etc/caddy/Caddyfile
```

Add reverse proxy configuration (assuming backend at port `3000` for users, `8443` for devices and frontend at port `5173`)
```caddyfile
bscraspi.local {
  tls /etc/caddy/certs/bscraspi.local.pem /etc/caddy/certs/bscraspi.local-key.pem
  reverse_proxy /api/* localhost:3000
  reverse_proxy /auth/* localhost:3000
  reverse_proxy localhost:5173
}

bscraspi.local:8443 {
  tls /etc/caddy/certs/bscraspi.local.pem /etc/caddy/certs/bscraspi.local-key.pem {
    client_auth {
      mode require_and_verify
      trusted_ca_cert_file /etc/caddy/certs/device-ca.pem
    }
  }
  reverse_proxy /device/* localhost:3000 {
    header_up X-Device-Fingerprint {tls_client_fingerprint}
    header_up X-Client-Subject {tls_client_subject}
    header_up X-Client-Serial {tls_client_serial}
  }

  respond "Not Found" 404
}
```
Ensure formatting and reload Caddy
```bash
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo systemctl reload caddy
```


## Run the server

```bash
bun run dev
```


## Device "Manufacturing" Workflow
To allow authentication, we "burn" a signed certificate onto the client during manufacturing. Since this is a thesis, the manufacturing step is replaced by a manual workflow and instead of burning the device into hardware, we use simple non-volatile storage.

1) Device is flashed and boots. While the device has not received its certificate, it prints a CSR via serial (derived from self generated key pair). 
2) The CSR is saved externally, IE `esp32-01.csr`.
3) Server issues a device certificate, signed with the device-ca certificate (either manually or through a script).
4) Signed certificate is sent via serial to the device
5) Device stores `device.key` + `device.pem` in NVS

Example of issuing a new certificate:
```bash
cd ~/device-ca
openssl x509 -req \
  -in esp32-01.csr \
  -CA device-ca.pem \
  -CAkey device-ca.key \
  -CAcreateserial \
  -out esp32-01.pem \
  -days 3650 \
  -sha256
```

