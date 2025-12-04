@echo off
REM ensure-adb-reverse.cmd
REM Ensures a device is connected and forwards common dev ports via adb reverse.

echo Checking adb devices...
adb devices

echo Setting up adb reverse for Metro and DevTools ports...
adb reverse tcp:8081 tcp:8081 2>nul || echo Failed to reverse 8081 (device may be offline)
adb reverse tcp:8082 tcp:8082 2>nul || echo Failed to reverse 8082 (device may be offline)
adb reverse tcp:8097 tcp:8097 2>nul || echo Failed to reverse 8097 (device may be offline)
adb reverse tcp:4000 tcp:4000 2>nul || echo Failed to reverse 4000 (device may be offline)

echo Current adb reverse list:
adb reverse --list

echo If you see failures above, ensure the device is connected via USB and USB debugging is enabled.
echo Also make sure no firewall is blocking connections to localhost:8081.
