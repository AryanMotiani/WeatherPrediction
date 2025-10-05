@echo off
title NASA Weather API Backend Setup
echo ================================================
echo 🚀 Starting NASA Weather API Backend Setup...
echo ================================================

:: Step 1: Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Python not found. Please install Python 3.11 or higher and add it to PATH.
    pause
    exit /b
)

:: Step 2: Update pip, setuptools, wheel
echo.
echo 🔄 Updating pip, setuptools, and wheel...
python -m pip install --upgrade pip setuptools wheel

:: Step 3: Install Rust (if not installed)
echo.
where rustc >nul 2>nul
if %errorlevel% neq 0 (
    echo 🧱 Installing Rust toolchain (needed for Pydantic core)...
    powershell -Command "Invoke-WebRequest https://win.rustup.rs/x86_64 -OutFile rustup-init.exe"
    rustup-init.exe -y
    del rustup-init.exe
    echo ✅ Rust installed successfully. Please restart this script if errors occur.
) else (
    echo ✅ Rust already installed.
)

:: Step 4: Install backend dependencies
echo.
echo 📦 Installing Python dependencies from requirements.txt...
if not exist requirements.txt (
    echo ❌ requirements.txt not found in current directory.
    pause
    exit /b
)
python -m pip install -r requirements.txt

:: Step 5: Start the backend
echo.
echo 🚀 Launching the backend server...
python start.py

echo.
echo ✅ Setup complete! The server should now be running.
pause
