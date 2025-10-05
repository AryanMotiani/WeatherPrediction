# NASA Weather API - Installation Guide

This guide will help you install and run the NASA Weather Probability API backend.

## Prerequisites

- Python 3.11 or higher
- Windows 10/11 (for .bat files) or any OS with Python support

## Quick Start

### Option 1: Automatic Installation (Recommended)
1. Run `install_dependencies.bat` from the project root
2. Run `start_backend.bat` to start the server

### Option 2: Manual Installation
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `pip install -r requirements.txt`
3. Start the server: `python start.py`

## Troubleshooting

### Common Issues and Solutions

#### 1. Rust Compilation Error (pydantic-core)
**Error**: `Cargo, the Rust package manager, is not installed`

**Solutions**:
- **Option A**: Use pre-compiled wheels (automatic in our scripts)
- **Option B**: Install Rust from https://rustup.rs/
- **Option C**: Use the compatible requirements file

#### 2. FastAPI Import Error
**Error**: `ModuleNotFoundError: No module named 'fastapi'`

**Solutions**:
- Run `install_dependencies.bat` to fix installation issues
- Check Python version: `python --version` (should be 3.11+)
- Try manual installation: `pip install fastapi uvicorn httpx pydantic python-multipart`

#### 3. Permission Errors
**Error**: Permission denied during installation

**Solutions**:
- Run Command Prompt as Administrator
- Use virtual environment: `python -m venv venv` then `venv\Scripts\activate`

### Installation Strategies

Our installation process tries multiple strategies:

1. **Pre-compiled wheels**: Uses `--only-binary=all` to avoid compilation
2. **Compatible versions**: Uses `requirements-compatible.txt` with more flexible versions
3. **Individual packages**: Installs each package separately with latest versions

### Testing Installation

Run `python test_installation.py` to verify all dependencies are working correctly.

## File Structure

```
project/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── start.py               # Startup script
│   ├── requirements.txt       # Main requirements
│   └── requirements-compatible.txt  # Fallback requirements
├── start_backend.bat          # Windows startup script
├── install_dependencies.bat    # Installation helper
├── test_installation.py       # Dependency tester
└── INSTALLATION_GUIDE.md      # This file
```

## API Endpoints

Once running, the API will be available at:
- **Base URL**: http://localhost:8000
- **Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/
- **Weather Analysis**: http://localhost:8000/api/v1/weather/analyze

## Support

If you encounter issues:
1. Check the error messages carefully
2. Try running `install_dependencies.bat`
3. Verify Python version is 3.11+
4. Check that all files are in the correct locations
