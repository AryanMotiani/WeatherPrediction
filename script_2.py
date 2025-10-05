import requests
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

print("Weather Prediction ML Model Development")
print("=====================================")
print("Setting up machine learning models for weather prediction...")
print("Note: Using Random Forest and Gradient Boosting (XGBoost alternative)")
print()

# Create a comprehensive weather data simulator that mimics real weather patterns
def generate_weather_dataset(num_samples=10000):
    """
    Generate synthetic weather data that closely mimics real weather patterns
    This simulates historical weather data that would normally come from APIs like OpenWeatherMap
    """
    print(f"Generating {num_samples} weather data samples...")
    
    # Initialize random seed for reproducibility
    np.random.seed(42)
    
    # Generate date range
    start_date = datetime(2020, 1, 1)
    dates = [start_date + timedelta(days=i/24) for i in range(num_samples)]
    
    # Seasonal patterns
    days_of_year = [(d - start_date).days % 365 for d in dates]
    seasonal_factor = np.sin(2 * np.pi * np.array(days_of_year) / 365)
    
    # Daily patterns
    hours = [d.hour for d in dates]
    daily_factor = np.sin(2 * np.pi * np.array(hours) / 24)
    
    # Base temperature with seasonal and daily variations
    base_temp = 15 + seasonal_factor * 10 + daily_factor * 5
    temperature = base_temp + np.random.normal(0, 3, num_samples)
    
    # Humidity (inversely related to temperature with noise)
    humidity = 70 - (temperature - 15) * 1.5 + np.random.normal(0, 10, num_samples)
    humidity = np.clip(humidity, 10, 100)
    
    # Pressure with seasonal variation
    pressure = 1013 + seasonal_factor * 5 + np.random.normal(0, 10, num_samples)
    
    # Wind speed with weather system correlation
    wind_speed = 5 + np.abs(np.random.normal(0, 8, num_samples)) + (1013 - pressure) * 0.1
    wind_speed = np.clip(wind_speed, 0, 50)
    
    # Cloud cover correlated with humidity and pressure
    cloud_cover = (humidity - 30) * 0.8 + (1013 - pressure) * 2 + np.random.normal(0, 15, num_samples)
    cloud_cover = np.clip(cloud_cover, 0, 100)
    
    # Precipitation probability based on cloud cover and humidity
    precip_prob = (cloud_cover * 0.6 + humidity * 0.4) / 100
    precipitation = np.where(
        np.random.random(num_samples) < precip_prob,
        np.random.exponential(2, num_samples),
        0
    )
    
    # UV Index based on cloud cover and seasonal factors
    base_uv = 5 + seasonal_factor * 3 + daily_factor * 2
    uv_index = np.maximum(0, base_uv - cloud_cover * 0.05 + np.random.normal(0, 1, num_samples))
    
    # Air Quality Index with urban/seasonal patterns
    aqi = 50 + seasonal_factor * 20 + np.random.normal(0, 15, num_samples)
    aqi = np.clip(aqi, 0, 300)
    
    # Create lagged features (previous values)
    temp_lag1 = np.roll(temperature, 1)
    temp_lag2 = np.roll(temperature, 2)
    humidity_lag1 = np.roll(humidity, 1)
    pressure_lag1 = np.roll(pressure, 1)
    
    # Handle first few values for lagged features
    temp_lag1[0] = temperature[0]
    temp_lag2[0:2] = temperature[0:2]
    humidity_lag1[0] = humidity[0]
    pressure_lag1[0] = pressure[0]
    
    # Create DataFrame
    weather_data = pd.DataFrame({
        'datetime': dates,
        'temperature': temperature,
        'temperature_lag1': temp_lag1,
        'temperature_lag2': temp_lag2,
        'humidity': humidity,
        'humidity_lag1': humidity_lag1,
        'pressure': pressure,
        'pressure_lag1': pressure_lag1,
        'wind_speed': wind_speed,
        'cloud_cover': cloud_cover,
        'precipitation': precipitation,
        'uv_index': uv_index,
        'aqi': aqi,
        'hour': hours,
        'day_of_year': days_of_year,
        'seasonal_factor': seasonal_factor,
        'daily_factor': daily_factor
    })
    
    print("Weather dataset generated successfully!")
    print(f"Dataset shape: {weather_data.shape}")
    print(f"Date range: {weather_data['datetime'].min()} to {weather_data['datetime'].max()}")
    print()
    
    return weather_data

# Generate the dataset
weather_df = generate_weather_dataset(10000)

# Display basic statistics
print("Weather Data Summary:")
print("===================")
print(weather_df[['temperature', 'humidity', 'pressure', 'wind_speed', 'precipitation', 'cloud_cover', 'uv_index', 'aqi']].describe())