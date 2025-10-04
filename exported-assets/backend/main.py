#!/usr/bin/env python3
"""
NASA Weather Probability API Backend
Integrates with NASA POWER API to provide real-time weather data analysis
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import json
import os
from pathlib import Path
import logging
from pydantic import BaseModel
import statistics
import math

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="NASA Weather Probability API",
    description="Real-time weather probability analysis using NASA POWER data",
    version="1.0.0"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# NASA POWER API configuration
NASA_POWER_BASE_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
NASA_WEATHER_PARAMETERS = [
    "T2M",          # Temperature at 2 Meters (°C)
    "T2M_MAX",      # Maximum Temperature at 2 Meters (°C)
    "T2M_MIN",      # Minimum Temperature at 2 Meters (°C)
    "PRECTOTCORR",  # Precipitation Corrected (mm/day)
    "WS10M",        # Wind Speed at 10 Meters (m/s)
    "RH2M",         # Relative Humidity at 2 Meters (%)
    "PS",           # Surface Pressure (kPa)
    "QV2M",         # Specific Humidity at 2 Meters (g/kg)
    "CLOUD_AMT"     # Cloud Amount (0-1)
]

# Request/Response models
class WeatherRequest(BaseModel):
    latitude: float
    longitude: float
    date: str  # YYYY-MM-DD format
    parameters: Optional[List[str]] = None
    baseline_years: Optional[int] = 20

class WeatherResponse(BaseModel):
    location: Dict[str, float]
    date: str
    probabilities: Dict[str, float]
    historical_averages: Dict[str, float]
    risk_assessment: Dict[str, Any]
    thresholds: Dict[str, float]
    metadata: Dict[str, Any]

class NASAPowerClient:
    """Client for NASA POWER API with rate limiting and error handling"""
    
    def __init__(self):
        self.rate_limit_delay = 1.0  # 1 second between requests
        self.last_request_time = 0
        self.timeout = 30.0
        
    async def _rate_limit(self):
        """Implement rate limiting"""
        current_time = asyncio.get_event_loop().time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.rate_limit_delay:
            await asyncio.sleep(self.rate_limit_delay - time_since_last)
        
        self.last_request_time = asyncio.get_event_loop().time()
    
    def _build_url(self, latitude: float, longitude: float, start_date: str, 
                   end_date: str, parameters: List[str]) -> str:
        """Build NASA POWER API URL"""
        params = {
            "parameters": ",".join(parameters),
            "community": "AG",  # Agroclimatology community
            "longitude": longitude,
            "latitude": latitude,
            "start": start_date.replace("-", ""),
            "end": end_date.replace("-", ""),
            "format": "JSON"
        }
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{NASA_POWER_BASE_URL}?{query_string}"
    
    async def fetch_weather_data(self, latitude: float, longitude: float, 
                                start_date: str, end_date: str, 
                                parameters: List[str] = None) -> Dict[str, Any]:
        """Fetch weather data from NASA POWER API"""
        if parameters is None:
            parameters = NASA_WEATHER_PARAMETERS
        
        await self._rate_limit()
        
        url = self._build_url(latitude, longitude, start_date, end_date, parameters)
        logger.info(f"Fetching NASA data: {url}")
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                response.raise_for_status()
                
                data = response.json()
                return self._process_nasa_response(data)
                
        except httpx.TimeoutException:
            logger.error(f"NASA API timeout for coordinates ({latitude}, {longitude})")
            raise HTTPException(status_code=504, detail="NASA API timeout")
        except httpx.HTTPStatusError as e:
            logger.error(f"NASA API HTTP error: {e.response.status_code}")
            raise HTTPException(status_code=502, detail=f"NASA API error: {e.response.status_code}")
        except Exception as e:
            logger.error(f"NASA API error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch NASA data: {str(e)}")
    
    def _process_nasa_response(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Process NASA POWER API response into structured format"""
        try:
            properties = data.get("properties", {})
            parameter_data = properties.get("parameter", {})
            
            if not parameter_data:
                raise ValueError("No parameter data in NASA response")
            
            # Get all dates from the first parameter
            first_param = next(iter(parameter_data.values()))
            dates = list(first_param.keys())
            
            # Convert to list of daily records
            records = []
            for date in dates:
                record = {"date": f"{date[:4]}-{date[4:6]}-{date[6:8]}"}
                
                for param, values in parameter_data.items():
                    value = values.get(date)
                    # Handle missing values (-999.0 in NASA data)
                    if value is not None and value != -999.0:
                        record[param] = float(value)
                    else:
                        record[param] = None
                
                records.append(record)
            
            logger.info(f"Processed {len(records)} daily records")
            return records
            
        except Exception as e:
            logger.error(f"Error processing NASA response: {str(e)}")
            raise ValueError(f"Failed to process NASA data: {str(e)}")

