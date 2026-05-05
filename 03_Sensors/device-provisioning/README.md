# Device Provisioning Tools

This directory contains the host-side helpers for issuing device certificates, registering them in the backend database, and sending the signed PEM certificate to the ESP.

The backend only accepts device connections whose certificate fingerprint exists in `device_certificates` and is not revoked.

## Requirements

- Python 3
- OpenSSL
- access to the backend database through `DATABASE_URL`
- the device CA at `~/device-ca/device-ca.pem` and `~/device-ca/device-ca.key`

## Environment Setup

Create the Python environment:

```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install "psycopg[binary]"
pip install pyserial
```

Load the virtual environment later with:

```bash
source venv/bin/activate
```

Set the database URL:

```bash
export DATABASE_URL=postgresql://myapp:myapp_pw@localhost:5432/myapp_db
```

## Certificate Issuance

### Option 1: Issue Certificate and Create DB Entry with Script

1. Save the CSR from the device as `CSRs/{DEVICE NAME}.csr`.
2. Activate the virtual environment.
3. Run `create_cert_with_db_entry.py`.

```bash
source venv/bin/activate
python3 create_cert_with_db_entry.py
```

When prompted for the device name, enter the same name used for the CSR file. The script:

- reads `CSRs/{DEVICE NAME}.csr`
- signs `cert/{DEVICE NAME}.pem` with the CA in `~/device-ca`
- inserts the certificate fingerprint into `device_certificates`

Sample output:

```text
Device name (e.g. esp32-01): esp-02
Certificate request self-signature ok
subject=CN=esp-1450
Signed cert: cert/esp-02.pem
Stored in DB: id=2, subject=esp-02
Fingerprint (sha256): ac7eb469fe5cf787a0ed8d7b40a1214bb3ce606a572224e2e4d8039d3d2a0329
```

### Option 2: Issue Manually, Then Import into the DB

Issue the certificate manually:

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

Then place the PEM file in `cert/{DEVICE NAME}.pem` and import it:

```bash
cd 03_Sensors/device-provisioning
source venv/bin/activate
python3 add_existing_cert_to_db.py
```

If this import step is skipped, the backend rejects the device connection.

## Send Certificate to the ESP

After the signed PEM exists, send it to the device over serial:

```bash
source venv/bin/activate
python send_pem.py /dev/ttyACM0 cert/esp-02.pem
```

Usage:

```text
python send_pem.py <PORT> <pem_file>
```

The device-side serial workflow is documented in [`../ESP/README.md`](../ESP/README.md).

## Certificate Management Scripts

- `create_cert_with_db_entry.py`: signs a CSR and inserts the fingerprint into `device_certificates`
- `add_existing_cert_to_db.py`: imports an already issued certificate into `device_certificates`
- `send_pem.py`: sends a PEM certificate to the ESP over serial
- `revoke_cert.py`: marks a certificate as revoked
- `undo_revoke_cert.py`: removes the revocation timestamp from a certificate
- `clear_db_certs.py`: clears the `device_certificates` table
- `clear_db_devices.py`: clears device records from the backend database
