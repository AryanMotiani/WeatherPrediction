#!/usr/bin/env python3
"""
Test script for the enhanced NASA Weather API backend features
"""

import requests
import json
import time

def test_backend_features():
    base_url = "http://localhost:8000"
    
    print("Testing NASA Weather API Backend Features")
    print("=" * 50)
    
    # Test 1: Health check
    print("1. Testing health check...")
    try:
        response = requests.get(f"{base_url}/", timeout=5)
        if response.status_code == 200:
            print("✓ Health check passed")
            print(f"  Response: {response.json()}")
        else:
            print(f"✗ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Health check failed: {e}")
        return False
    
    # Test 2: Weather analysis with AQI
    print("\n2. Testing weather analysis with AQI...")
    try:
        params = {
            "latitude": 40.7128,
            "longitude": -74.0060,
            "date": "2025-01-15",
            "baseline_years": 20
        }
        response = requests.get(f"{base_url}/api/v1/weather/analyze", params=params, timeout=30)
        if response.status_code == 200:
            data = response.json()
            print("✓ Weather analysis successful")
            print(f"  Location: {data.get('location')}")
            print(f"  Date: {data.get('date')}")
            print(f"  AQI Data: {'Yes' if data.get('aqi_data') else 'No'}")
            if data.get('aqi_data'):
                aqi = data['aqi_data']
                print(f"    AQI: {aqi.get('aqi')} ({aqi.get('category')})")
        else:
            print(f"✗ Weather analysis failed: {response.status_code}")
            print(f"  Response: {response.text}")
    except Exception as e:
        print(f"✗ Weather analysis failed: {e}")
    
    # Test 3: Travel route analysis
    print("\n3. Testing travel route analysis...")
    try:
        params = {
            "start_latitude": 40.7128,
            "start_longitude": -74.0060,
            "end_latitude": 34.0522,
            "end_longitude": -118.2437,
            "date": "2025-01-15",
            "baseline_years": 20
        }
        response = requests.get(f"{base_url}/api/v1/travel/analyze", params=params, timeout=60)
        if response.status_code == 200:
            data = response.json()
            print("✓ Travel analysis successful")
            print(f"  Total Distance: {data.get('total_distance')} km")
            print(f"  Route Points: {len(data.get('route_points', []))}")
            print(f"  Travel Summary: {data.get('travel_summary', 'N/A')[:100]}...")
        else:
            print(f"✗ Travel analysis failed: {response.status_code}")
            print(f"  Response: {response.text}")
    except Exception as e:
        print(f"✗ Travel analysis failed: {e}")
    
    # Test 4: API Documentation
    print("\n4. Testing API documentation...")
    try:
        response = requests.get(f"{base_url}/docs", timeout=5)
        if response.status_code == 200:
            print("✓ API documentation accessible")
        else:
            print(f"✗ API documentation failed: {response.status_code}")
    except Exception as e:
        print(f"✗ API documentation failed: {e}")
    
    print("\n" + "=" * 50)
    print("Backend feature testing completed!")

if __name__ == "__main__":
    test_backend_features()
