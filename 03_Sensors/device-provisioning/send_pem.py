import sys
import time
import serial

if len(sys.argv) != 3:
    print("Usage: python send_pem.py <PORT> <pem_file>")
    sys.exit(1)

PORT = sys.argv[1]
FILE = sys.argv[2]

BAUD = 115200
BOOT_DELAY_SECONDS = 5.0
DELAY_PER_LINE = 0.1

try:
    with open(FILE, "rb") as f:
        data = f.read()
except FileNotFoundError:
    print(f"[ERROR] PEM file not found: {FILE}")
    sys.exit(2)

lines = data.splitlines(keepends=True)

print(f"[INFO] Sending {len(data)} bytes / {len(lines)} lines to {PORT}")
print(f"[INFO] Baud: {BAUD}, boot delay: {BOOT_DELAY_SECONDS}s")

try:
    with serial.Serial(
        PORT,
        BAUD,
        timeout=1,
        write_timeout=2,
        rtscts=False,
        dsrdtr=False,
        xonxoff=False,
    ) as ser:
        ser.dtr = False
        ser.rts = False

        print("[INFO] Serial port opened")
        time.sleep(BOOT_DELAY_SECONDS)

        total_written = 0

        for i, line in enumerate(lines, start=1):
            written = ser.write(line)
            total_written += written

            if i == 1 or i == len(lines) or i % 5 == 0:
                print(f"[SEND] line {i}/{len(lines)} ({total_written}/{len(data)} bytes)")

            time.sleep(DELAY_PER_LINE)

        ser.flush()
        print(f"[INFO] Done, wrote {total_written} bytes")

except serial.SerialTimeoutException:
    print("[ERROR] Serial write timed out")
    sys.exit(3)

except serial.SerialException as e:
    print(f"[ERROR] Serial error on {PORT}: {e}")
    print("Close any serial monitor using the port.")
    sys.exit(4)