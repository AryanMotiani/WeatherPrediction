#!/usr/bin/env python3
"""
Test script to verify that all required dependencies are installed correctly
"""

def test_imports():
    """Test importing all required modules"""
    print("Testing imports...")
    
    try:
        import fastapi
        print("OK FastAPI imported successfully")
    except ImportError as e:
        print(f"X FastAPI import failed: {e}")
        return False
    
    try:
        import uvicorn
        print("OK Uvicorn imported successfully")
    except ImportError as e:
        print(f"X Uvicorn import failed: {e}")
        return False
    
    try:
        import httpx
        print("OK HTTPX imported successfully")
    except ImportError as e:
        print(f"X HTTPX import failed: {e}")
        return False
    
    try:
        import pydantic
        print("OK Pydantic imported successfully")
    except ImportError as e:
        print(f"X Pydantic import failed: {e}")
        return False
    
    try:
        from fastapi import FastAPI
        from pydantic import BaseModel
        print("OK FastAPI and Pydantic classes imported successfully")
    except ImportError as e:
        print(f"X FastAPI/Pydantic classes import failed: {e}")
        return False
    
    return True

def test_basic_functionality():
    """Test basic FastAPI functionality"""
    print("\nTesting basic functionality...")
    
    try:
        from fastapi import FastAPI
        from pydantic import BaseModel
        
        # Create a simple app
        app = FastAPI()
        
        class TestModel(BaseModel):
            name: str
            value: int
        
        # Test model creation
        test_data = TestModel(name="test", value=42)
        print("OK Pydantic model creation works")
        
        # Test FastAPI app creation
        print("OK FastAPI app creation works")
        
        return True
        
    except Exception as e:
        print(f"X Basic functionality test failed: {e}")
        return False

if __name__ == "__main__":
    print("NASA Weather API - Dependency Test")
    print("=" * 40)
    
    imports_ok = test_imports()
    functionality_ok = test_basic_functionality()
    
    print("\n" + "=" * 40)
    if imports_ok and functionality_ok:
        print("OK All tests passed! Dependencies are working correctly.")
        print("You can now run start_backend.bat to start the server.")
    else:
        print("X Some tests failed. Please check the error messages above.")
        print("Try running install_dependencies.bat to fix installation issues.")
    
    input("\nPress Enter to continue...")
