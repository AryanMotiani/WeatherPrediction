@echo off
echo Starting NASA Weather Probability API Backend...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.11+ from https://python.org
    pause
    exit /b 1
)

REM Navigate to backend directory
cd backend

REM Install requirements if needed
echo Installing/updating Python dependencies...
pip install -r requirements.txt

REM Start the server
echo.
echo Starting server...
echo Server will be available at: http://localhost:8000
echo API documentation at: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo.

python start.py

pause