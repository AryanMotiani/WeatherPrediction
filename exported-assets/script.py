import json
import random
import numpy as np
from datetime import datetime, timedelta
import csv

# Create sample NASA POWER weather data for demonstration
def generate_sample_weather_data():
    """Generate sample historical weather data for probability calculations"""
    
    # Sample locations with coordinates
    locations = {
        "New York": {"lat": 40.7128, "lon": -74.0060},
        "Los Angeles": {"lat": 34.0522, "lon": -118.2437},
        "Chicago": {"lat": 41.8781, "lon": -87.6298},
        "Phoenix": {"lat": 33.4484, "lon": -112.0740},
        "Miami": {"lat": 25.7617, "lon": -80.1918}
    }
    
    # Weather parameters based on NASA POWER API
    weather_parameters = {
        "T2M": "Temperature at 2 Meters (°C)",
        "T2M_MAX": "Maximum Temperature at 2 Meters (°C)", 
        "T2M_MIN": "Minimum Temperature at 2 Meters (°C)",
        "PRECTOTCORR": "Precipitation Corrected (mm/day)",
        "WS10M": "Wind Speed at 10 Meters (m/s)",
        "RH2M": "Relative Humidity at 2 Meters (%)",
        "PS": "Surface Pressure (kPa)",
        "QV2M": "Specific Humidity at 2 Meters (g/kg)",
        "CLOUD_AMT": "Cloud Amount (0-1)"
    }
    
    # Generate historical data for each location
    historical_data = {}
    
    for city, coords in locations.items():
        city_data = []
        
        # Generate 10 years of daily data
        start_date = datetime(2014, 1, 1)
        end_date = datetime(2023, 12, 31)
        current_date = start_date
        
        while current_date <= end_date:
            # Create realistic seasonal weather patterns
            day_of_year = current_date.timetuple().tm_yday
            
            # Base temperature varies by location and season
            base_temps = {
                "New York": 10 + 15 * np.sin(2 * np.pi * (day_of_year - 80) / 365),
                "Los Angeles": 18 + 8 * np.sin(2 * np.pi * (day_of_year - 80) / 365),
                "Chicago": 8 + 20 * np.sin(2 * np.pi * (day_of_year - 80) / 365),
                "Phoenix": 25 + 18 * np.sin(2 * np.pi * (day_of_year - 80) / 365),
                "Miami": 24 + 6 * np.sin(2 * np.pi * (day_of_year - 80) / 365)
            }
            
            avg_temp = base_temps[city] + random.gauss(0, 3)
            max_temp = avg_temp + random.uniform(3, 8)
            min_temp = avg_temp - random.uniform(3, 8)
            
            # Precipitation patterns (more in winter/spring for most locations)
            precip_base = 2.5 if day_of_year < 150 or day_of_year > 300 else 1.0
            precipitation = max(0, random.expovariate(1/precip_base) * random.uniform(0.5, 2.0))
            
            # Wind speed
            wind_speed = max(0, random.gauss(4.5, 2.5))
            
            # Humidity
            humidity = min(100, max(10, random.gauss(65, 15)))
            
            # Surface pressure
            pressure = random.gauss(101.3, 2.5)
            
            # Cloud cover
            cloud_amount = random.uniform(0, 1)
            
            daily_record = {
                "date": current_date.strftime("%Y-%m-%d"),
                "year": current_date.year,
                "month": current_date.month,
                "day": current_date.day,
                "day_of_year": day_of_year,
                "T2M": round(avg_temp, 2),
                "T2M_MAX": round(max_temp, 2),
                "T2M_MIN": round(min_temp, 2),
                "PRECTOTCORR": round(precipitation, 2),
                "WS10M": round(wind_speed, 2),
                "RH2M": round(humidity, 1),
                "PS": round(pressure, 1),
                "QV2M": round(humidity * 0.15, 2),
                "CLOUD_AMT": round(cloud_amount, 3)
            }
            
            city_data.append(daily_record)
            current_date += timedelta(days=1)
        
        historical_data[city] = city_data
    
    return historical_data, locations, weather_parameters

# Generate the sample data
print("Generating sample NASA POWER weather data...")
historical_data, locations, weather_parameters = generate_sample_weather_data()

# Save sample data for the application
sample_data = {
    "locations": locations,
    "weather_parameters": weather_parameters,
    "historical_data": {}
}

# Include sample data for a few cities (reduce size for demo)
for city in ["New York", "Los Angeles", "Phoenix"]:
    sample_data["historical_data"][city] = historical_data[city]

print(f"Generated historical weather data for {len(historical_data)} cities")
print(f"Each city has {len(historical_data['New York'])} daily records")
print("\nSample record structure:")
print(json.dumps(historical_data["New York"][0], indent=2))

# Save to JSON file for the web application
with open("weather_sample_data.json", "w") as f:
    json.dump(sample_data, f, indent=2)

print("\nSample data saved to weather_sample_data.json")