class WeatherAnalyzer:
    """Advanced weather probability analysis"""
    
    @staticmethod
    def filter_by_date(data: List[Dict], target_month: int, target_day: int) -> List[Dict]:
        """Filter data for specific month/day across all years"""
        filtered = []
        for record in data:
            try:
                date = datetime.strptime(record["date"], "%Y-%m-%d")
                if date.month == target_month and date.day == target_day:
                    filtered.append(record)
            except (ValueError, KeyError):
                continue
        return filtered
    
    @staticmethod
    def calculate_statistics(values: List[float]) -> Dict[str, float]:
        """Calculate basic statistics for a list of values"""
        if not values:
            return {"mean": 0, "std": 0, "min": 0, "max": 0}
        
        clean_values = [v for v in values if v is not None]
        if not clean_values:
            return {"mean": 0, "std": 0, "min": 0, "max": 0}
        
        return {
            "mean": statistics.mean(clean_values),
            "std": statistics.stdev(clean_values) if len(clean_values) > 1 else 0,
            "min": min(clean_values),
            "max": max(clean_values)
        }
    
    @staticmethod
    def calculate_probability(values: List[float], threshold: float, operator: str = ">=") -> float:
        """Calculate probability of exceeding threshold"""
        if not values:
            return 0.0
        
        clean_values = [v for v in values if v is not None]
        if not clean_values:
            return 0.0
        
        if operator == ">=":
            count = sum(1 for v in clean_values if v >= threshold)
        elif operator == "<=":
            count = sum(1 for v in clean_values if v <= threshold)
        elif operator == ">":
            count = sum(1 for v in clean_values if v > threshold)
        elif operator == "<":
            count = sum(1 for v in clean_values if v < threshold)
        else:
            raise ValueError(f"Unsupported operator: {operator}")
        
        return round((count / len(clean_values)) * 100, 1)
    
    def analyze_weather_probabilities(self, historical_data: List[Dict], 
                                    target_month: int, target_day: int) -> Dict[str, Any]:
        """Comprehensive weather probability analysis"""
        
        # Filter data for target date
        target_data = self.filter_by_date(historical_data, target_month, target_day)
        
        if not target_data:
            raise ValueError("No historical data available for this date")
        
        # Extract weather variables
        temperatures = [r.get("T2M") for r in target_data if r.get("T2M") is not None]
        max_temps = [r.get("T2M_MAX") for r in target_data if r.get("T2M_MAX") is not None]
        min_temps = [r.get("T2M_MIN") for r in target_data if r.get("T2M_MIN") is not None]
        precipitation = [r.get("PRECTOTCORR") for r in target_data if r.get("PRECTOTCORR") is not None]
        wind_speeds = [r.get("WS10M") for r in target_data if r.get("WS10M") is not None]
        humidity = [r.get("RH2M") for r in target_data if r.get("RH2M") is not None]
        
        # Calculate statistics
        temp_stats = self.calculate_statistics(temperatures)
        max_temp_stats = self.calculate_statistics(max_temps)
        min_temp_stats = self.calculate_statistics(min_temps)
        precip_stats = self.calculate_statistics(precipitation)
        wind_stats = self.calculate_statistics(wind_speeds)
        humidity_stats = self.calculate_statistics(humidity)
        
        # Calculate dynamic thresholds
        very_hot_threshold = max_temp_stats["mean"] + 1.5 * max_temp_stats["std"]
        very_cold_threshold = min_temp_stats["mean"] - 1.5 * min_temp_stats["std"]
        high_wind_threshold = wind_stats["mean"] + 1.0 * wind_stats["std"]
        
        # Calculate probabilities
        probabilities = {
            "rain": self.calculate_probability(precipitation, 1.0, ">="),
            "heavy_rain": self.calculate_probability(precipitation, 10.0, ">="),
            "very_hot": self.calculate_probability(max_temps, very_hot_threshold, ">="),
            "very_cold": self.calculate_probability(min_temps, very_cold_threshold, "<="),
            "high_wind": self.calculate_probability(wind_speeds, high_wind_threshold, ">="),
            "high_humidity": self.calculate_probability(humidity, 80.0, ">=")
        }
        
        # Calculate uncomfortable conditions (composite index)
        uncomfortable_count = 0
        for i, record in enumerate(target_data):
            temp = record.get("T2M")
            humid = record.get("RH2M")
            
            if temp is not None and humid is not None:
                # Heat index calculation or simple uncomfortable conditions
                if (temp > 27 and humid > 70) or temp < 5 or temp > 35:
                    uncomfortable_count += 1
        
        probabilities["uncomfortable"] = round((uncomfortable_count / len(target_data)) * 100, 1) if target_data else 0
        
        # Generate risk assessment
        risk_assessment = self._generate_risk_assessment(probabilities)
        
        return {
            "location_stats": {
                "total_years": len(set(datetime.strptime(r["date"], "%Y-%m-%d").year for r in target_data)),
                "total_records": len(target_data),
                "date_analyzed": f"{target_month:02d}-{target_day:02d}"
            },
            "probabilities": probabilities,
            "thresholds": {
                "very_hot_threshold": round(very_hot_threshold, 1),
                "very_cold_threshold": round(very_cold_threshold, 1),
                "high_wind_threshold": round(high_wind_threshold, 1),
                "rain_threshold": 1.0,
                "heavy_rain_threshold": 10.0,
                "high_humidity_threshold": 80.0
            },
            "historical_averages": {
                "temperature": round(temp_stats["mean"], 1),
                "max_temperature": round(max_temp_stats["mean"], 1),
                "min_temperature": round(min_temp_stats["mean"], 1),
                "precipitation": round(precip_stats["mean"], 2),
                "wind_speed": round(wind_stats["mean"], 1),
                "humidity": round(humidity_stats["mean"], 1)
            },
            "risk_assessment": risk_assessment
        }
    
    def _generate_risk_assessment(self, probabilities: Dict[str, float]) -> Dict[str, Any]:
        """Generate comprehensive risk assessment"""
        
        # Calculate suitability score
        suitability_score = 100
        suitability_score -= probabilities["rain"] * 0.3
        suitability_score -= probabilities["heavy_rain"] * 0.5
        suitability_score -= probabilities["very_hot"] * 0.4
        suitability_score -= probabilities["very_cold"] * 0.4
        suitability_score -= probabilities["high_wind"] * 0.2
        suitability_score -= probabilities["uncomfortable"] * 0.3
        
        suitability_score = max(0, min(100, round(suitability_score, 1)))
        
        # Determine overall risk level
        avg_probability = sum(probabilities.values()) / len(probabilities)
        if avg_probability <= 15:
            overall_risk = "Low"
        elif avg_probability <= 30:
            overall_risk = "Moderate"
        else:
            overall_risk = "High"
        
        # Generate recommendations
        recommendations = []
        if probabilities["rain"] > 25:
            recommendations.append("High chance of rain - bring waterproof clothing and consider covered areas")
        if probabilities["heavy_rain"] > 10:
            recommendations.append("Risk of heavy rainfall - have indoor backup plans ready")
        if probabilities["very_hot"] > 20:
            recommendations.append("Possible extreme heat - ensure shade and hydration are available")
        if probabilities["very_cold"] > 20:
            recommendations.append("Risk of very cold weather - provide warming areas and appropriate clothing")
        if probabilities["high_wind"] > 25:
            recommendations.append("High wind probability - secure loose items and decorations")
        if probabilities["uncomfortable"] > 30:
            recommendations.append("High chance of uncomfortable conditions - plan for climate control")
        
        if not recommendations:
            recommendations.append("Generally favorable weather conditions expected for outdoor activities")
        
        return {
            "suitability_score": suitability_score,
            "overall_risk": overall_risk,
            "recommendations": recommendations
        }

