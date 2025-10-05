#!/usr/bin/env python3
"""
Startup script for NASA Weather Probability API
"""

import subprocess
import sys
import os
from pathlib import Path

def install_requirements():
    """Install required packages with fallback options"""
    print("Installing requirements...")
    
    # Try to upgrade pip first
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", "pip"])
    except:
        print("Warning: Could not upgrade pip")
    
    # Try installing with pre-compiled wheels
    try:
        print("Attempting to install with pre-compiled wheels...")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", 
            "--only-binary=all", "-r", "requirements.txt"
        ])
        return
    except subprocess.CalledProcessError:
        print("Pre-compiled wheels failed, trying compatible versions...")
    
    # Fallback to compatible versions
    try:
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", 
            "-r", "requirements-compatible.txt"
        ])
    except subprocess.CalledProcessError:
        print("Compatible versions failed, trying individual packages...")
        # Install packages individually with more permissive versions
        packages = [
            "fastapi",
            "uvicorn[standard]", 
            "httpx",
            "pydantic",
            "python-multipart"
        ]
        for package in packages:
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", package])
            except subprocess.CalledProcessError as e:
                print(f"Warning: Failed to install {package}: {e}")
                continue

def start_server():
    """Start the FastAPI server"""
    print("Starting NASA Weather Probability API server...")
    print("Server will be available at: http://localhost:8000")
    print("API documentation at: http://localhost:8000/docs")
    print("\nPress Ctrl+C to stop the server")
    
    try:
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\nServer stopped.")

if __name__ == "__main__":
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # Check if requirements are installed
    try:
        import fastapi
        import uvicorn
        import httpx
        import pydantic
        print("All required packages are available.")
    except ImportError as e:
        print(f"Missing required package: {e}")
        print("Installing requirements...")
        install_requirements()
        
        # Try importing again after installation
        try:
            import fastapi
            import uvicorn
            import httpx
            import pydantic
            print("All required packages are now available.")
        except ImportError as e:
            print(f"Failed to install required packages: {e}")
            print("Please run install_dependencies.bat from the project root to fix this issue.")
            input("Press Enter to exit...")
            sys.exit(1)
    
    start_server()