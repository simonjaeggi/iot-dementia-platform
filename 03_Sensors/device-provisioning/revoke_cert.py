import os
import psycopg


def main() -> None:
    device_name = input("Device name to revoke (e.g. esp32-01): ").strip()
    if not device_name:
        raise SystemExit("Device name is required")

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise SystemExit(
            'Missing DATABASE_URL (e.g. export DATABASE_URL="postgresql://user:pw@localhost:5432/db")'
        )

    with psycopg.connect(db_url) as conn, conn.cursor() as cur:
        cur.execute(
            """
            UPDATE device_certificates
            SET revoked_at = now()
            WHERE cert_subj = %s
              AND revoked_at IS NULL
            RETURNING id;
            """,
            (device_name,),
        )

        row = cur.fetchone()
        conn.commit()

    if row:
        print(f"Revoked certificate for device: {device_name} (id={row[0]})")
    else:
        print(f"No active certificate found for device: {device_name}")


if __name__ == "__main__":
    main()
