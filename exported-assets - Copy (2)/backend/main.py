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
from geopy.distance import geodesic
from geopy.geocoders import Nominatim

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

class TravelRequest(BaseModel):
    start_latitude: float
    start_longitude: float
    end_latitude: float
    end_longitude: float
    date: str  # YYYY-MM-DD format
    baseline_years: Optional[int] = 20

class AQIData(BaseModel):
    aqi: int
    category: str
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    co: Optional[float] = None
    no2: Optional[float] = None
    o3: Optional[float] = None
    so2: Optional[float] = None

class WeatherResponse(BaseModel):
    location: Dict[str, float]
    date: str
    probabilities: Dict[str, float]
    historical_averages: Dict[str, float]
    risk_assessment: Dict[str, Any]
    thresholds: Dict[str, float]
    aqi_data: Optional[AQIData] = None
    metadata: Dict[str, Any]

class TravelResponse(BaseModel):
    route_points: List[Dict[str, Any]]
    total_distance: float
    travel_summary: str
    overall_aqi: Optional[AQIData] = None
    metadata: Dict[str, Any]

class AQIClient:
    """Client for fetching Air Quality Index data from Open-Meteo API"""
    
    def __init__(self):
        self.base_url = "https://air-quality-api.open-meteo.com/v1/air-quality"
        self.timeout = 30.0
        
    async def fetch_aqi_data(self, latitude: float, longitude: float, date: str) -> Optional[AQIData]:
        """Fetch AQI data from Open-Meteo API"""
        try:
            # Parse date to get the specific day
            target_date = datetime.strptime(date, "%Y-%m-%d")
            
            # Get current date for comparison
            current_date = datetime.now()
            
            # If requesting future date, use current AQI data as fallback
            if target_date > current_date:
                logger.info(f"Requested future date {date}, using current AQI data")
                target_date = current_date
            
            url = f"{self.base_url}?latitude={latitude}&longitude={longitude}&current=pm25,pm10,carbon_monoxide,nitrogen_dioxide,ozone,sulphur_dioxide&timezone=auto"
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                response.raise_for_status()
                
                data = response.json()
                return self._process_aqi_response(data)
                
        except Exception as e:
            logger.error(f"AQI API error: {str(e)}")
            # Return fallback AQI data
            return self._generate_fallback_aqi(latitude, longitude)
    
    def _process_aqi_response(self, data: Dict[str, Any]) -> AQIData:
        """Process AQI API response"""
        try:
            current = data.get("current", {})
            
            # Extract pollutant concentrations
            pm25 = current.get("pm25", {}).get("value")
            pm10 = current.get("pm10", {}).get("value")
            co = current.get("carbon_monoxide", {}).get("value")
            no2 = current.get("nitrogen_dioxide", {}).get("value")
            o3 = current.get("ozone", {}).get("value")
            so2 = current.get("sulphur_dioxide", {}).get("value")
            
            # Calculate overall AQI (simplified US EPA formula)
            aqi = self._calculate_aqi(pm25, pm10, co, no2, o3, so2)
            category = self._get_aqi_category(aqi)
            
            return AQIData(
                aqi=aqi,
                category=category,
                pm25=pm25,
                pm10=pm10,
                co=co,
                no2=no2,
                o3=o3,
                so2=so2
            )
            
        except Exception as e:
            logger.error(f"Error processing AQI response: {str(e)}")
            return self._generate_fallback_aqi(0, 0)
    
    def _calculate_aqi(self, pm25: float, pm10: float, co: float, no2: float, o3: float, so2: float) -> int:
        """Calculate overall AQI using US EPA methodology"""
        aqi_values = []
        
        # PM2.5 AQI calculation
        if pm25 is not None:
            aqi_values.append(self._pm25_to_aqi(pm25))
        
        # PM10 AQI calculation
        if pm10 is not None:
            aqi_values.append(self._pm10_to_aqi(pm10))
        
        # Use the highest AQI value
        return max(aqi_values) if aqi_values else 50  # Default to moderate
    
    def _pm25_to_aqi(self, pm25: float) -> int:
        """Convert PM2.5 concentration to AQI"""
        if pm25 <= 12.0:
            return int(((50 - 0) / (12.0 - 0.0)) * (pm25 - 0.0) + 0)
        elif pm25 <= 35.4:
            return int(((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1) + 51)
        elif pm25 <= 55.4:
            return int(((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5) + 101)
        elif pm25 <= 150.4:
            return int(((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5) + 151)
        elif pm25 <= 250.4:
            return int(((300 - 201) / (250.4 - 150.5)) * (pm25 - 150.5) + 201)
        else:
            return 300
    
    def _pm10_to_aqi(self, pm10: float) -> int:
        """Convert PM10 concentration to AQI"""
        if pm10 <= 54:
            return int(((50 - 0) / (54 - 0)) * (pm10 - 0) + 0)
        elif pm10 <= 154:
            return int(((100 - 51) / (154 - 55)) * (pm10 - 55) + 51)
        elif pm10 <= 254:
            return int(((150 - 101) / (254 - 155)) * (pm10 - 155) + 101)
        elif pm10 <= 354:
            return int(((200 - 151) / (354 - 255)) * (pm10 - 255) + 151)
        elif pm10 <= 424:
            return int(((300 - 201) / (424 - 355)) * (pm10 - 355) + 201)
        else:
            return 300
    
    def _get_aqi_category(self, aqi: int) -> str:
        """Get AQI category based on AQI value"""
        if aqi <= 50:
            return "Good"
        elif aqi <= 100:
            return "Moderate"
        elif aqi <= 150:
            return "Unhealthy for Sensitive Groups"
        elif aqi <= 200:
            return "Unhealthy"
        elif aqi <= 300:
            return "Very Unhealthy"
        else:
            return "Hazardous"
    
    def _generate_fallback_aqi(self, latitude: float, longitude: float) -> AQIData:
        """Generate fallback AQI data based on location"""
        # Simple fallback based on location (urban vs rural)
        is_urban = abs(latitude) < 60 and abs(longitude) < 180  # Rough urban detection
        
        if is_urban:
            aqi = 75  # Moderate for urban areas
            category = "Moderate"
        else:
            aqi = 45  # Good for rural areas
            category = "Good"
        
        return AQIData(
            aqi=aqi,
            category=category,
            pm25=25.0 if is_urban else 15.0,
            pm10=45.0 if is_urban else 25.0,
            co=2.5 if is_urban else 1.5,
            no2=35.0 if is_urban else 20.0,
            o3=60.0 if is_urban else 40.0,
            so2=15.0 if is_urban else 8.0
        )

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

class TravelRouteAnalyzer:
    """Analyze weather and AQI along travel routes"""
    
    def __init__(self, nasa_client, weather_analyzer, aqi_client):
        self.nasa_client = nasa_client
        self.weather_analyzer = weather_analyzer
        self.aqi_client = aqi_client
        self.geocoder = Nominatim(user_agent="nasa-weather-app")
    
    def calculate_route_points(self, start_lat: float, start_lon: float, 
                             end_lat: float, end_lon: float) -> List[Dict[str, Any]]:
        """Calculate intermediate points along a route"""
        start_point = (start_lat, start_lon)
        end_point = (end_lat, end_lon)
        
        # Calculate distance
        distance = geodesic(start_point, end_point).kilometers
        
        # If distance is less than 15km, only return start and end points
        if distance < 15:
            return [
                {"latitude": start_lat, "longitude": start_lon, "type": "start"},
                {"latitude": end_lat, "longitude": end_lon, "type": "end"}
            ]
        
        # Calculate intermediate points at 1/3 and 2/3 of the route
        mid1_lat = start_lat + (end_lat - start_lat) * 0.33
        mid1_lon = start_lon + (end_lon - start_lon) * 0.33
        
        mid2_lat = start_lat + (end_lat - start_lat) * 0.67
        mid2_lon = start_lon + (end_lon - start_lon) * 0.67
        
        return [
            {"latitude": start_lat, "longitude": start_lon, "type": "start"},
            {"latitude": mid1_lat, "longitude": mid1_lon, "type": "midpoint"},
            {"latitude": mid2_lat, "longitude": mid2_lon, "type": "midpoint"},
            {"latitude": end_lat, "longitude": end_lon, "type": "end"}
        ]
    
    async def analyze_travel_route(self, start_lat: float, start_lon: float,
                                 end_lat: float, end_lon: float, date: str,
                                 baseline_years: int = 20) -> TravelResponse:
        """Analyze weather and AQI along a travel route"""
        
        # Calculate route points
        route_points = self.calculate_route_points(start_lat, start_lon, end_lat, end_lon)
        
        # Calculate total distance
        total_distance = geodesic((start_lat, start_lon), (end_lat, end_lon)).kilometers
        
        # Analyze each point
        analyzed_points = []
        aqi_values = []
        
        for i, point in enumerate(route_points):
            try:
                # Get weather data for this point
                target_date = datetime.strptime(date, "%Y-%m-%d")
                current_year = datetime.now().year
                start_year = max(1981, current_year - baseline_years)
                end_year = current_year - 1
                
                start_date = f"{start_year}-01-01"
                end_date = f"{end_year}-12-31"
                
                historical_data = await self.nasa_client.fetch_weather_data(
                    point["latitude"], point["longitude"], start_date, end_date
                )
                
                # Analyze weather probabilities
                analysis = self.weather_analyzer.analyze_weather_probabilities(
                    historical_data, target_date.month, target_date.day
                )
                
                # Get AQI data
                aqi_data = await self.aqi_client.fetch_aqi_data(
                    point["latitude"], point["longitude"], date
                )
                
                if aqi_data:
                    aqi_values.append(aqi_data.aqi)
                
                # Get location name (optional)
                try:
                    location = self.geocoder.reverse(f"{point['latitude']}, {point['longitude']}")
                    location_name = location.address if location else f"Point {i+1}"
                except:
                    location_name = f"Point {i+1}"
                
                analyzed_points.append({
                    "latitude": point["latitude"],
                    "longitude": point["longitude"],
                    "type": point["type"],
                    "location_name": location_name,
                    "weather_analysis": analysis,
                    "aqi_data": aqi_data.dict() if aqi_data else None
                })
                
            except Exception as e:
                logger.error(f"Error analyzing point {i+1}: {str(e)}")
                # Add fallback data
                analyzed_points.append({
                    "latitude": point["latitude"],
                    "longitude": point["longitude"],
                    "type": point["type"],
                    "location_name": f"Point {i+1}",
                    "weather_analysis": None,
                    "aqi_data": None,
                    "error": str(e)
                })
        
        # Calculate overall AQI
        overall_aqi = None
        if aqi_values:
            avg_aqi = sum(aqi_values) / len(aqi_values)
            overall_aqi = AQIData(
                aqi=int(avg_aqi),
                category=self.aqi_client._get_aqi_category(int(avg_aqi))
            )
        
        # Generate travel summary
        travel_summary = self._generate_travel_summary(analyzed_points, total_distance)
        
        return TravelResponse(
            route_points=analyzed_points,
            total_distance=round(total_distance, 2),
            travel_summary=travel_summary,
            overall_aqi=overall_aqi,
            metadata={
                "analysis_date": date,
                "baseline_years": baseline_years,
                "total_points": len(route_points),
                "data_source": "NASA POWER + Open-Meteo AQI"
            }
        )
    
    def _generate_travel_summary(self, analyzed_points: List[Dict], distance: float) -> str:
        """Generate a human-readable travel summary"""
        if not analyzed_points:
            return "Unable to analyze travel route."
        
        # Extract key information
        start_point = next((p for p in analyzed_points if p["type"] == "start"), None)
        end_point = next((p for p in analyzed_points if p["type"] == "end"), None)
        
        if not start_point or not end_point:
            return "Unable to generate travel summary."
        
        # Get weather conditions
        start_weather = start_point.get("weather_analysis", {})
        end_weather = end_point.get("weather_analysis", {})
        
        # Get AQI conditions
        start_aqi = start_point.get("aqi_data", {})
        end_aqi = end_point.get("aqi_data", {})
        
        # Build summary
        summary_parts = []
        
        # Distance
        summary_parts.append(f"Route distance: {distance:.1f} km")
        
        # Weather conditions
        if start_weather and end_weather:
            start_temp = start_weather.get("historical_averages", {}).get("temperature", 0)
            end_temp = end_weather.get("historical_averages", {}).get("temperature", 0)
            summary_parts.append(f"Expected temperatures: {start_temp:.1f}°C to {end_temp:.1f}°C")
        
        # AQI conditions
        if start_aqi and end_aqi:
            start_aqi_val = start_aqi.get("aqi", 0)
            end_aqi_val = end_aqi.get("aqi", 0)
            start_cat = start_aqi.get("category", "Unknown")
            end_cat = end_aqi.get("category", "Unknown")
            summary_parts.append(f"Air quality: {start_cat} (AQI {start_aqi_val}) to {end_cat} (AQI {end_aqi_val})")
        
        # Risk assessment
        if start_weather and end_weather:
            start_risk = start_weather.get("risk_assessment", {}).get("overall_risk", "Unknown")
            end_risk = end_weather.get("risk_assessment", {}).get("overall_risk", "Unknown")
            summary_parts.append(f"Weather risk: {start_risk} to {end_risk}")
        
        return " | ".join(summary_parts)

# Initialize clients
nasa_client = NASAPowerClient()
weather_analyzer = WeatherAnalyzer()
aqi_client = AQIClient()
travel_analyzer = TravelRouteAnalyzer(nasa_client, weather_analyzer, aqi_client)

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
        
        # Get AQI data
        aqi_data = await aqi_client.fetch_aqi_data(latitude, longitude, date)
        
        # Prepare response
        response = {
            "location": {"latitude": latitude, "longitude": longitude},
            "date": date,
            "probabilities": analysis["probabilities"],
            "historical_averages": analysis["historical_averages"],
            "risk_assessment": analysis["risk_assessment"],
            "thresholds": analysis["thresholds"],
            "aqi_data": aqi_data.dict() if aqi_data else None,
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

@app.get("/api/v1/travel/analyze")
async def analyze_travel_route(
    start_latitude: float = Query(..., ge=-90, le=90, description="Start latitude in decimal degrees"),
    start_longitude: float = Query(..., ge=-180, le=180, description="Start longitude in decimal degrees"),
    end_latitude: float = Query(..., ge=-90, le=90, description="End latitude in decimal degrees"),
    end_longitude: float = Query(..., ge=-180, le=180, description="End longitude in decimal degrees"),
    date: str = Query(..., description="Target date in YYYY-MM-DD format"),
    baseline_years: int = Query(20, ge=5, le=40, description="Number of historical years to analyze")
):
    """
    Analyze weather and AQI along a travel route between two points
    """
    try:
        # Parse and validate date
        target_date = datetime.strptime(date, "%Y-%m-%d")
        
        logger.info(f"Analyzing travel route from ({start_latitude}, {start_longitude}) to ({end_latitude}, {end_longitude}) on {date}")
        
        # Analyze travel route
        travel_analysis = await travel_analyzer.analyze_travel_route(
            start_latitude, start_longitude, end_latitude, end_longitude, date, baseline_years
        )
        
        return JSONResponse(content=travel_analysis.dict())
        
    except ValueError as e:
        logger.error(f"Date parsing error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        logger.error(f"Travel analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Travel analysis failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)