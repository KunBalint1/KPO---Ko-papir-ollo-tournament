#!/bin/bash
# KPO Tournament Server - Production Start Script (Linux/Rackhost)

# Make sure dependencies are installed
echo "Ensuring dependencies are installed..."
pip3 install -r requirements.txt --upgrade

# Get port from argument or use default
PORT=${1:-5500}
DEBUG=${2:-False}

echo "Starting KPO Tournament Server in production mode..."
echo "Port: $PORT"
echo "Debug: $DEBUG"
echo ""

# Export environment variables
export PORT=$PORT
export DEBUG=$DEBUG

# Run with nohup to keep it running after SSH disconnect
nohup python3 server.py > server.log 2>&1 &

echo "Server started with PID: $!"
echo "Logs: server.log"
echo ""
echo "To stop: pkill -f 'python3 server.py'"
echo "To view logs: tail -f server.log"
