#!/bin/bash
# KPO Tournament Server - Linux/Mac Start Script

echo "Installing/Updating dependencies..."
pip3 install -r requirements.txt

echo ""
echo "Starting KPO Tournament Server..."
echo "Server will run on http://localhost:5500"
echo "Press Ctrl+C to stop"
echo ""

python3 server.py
