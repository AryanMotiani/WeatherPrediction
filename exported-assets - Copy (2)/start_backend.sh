#!/bin/bash

echo "Starting NASA Weather Probability API Backend..."
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.11+ from your package manager"
    exit 1
fi

# Navigate to backend directory
cd backend

# Install requirements if needed
echo "Installing/updating Python dependencies..."
pip3 install -r requirements.txt

# Start the server
echo
echo "Starting server..."
echo "Server will be available at: http://localhost:8000"
echo "API documentation at: http://localhost:8000/docs"
echo
echo "Press Ctrl+C to stop the server"
echo

python3 start.py