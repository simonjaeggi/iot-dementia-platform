import os
import subprocess
from pathlib import Path

import psycopg


def main() -> None:
    device_name = input("Device name (e.g. esp32-01): ").strip()
    if not device_name:
        raise SystemExit("Device name is required")

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise SystemExit(
            'Missing DATABASE_URL (e.g. export DATABASE_URL="postgresql://user:pw@localhost:5432/db")'
        )

    pem_path = Path(f"cert/{device_name}.pem")
    if not pem_path.exists():
        raise SystemExit(f"Cert not found: {pem_path}")

    fp_out = subprocess.run(
        ["openssl", "x509", "-in", str(pem_path), "-noout", "-fingerprint", "-sha256"],
        check=True,
        stdout=subprocess.PIPE,
        text=True,
    ).stdout.strip()

    fingerprint = fp_out.split("=", 1)[1].replace(":", "").lower()

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

        cur.execute(
            """
            SELECT 1
            FROM device_certificates
            WHERE cert_fingerprint_sha256 = %s
              AND revoked_at IS NULL
            LIMIT 1;
            """,
            (fingerprint,),
        )
        if cur.fetchone():
            raise SystemExit(f"Rejected: fingerprint already exists (not revoked): {fingerprint}")

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

    print(f"Imported cert: {pem_path}")
    print(f"Stored in DB: id={new_id}, subject={device_name}")
    print(f"Fingerprint (sha256): {fingerprint}")


if __name__ == "__main__":
    main()
