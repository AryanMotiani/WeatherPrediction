@echo off
echo Installing NASA Weather API Dependencies...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.11+ from https://python.org
    pause
    exit /b 1
)

echo Python found. Installing dependencies...
echo.

REM Navigate to backend directory
cd backend

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

REM Try different installation strategies
echo.
echo Strategy 1: Installing with pre-compiled wheels...
python -m pip install --only-binary=all -r requirements.txt
if %errorlevel% equ 0 (
    echo Successfully installed with pre-compiled wheels!
    goto :success
)

echo.
echo Strategy 2: Trying compatible versions...
python -m pip install -r requirements-compatible.txt
if %errorlevel% equ 0 (
    echo Successfully installed compatible versions!
    goto :success
)

echo.
echo Strategy 3: Installing packages individually...
python -m pip install fastapi
python -m pip install "uvicorn[standard]"
python -m pip install httpx
python -m pip install pydantic
python -m pip install python-multipart

:success
echo.
echo Dependencies installation completed!
echo You can now run start_backend.bat to start the server.
echo.
pause
