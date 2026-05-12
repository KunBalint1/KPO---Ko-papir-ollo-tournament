@echo off
REM KPO Tournament Server - Windows Start Script
REM This script starts the Flask-SocketIO server

echo Installing/Updating dependencies...
pip install -r requirements.txt

echo.
echo Configuring Windows Firewall for TCP 5000...
netsh advfirewall firewall add rule name="KPO Tournament 5000" dir=in action=allow protocol=TCP localport=5000 >nul 2>&1

echo.
echo Starting KPO Tournament Server...
for /f %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object {$_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown'} ^| Select-Object -First 1 -ExpandProperty IPAddress)"') do set LANIP=%%i
if "%LANIP%"=="" set LANIP=localhost

echo Server will run on http://localhost:5000
echo LAN URL for other devices: http://%LANIP%:5000
echo Press Ctrl+C to stop
echo.

python server.py

pause
