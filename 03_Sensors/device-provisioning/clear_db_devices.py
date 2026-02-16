import os
import psycopg

def main() -> None:
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise SystemExit(
            'Missing DATABASE_URL (e.g. export DATABASE_URL="postgresql://user:pw@localhost:5432/db")'
        )

    with psycopg.connect(db_url) as conn, conn.cursor() as cur:
        cur.execute("TRUNCATE TABLE devices RESTART IDENTITY;")
        conn.commit()

    print("Cleared devices table.")

if __name__ == "__main__":
    main()