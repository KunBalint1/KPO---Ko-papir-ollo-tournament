@echo off
REM KPO Tournament Server - Windows Start Script
REM This script starts the Flask-SocketIO server

echo Installing/Updating dependencies...
pip install -r requirements.txt

echo.
echo Starting KPO Tournament Server...
echo Server will run on http://localhost:5000
echo Press Ctrl+C to stop
echo.

python server.py

pause
