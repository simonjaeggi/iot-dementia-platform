import sys
import time
import serial

if len(sys.argv) != 3:
    print("Usage: python send_pem.py <PORT> <pem_file>")
    sys.exit(1)

PORT = sys.argv[1]
FILE = sys.argv[2]

BAUD = 115200
DELAY_PER_LINE = 0.05  
with open(FILE, "rb") as f:
    data = f.read()

lines = data.splitlines(keepends=True)

print(f"Sending {len(data)} bytes / {len(lines)} lines to {PORT}. (close monitor)")

with serial.Serial(PORT, BAUD, timeout=1) as ser:
    for ln in lines:
        ser.write(ln)
        ser.flush()
        time.sleep(DELAY_PER_LINE)

print("Done.")
