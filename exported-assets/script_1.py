import numpy as np
import json
from datetime import datetime
from typing import Dict, List, Tuple

def calculate_weather_probabilities(historical_data: List[Dict], target_month: int, target_day: int) -> Dict:
    """
    Calculate weather probabilities based on historical data for a specific date.
    
    Args:
        historical_data: List of daily weather records
        target_month: Target month (1-12)
        target_day: Target day (1-31)
    
    Returns:
        Dictionary with probability calculations and statistics
    """
    
    # Filter data for the target date across all years
    target_data = []
    for record in historical_data:
        if record["month"] == target_month and record["day"] == target_day:
            target_data.append(record)
    
    if not target_data:
        return {"error": "No historical data available for this date"}
    
    # Extract weather variables
    temperatures = [r["T2M"] for r in target_data]
    max_temps = [r["T2M_MAX"] for r in target_data]
    min_temps = [r["T2M_MIN"] for r in target_data]
    precipitation = [r["PRECTOTCORR"] for r in target_data]
    wind_speeds = [r["WS10M"] for r in target_data]
    humidity = [r["RH2M"] for r in target_data]
    
    # Calculate probabilities for extreme weather conditions
    
    # Rain probability (precipitation > 1mm)
    rain_days = len([p for p in precipitation if p > 1.0])
    rain_probability = (rain_days / len(target_data)) * 100
    
    # Heavy rain probability (precipitation > 10mm)
    heavy_rain_days = len([p for p in precipitation if p > 10.0])
    heavy_rain_probability = (heavy_rain_days / len(target_data)) * 100
    
    # Very hot probability (max temp > mean + 1.5 * std_dev)
    max_temp_mean = np.mean(max_temps)
    max_temp_std = np.std(max_temps)
    very_hot_threshold = max_temp_mean + 1.5 * max_temp_std
    very_hot_days = len([t for t in max_temps if t > very_hot_threshold])
    very_hot_probability = (very_hot_days / len(target_data)) * 100
    
    # Very cold probability (min temp < mean - 1.5 * std_dev)
    min_temp_mean = np.mean(min_temps)
    min_temp_std = np.std(min_temps)
    very_cold_threshold = min_temp_mean - 1.5 * min_temp_std
    very_cold_days = len([t for t in min_temps if t < very_cold_threshold])
    very_cold_probability = (very_cold_days / len(target_data)) * 100
    
    # High wind probability (wind speed > mean + 1 * std_dev)
    wind_mean = np.mean(wind_speeds)
    wind_std = np.std(wind_speeds)
    high_wind_threshold = wind_mean + 1.0 * wind_std
    high_wind_days = len([w for w in wind_speeds if w > high_wind_threshold])
    high_wind_probability = (high_wind_days / len(target_data)) * 100
    
    # High humidity probability (humidity > 80%)
    high_humidity_days = len([h for h in humidity if h > 80])
    high_humidity_probability = (high_humidity_days / len(target_data)) * 100
    
    # Calculate comfort index (combination of temperature and humidity)
    uncomfortable_days = 0
    for i in range(len(target_data)):
        temp = temperatures[i]
        humid = humidity[i]
        
        # Heat index approximation for uncomfortable conditions
        if temp > 27 and humid > 70:  # Hot and humid
            uncomfortable_days += 1
        elif temp < 5 or temp > 35:  # Very cold or very hot
            uncomfortable_days += 1
    
    uncomfortable_probability = (uncomfortable_days / len(target_data)) * 100
    
    # Historical trends (compare recent 5 years vs previous years)
    recent_years = [r for r in target_data if r["year"] >= 2019]
    earlier_years = [r for r in target_data if r["year"] < 2019]
    
    temp_trend = "stable"
    if recent_years and earlier_years:
        recent_avg_temp = np.mean([r["T2M"] for r in recent_years])
        earlier_avg_temp = np.mean([r["T2M"] for r in earlier_years])
        temp_diff = recent_avg_temp - earlier_avg_temp
        
        if temp_diff > 1:
            temp_trend = "warming"
        elif temp_diff < -1:
            temp_trend = "cooling"
    
    # Weather statistics
    results = {
        "location_stats": {
            "total_years": len(set([r["year"] for r in target_data])),
            "total_records": len(target_data),
            "date_analyzed": f"{target_month:02d}-{target_day:02d}"
        },
        
        "probabilities": {
            "rain_probability": round(rain_probability, 1),
            "heavy_rain_probability": round(heavy_rain_probability, 1),
            "very_hot_probability": round(very_hot_probability, 1),
            "very_cold_probability": round(very_cold_probability, 1),
            "high_wind_probability": round(high_wind_probability, 1),
            "high_humidity_probability": round(high_humidity_probability, 1),
            "uncomfortable_probability": round(uncomfortable_probability, 1)
        },
        
        "thresholds": {
            "very_hot_threshold": round(very_hot_threshold, 1),
            "very_cold_threshold": round(very_cold_threshold, 1),
            "high_wind_threshold": round(high_wind_threshold, 1),
            "rain_threshold": 1.0,
            "heavy_rain_threshold": 10.0,
            "high_humidity_threshold": 80.0
        },
        
        "historical_averages": {
            "avg_temperature": round(np.mean(temperatures), 1),
            "avg_max_temp": round(np.mean(max_temps), 1),
            "avg_min_temp": round(np.mean(min_temps), 1),
            "avg_precipitation": round(np.mean(precipitation), 2),
            "avg_wind_speed": round(np.mean(wind_speeds), 1),
            "avg_humidity": round(np.mean(humidity), 1)
        },
        
        "ranges": {
            "temp_range": {
                "min": round(min(temperatures), 1),
                "max": round(max(temperatures), 1)
            },
            "precipitation_range": {
                "min": round(min(precipitation), 2),
                "max": round(max(precipitation), 2)
            },
            "wind_range": {
                "min": round(min(wind_speeds), 1),
                "max": round(max(wind_speeds), 1)
            }
        },
        
        "climate_trends": {
            "temperature_trend": temp_trend,
            "recent_avg_temp": round(np.mean([r["T2M"] for r in recent_years]), 1) if recent_years else None,
            "earlier_avg_temp": round(np.mean([r["T2M"] for r in earlier_years]), 1) if earlier_years else None
        },
        
        "risk_assessment": generate_risk_assessment({
            "rain": rain_probability,
            "heavy_rain": heavy_rain_probability,
            "very_hot": very_hot_probability,
            "very_cold": very_cold_probability,
            "high_wind": high_wind_probability,
            "uncomfortable": uncomfortable_probability
        })
    }
    
    return results

