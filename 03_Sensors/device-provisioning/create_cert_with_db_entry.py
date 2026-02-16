import os
import subprocess
from pathlib import Path

import psycopg

CA_CERT = Path("~/device-ca/device-ca.pem").expanduser()
CA_KEY = Path("~/device-ca/device-ca.key").expanduser()


def main() -> None:
    device_name = input("Device name (e.g. esp32-01): ").strip()
    if not device_name:
        raise SystemExit("Device name is required")

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise SystemExit(
            'Missing DATABASE_URL (e.g. export DATABASE_URL="postgresql://user:pw@localhost:5432/db")'
        )

    csr = Path(f"CSRs/{device_name}.csr")
    if not csr.exists():
        raise SystemExit(f"CSR not found: {csr}")
    if not CA_CERT.exists():
        raise SystemExit(f"CA cert not found: {CA_CERT}")
    if not CA_KEY.exists():
        raise SystemExit(f"CA key not found: {CA_KEY}")

    Path("cert").mkdir(parents=True, exist_ok=True)
    pem_path = Path(f"cert/{device_name}.pem")

    with psycopg.connect(db_url) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1
            FROM device_certificates
            WHERE cert_subj = %s
              AND revoked_at IS NULL
            LIMIT 1;
            """,
            (device_name,),
        )
        if cur.fetchone():
            raise SystemExit(f"Rejected: cert_subj already exists (not revoked): {device_name}")

        subprocess.run(
            [
                "openssl",
                "x509",
                "-req",
                "-in",
                str(csr),
                "-CA",
                str(CA_CERT),
                "-CAkey",
                str(CA_KEY),
                "-CAcreateserial",
                "-out",
                str(pem_path),
                "-days",
                "3650",
                "-sha256",
            ],
            check=True,
        )

        fp_out = subprocess.run(
            [
                "openssl",
                "x509",
                "-in",
                str(pem_path),
                "-noout",
                "-fingerprint",
                "-sha256",
            ],
            check=True,
            stdout=subprocess.PIPE,
            text=True,
        ).stdout.strip()

        # output: "sha256 Fingerprint=AA:BB:CC:..."
        fingerprint = fp_out.split("=", 1)[1].replace(":", "").lower()

        # store only subject + fingerprint
        cur.execute(
            """
            INSERT INTO device_certificates (cert_subj, cert_fingerprint_sha256)
            VALUES (%s, %s)
            RETURNING id;
            """,
            (device_name, fingerprint),
        )
        new_id = cur.fetchone()[0]
        conn.commit()

    print(f"Signed cert: {pem_path}")
    print(f"Stored in DB: id={new_id}, subject={device_name}")
    print(f"Fingerprint (sha256): {fingerprint}")


if __name__ == "__main__":
    main()