# Initialize clients
nasa_client = NASAPowerClient()
weather_analyzer = WeatherAnalyzer()

@app.get("/")
async def root():
    """API health check"""
    return {"message": "NASA Weather Probability API", "status": "active"}

@app.get("/api/v1/weather/analyze")
async def analyze_weather(
    latitude: float = Query(..., ge=-90, le=90, description="Latitude in decimal degrees"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude in decimal degrees"),
    date: str = Query(..., description="Target date in YYYY-MM-DD format"),
    baseline_years: int = Query(20, ge=5, le=40, description="Number of historical years to analyze")
):
    """
    Analyze weather probabilities for a specific location and date
    """
    try:
        # Parse and validate date
        target_date = datetime.strptime(date, "%Y-%m-%d")
        target_month = target_date.month
        target_day = target_date.day
        
        # Calculate date range for historical data
        current_year = datetime.now().year
        start_year = max(1981, current_year - baseline_years)  # NASA POWER data starts from 1981
        end_year = current_year - 1  # Use complete years only
        
        start_date = f"{start_year}-01-01"
        end_date = f"{end_year}-12-31"
        
        logger.info(f"Analyzing weather for ({latitude}, {longitude}) on {date}")
        logger.info(f"Using historical data from {start_date} to {end_date}")
        
        # Fetch historical data from NASA
        historical_data = await nasa_client.fetch_weather_data(
            latitude, longitude, start_date, end_date
        )
        
        if not historical_data:
            raise HTTPException(status_code=404, detail="No historical data available for this location")
        
        # Analyze probabilities
        analysis = weather_analyzer.analyze_weather_probabilities(
            historical_data, target_month, target_day
        )
        
        # Prepare response
        response = {
            "location": {"latitude": latitude, "longitude": longitude},
            "date": date,
            "probabilities": analysis["probabilities"],
            "historical_averages": analysis["historical_averages"],
            "risk_assessment": analysis["risk_assessment"],
            "thresholds": analysis["thresholds"],
            "metadata": {
                "data_source": "NASA POWER (power.larc.nasa.gov)",
                "model": "MERRA-2 Reanalysis",
                "spatial_resolution": "0.5° × 0.625°",
                "temporal_resolution": "Daily",
                "historical_period": f"{start_year}-{end_year}",
                "total_years": analysis["location_stats"]["total_years"],
                "total_records": analysis["location_stats"]["total_records"],
                "analysis_timestamp": datetime.now().isoformat()
            }
        }
        
        return JSONResponse(content=response)
        
    except ValueError as e:
        logger.error(f"Date parsing error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/api/v1/weather/locations")
async def get_sample_locations():
    """Get sample locations for testing"""
    return {
        "locations": [
            {"name": "New York, NY", "latitude": 40.7128, "longitude": -74.0060},
            {"name": "Los Angeles, CA", "latitude": 34.0522, "longitude": -118.2437},
            {"name": "Chicago, IL", "latitude": 41.8781, "longitude": -87.6298},
            {"name": "Phoenix, AZ", "latitude": 33.4484, "longitude": -112.0740},
            {"name": "Miami, FL", "latitude": 25.7617, "longitude": -80.1918},
            {"name": "London, UK", "latitude": 51.5074, "longitude": -0.1278},
            {"name": "Tokyo, Japan", "latitude": 35.6762, "longitude": 139.6503},
            {"name": "Sydney, Australia", "latitude": -33.8688, "longitude": 151.2093}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)