def generate_risk_assessment(probabilities: Dict[str, float]) -> Dict:
    """Generate risk assessment and recommendations based on probabilities"""
    
    risk_levels = {}
    recommendations = []
    
    for condition, prob in probabilities.items():
        if prob >= 30:
            risk_levels[condition] = "High"
        elif prob >= 15:
            risk_levels[condition] = "Moderate"
        else:
            risk_levels[condition] = "Low"
    
    # Generate specific recommendations
    if probabilities["rain"] > 25:
        recommendations.append("High chance of rain - bring waterproof clothing")
    if probabilities["heavy_rain"] > 10:
        recommendations.append("Risk of heavy rainfall - consider indoor alternatives")
    if probabilities["very_hot"] > 20:
        recommendations.append("Possible extreme heat - plan for shade and hydration")
    if probabilities["very_cold"] > 20:
        recommendations.append("Risk of very cold weather - dress warmly")
    if probabilities["high_wind"] > 25:
        recommendations.append("High wind probability - secure loose items")
    if probabilities["uncomfortable"] > 30:
        recommendations.append("High chance of uncomfortable conditions - plan accordingly")
    
    if not recommendations:
        recommendations.append("Generally favorable weather conditions expected")
    
    # Overall suitability score (0-100, higher is better for outdoor activities)
    suitability_score = 100
    suitability_score -= probabilities["rain"] * 0.3
    suitability_score -= probabilities["heavy_rain"] * 0.5
    suitability_score -= probabilities["very_hot"] * 0.4
    suitability_score -= probabilities["very_cold"] * 0.4
    suitability_score -= probabilities["high_wind"] * 0.2
    suitability_score -= probabilities["uncomfortable"] * 0.3
    
    suitability_score = max(0, min(100, suitability_score))
    
    return {
        "risk_levels": risk_levels,
        "recommendations": recommendations,
        "suitability_score": round(suitability_score, 1),
        "overall_risk": "Low" if suitability_score > 75 else "Moderate" if suitability_score > 50 else "High"
    }

