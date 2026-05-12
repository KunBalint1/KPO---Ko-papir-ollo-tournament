@echo off
REM KPO Tournament Server - Windows Start Script
REM This script starts the Flask-SocketIO server

echo Installing/Updating dependencies...
pip install -r requirements.txt

echo.
echo Configuring Windows Firewall for TCP 5500...
netsh advfirewall firewall add rule name="KPO Tournament 5500" dir=in action=allow protocol=TCP localport=5500 >nul 2>&1

echo.
echo Starting KPO Tournament Server...
for /f %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object {$_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown'} ^| Select-Object -First 1 -ExpandProperty IPAddress)"') do set LANIP=%%i
if "%LANIP%"=="" set LANIP=localhost

echo Server will run on http://localhost:5500
echo LAN URL for other devices: http://%LANIP%:5500
echo Press Ctrl+C to stop
echo.

python server.py

pause
