import serial
import time
import ctypes
import sys

# Replace with your actual COM port (check Device Manager)
GPS_COM_PORT = "COM3"
BAUD_RATE = 9600

# Struct for Windows time update
class SYSTEMTIME(ctypes.Structure):
    _fields_ = [
        ("wYear", ctypes.c_ushort),
        ("wMonth", ctypes.c_ushort),
        ("wDayOfWeek", ctypes.c_ushort),
        ("wDay", ctypes.c_ushort),
        ("wHour", ctypes.c_ushort),
        ("wMinute", ctypes.c_ushort),
        ("wSecond", ctypes.c_ushort),
        ("wMilliseconds", ctypes.c_ushort),
    ]

def set_windows_time(utc_tuple):
    st = SYSTEMTIME()
    st.wYear = utc_tuple.tm_year
    st.wMonth = utc_tuple.tm_mon
    st.wDay = utc_tuple.tm_mday
    st.wHour = utc_tuple.tm_hour
    st.wMinute = utc_tuple.tm_min
    st.wSecond = utc_tuple.tm_sec
    st.wMilliseconds = 0
    ctypes.windll.kernel32.SetSystemTime(ctypes.byref(st))  # UTC time!

def parse_gprmc(nmea):
    if nmea.startswith("$GPRMC") or nmea.startswith("$GNRMC"):
        parts = nmea.split(",")
        if parts[2] == "A":  # Data valid
            try:
                # Time
                hhmmss = parts[1]
                hh = int(hhmmss[0:2])
                mm = int(hhmmss[2:4])
                ss = int(hhmmss[4:6])

                # Date
                ddmmyy = parts[9]
                dd = int(ddmmyy[0:2])
                mo = int(ddmmyy[2:4])
                yy = int(ddmmyy[4:6]) + 2000

                return time.struct_time((yy, mo, dd, hh, mm, ss, 0, 0, 0))
            except:
                pass
    return None

def main():
    try:
        ser = serial.Serial(GPS_COM_PORT, BAUD_RATE, timeout=2)
        print(f"Listening to {GPS_COM_PORT} for GPS time...")

        while True:
            line = ser.readline().decode(errors="ignore").strip()
            t = parse_gprmc(line)
            if t:
                print(f"GPS UTC Time: {time.strftime('%Y-%m-%d %H:%M:%S', t)}")
                set_windows_time(t)
                print("System time updated.")
                break

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