# Test the probability calculation with sample data
print("Testing weather probability calculations...")

# Load the sample data
with open("weather_sample_data.json", "r") as f:
    sample_data = json.load(f)

# Test calculation for July 4th in New York
ny_data = sample_data["historical_data"]["New York"]
july_4_probabilities = calculate_weather_probabilities(ny_data, 7, 4)

print("\nWeather Probabilities for July 4th in New York:")
print("=" * 50)
print(f"Based on {july_4_probabilities['location_stats']['total_years']} years of data")
print("\nProbabilities:")
for condition, prob in july_4_probabilities["probabilities"].items():
    print(f"  {condition.replace('_', ' ').title()}: {prob}%")

print(f"\nSuitability Score: {july_4_probabilities['risk_assessment']['suitability_score']}/100")
print(f"Overall Risk: {july_4_probabilities['risk_assessment']['overall_risk']}")

print("\nRecommendations:")
for rec in july_4_probabilities['risk_assessment']['recommendations']:
    print(f"  • {rec}")

# Save probability calculation function for use in the web app
probability_code = '''
// Weather Probability Calculation Functions

function calculateWeatherProbabilities(historicalData, targetMonth, targetDay) {
    // Filter data for the target date across all years
    const targetData = historicalData.filter(record => 
        record.month === targetMonth && record.day === targetDay
    );
    
    if (targetData.length === 0) {
        return { error: "No historical data available for this date" };
    }
    
    // Extract weather variables
    const temperatures = targetData.map(r => r.T2M);
    const maxTemps = targetData.map(r => r.T2M_MAX);
    const minTemps = targetData.map(r => r.T2M_MIN);
    const precipitation = targetData.map(r => r.PRECTOTCORR);
    const windSpeeds = targetData.map(r => r.WS10M);
    const humidity = targetData.map(r => r.RH2M);
    
    // Helper functions
    const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    const std = arr => {
        const m = mean(arr);
        return Math.sqrt(arr.map(x => Math.pow(x - m, 2)).reduce((a, b) => a + b, 0) / arr.length);
    };
    
    // Calculate probabilities
    const rainDays = precipitation.filter(p => p > 1.0).length;
    const rainProbability = (rainDays / targetData.length) * 100;
    
    const heavyRainDays = precipitation.filter(p => p > 10.0).length;
    const heavyRainProbability = (heavyRainDays / targetData.length) * 100;
    
    const maxTempMean = mean(maxTemps);
    const maxTempStd = std(maxTemps);
    const veryHotThreshold = maxTempMean + 1.5 * maxTempStd;
    const veryHotDays = maxTemps.filter(t => t > veryHotThreshold).length;
    const veryHotProbability = (veryHotDays / targetData.length) * 100;
    
    const minTempMean = mean(minTemps);
    const minTempStd = std(minTemps);
    const veryColdThreshold = minTempMean - 1.5 * minTempStd;
    const veryColdDays = minTemps.filter(t => t < veryColdThreshold).length;
    const veryColdProbability = (veryColdDays / targetData.length) * 100;
    
    const windMean = mean(windSpeeds);
    const windStd = std(windSpeeds);
    const highWindThreshold = windMean + 1.0 * windStd;
    const highWindDays = windSpeeds.filter(w => w > highWindThreshold).length;
    const highWindProbability = (highWindDays / targetData.length) * 100;
    
    const highHumidityDays = humidity.filter(h => h > 80).length;
    const highHumidityProbability = (highHumidityDays / targetData.length) * 100;
    
    // Calculate comfort index
    let uncomfortableDays = 0;
    for (let i = 0; i < targetData.length; i++) {
        const temp = temperatures[i];
        const humid = humidity[i];
        
        if ((temp > 27 && humid > 70) || temp < 5 || temp > 35) {
            uncomfortableDays++;
        }
    }
    const uncomfortableProbability = (uncomfortableDays / targetData.length) * 100;
    
    // Generate risk assessment
    const probabilities = {
        rain: rainProbability,
        heavy_rain: heavyRainProbability,
        very_hot: veryHotProbability,
        very_cold: veryColdProbability,
        high_wind: highWindProbability,
        uncomfortable: uncomfortableProbability
    };
    
    const riskAssessment = generateRiskAssessment(probabilities);
    
    return {
        location_stats: {
            total_years: new Set(targetData.map(r => r.year)).size,
            total_records: targetData.length,
            date_analyzed: `${targetMonth.toString().padStart(2, '0')}-${targetDay.toString().padStart(2, '0')}`
        },
        probabilities: {
            rain_probability: Math.round(rainProbability * 10) / 10,
            heavy_rain_probability: Math.round(heavyRainProbability * 10) / 10,
            very_hot_probability: Math.round(veryHotProbability * 10) / 10,
            very_cold_probability: Math.round(veryColdProbability * 10) / 10,
            high_wind_probability: Math.round(highWindProbability * 10) / 10,
            high_humidity_probability: Math.round(highHumidityProbability * 10) / 10,
            uncomfortable_probability: Math.round(uncomfortableProbability * 10) / 10
        },
        thresholds: {
            very_hot_threshold: Math.round(veryHotThreshold * 10) / 10,
            very_cold_threshold: Math.round(veryColdThreshold * 10) / 10,
            high_wind_threshold: Math.round(highWindThreshold * 10) / 10,
            rain_threshold: 1.0,
            heavy_rain_threshold: 10.0,
            high_humidity_threshold: 80.0
        },
        historical_averages: {
            avg_temperature: Math.round(mean(temperatures) * 10) / 10,
            avg_max_temp: Math.round(mean(maxTemps) * 10) / 10,
            avg_min_temp: Math.round(mean(minTemps) * 10) / 10,
            avg_precipitation: Math.round(mean(precipitation) * 100) / 100,
            avg_wind_speed: Math.round(mean(windSpeeds) * 10) / 10,
            avg_humidity: Math.round(mean(humidity) * 10) / 10
        },
        risk_assessment: riskAssessment
    };
}

function generateRiskAssessment(probabilities) {
    const riskLevels = {};
    const recommendations = [];
    
    for (const [condition, prob] of Object.entries(probabilities)) {
        if (prob >= 30) {
            riskLevels[condition] = "High";
        } else if (prob >= 15) {
            riskLevels[condition] = "Moderate";
        } else {
            riskLevels[condition] = "Low";
        }
    }
    
    if (probabilities.rain > 25) {
        recommendations.push("High chance of rain - bring waterproof clothing");
    }
    if (probabilities.heavy_rain > 10) {
        recommendations.push("Risk of heavy rainfall - consider indoor alternatives");
    }
    if (probabilities.very_hot > 20) {
        recommendations.push("Possible extreme heat - plan for shade and hydration");
    }
    if (probabilities.very_cold > 20) {
        recommendations.push("Risk of very cold weather - dress warmly");
    }
    if (probabilities.high_wind > 25) {
        recommendations.push("High wind probability - secure loose items");
    }
    if (probabilities.uncomfortable > 30) {
        recommendations.push("High chance of uncomfortable conditions - plan accordingly");
    }
    
    if (recommendations.length === 0) {
        recommendations.push("Generally favorable weather conditions expected");
    }
    
    let suitabilityScore = 100;
    suitabilityScore -= probabilities.rain * 0.3;
    suitabilityScore -= probabilities.heavy_rain * 0.5;
    suitabilityScore -= probabilities.very_hot * 0.4;
    suitabilityScore -= probabilities.very_cold * 0.4;
    suitabilityScore -= probabilities.high_wind * 0.2;
    suitabilityScore -= probabilities.uncomfortable * 0.3;
    
    suitabilityScore = Math.max(0, Math.min(100, suitabilityScore));
    
    return {
        risk_levels: riskLevels,
        recommendations: recommendations,
        suitability_score: Math.round(suitabilityScore * 10) / 10,
        overall_risk: suitabilityScore > 75 ? "Low" : suitabilityScore > 50 ? "Moderate" : "High"
    };
}
'''

with open("weather_probability_functions.js", "w") as f:
    f.write(probability_code)

print(f"\n\nProbability calculation functions saved to weather_probability_functions.js")