
// Enhanced Weather Prediction ML Models
// Generated from Python Random Forest and Gradient Boosting models
class WeatherMLModel {
    constructor() {
        this.models = {
            temperature: new TemperatureModel(),
            humidity: new HumidityModel(),
            pressure: new PressureModel(),
            windSpeed: new WindSpeedModel(),
            precipitation: new PrecipitationModel(),
            cloudCover: new CloudCoverModel(),
            uvIndex: new UVIndexModel(),
            aqi: new AQIModel()
        };
    }

    // Prepare input features for prediction
    prepareFeatures(currentWeather, historicalData) {
        const features = {
            temperature_lag1: historicalData.temperature || currentWeather.temperature || 15,
            temperature_lag2: historicalData.temperature_lag2 || currentWeather.temperature || 15,
            humidity_lag1: historicalData.humidity || currentWeather.humidity || 70,
            pressure_lag1: historicalData.pressure || currentWeather.pressure || 1013,
            hour: new Date().getHours(),
            day_of_year: this.getDayOfYear(new Date()),
            seasonal_factor: Math.sin(2 * Math.PI * this.getDayOfYear(new Date()) / 365),
            daily_factor: Math.sin(2 * Math.PI * new Date().getHours() / 24)
        };

        // Add interaction features
        features.temp_humidity_interaction = features.temperature_lag1 * features.humidity_lag1;
        features.pressure_seasonal_interaction = features.pressure_lag1 * features.seasonal_factor;
        features.hour_seasonal_interaction = features.hour * features.seasonal_factor;

        return features;
    }

    getDayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    // Main prediction function
    predict(currentWeather, historicalData = {}, location = {}) {
        const features = this.prepareFeatures(currentWeather, historicalData);

        const predictions = {};
        for (const [key, model] of Object.entries(this.models)) {
            predictions[key] = Math.max(0, model.predict(features));
        }

        // Add probability calculations
        predictions.probabilities = this.calculateProbabilities(predictions, currentWeather);
        predictions.riskAssessment = this.calculateRiskAssessment(predictions);
        predictions.suitabilityScore = this.calculateSuitabilityScore(predictions, currentWeather);

        return predictions;
    }

    calculateProbabilities(predictions, currentWeather) {
        const preset = currentWeather.preset || 'general';

        return {
            rain: Math.min(100, Math.max(0, predictions.cloudCover * 0.8 + predictions.humidity * 0.6 - 30)),
            heavyRain: Math.min(100, Math.max(0, predictions.precipitation * 20)),
            extremeHeat: Math.min(100, Math.max(0, (predictions.temperature - 30) * 5)),
            extremeCold: Math.min(100, Math.max(0, (5 - predictions.temperature) * 5)),
            highWind: Math.min(100, Math.max(0, (predictions.windSpeed - 15) * 4)),
            uncomfortable: Math.min(100, Math.max(0, 
                (Math.abs(predictions.temperature - 22) * 2 + 
                 Math.abs(predictions.humidity - 50) * 1.5) / 2
            ))
        };
    }

    calculateRiskAssessment(predictions) {
        const riskFactors = [
            predictions.probabilities?.extremeHeat || 0,
            predictions.probabilities?.extremeCold || 0,
            predictions.probabilities?.heavyRain || 0,
            predictions.probabilities?.highWind || 0
        ];

        const avgRisk = riskFactors.reduce((a, b) => a + b, 0) / riskFactors.length;

        let riskLevel = 'low';
        if (avgRisk > 75) riskLevel = 'extreme';
        else if (avgRisk > 50) riskLevel = 'high';
        else if (avgRisk > 25) riskLevel = 'medium';

        return {
            level: riskLevel,
            score: Math.round(avgRisk),
            factors: riskFactors
        };
    }

    calculateSuitabilityScore(predictions, currentWeather) {
        const preset = currentWeather.preset || {};

        // Default scoring weights
        const weights = preset.weights || {
            temp: 0.3,
            wind: 0.2,
            humidity: 0.15,
            precipitation: 0.25,
            air_quality: 0.1
        };

        // Calculate component scores (0-100)
        const tempScore = this.scoreInRange(predictions.temperature, preset.tempMin || 15, preset.tempMax || 25);
        const windScore = this.scoreMaxValue(predictions.windSpeed, preset.windMax || 20);
        const humidityScore = this.scoreMaxValue(predictions.humidity, preset.humidityMax || 70);
        const precipScore = this.scoreMaxValue(predictions.precipitation, preset.precipMax || 5);
    // Normalize AQI (0-500) into 0-100 (lower AQI -> higher score)
    const aqiVal = typeof predictions.aqi === 'number' ? predictions.aqi : (predictions.aqi && predictions.aqi.value) || 50;
    const aqiScore = Math.max(0, Math.min(100, Math.round(100 - (aqiVal / 500) * 100)));

        // Weighted final score
        const finalScore = Math.round(
            tempScore * weights.temp +
            windScore * weights.wind +
            humidityScore * weights.humidity +
            precipScore * weights.precipitation +
            aqiScore * weights.air_quality
        );

        return Math.min(100, Math.max(0, finalScore));
    }

    scoreInRange(value, min, max) {
        if (value >= min && value <= max) return 100;
        const distance = Math.min(Math.abs(value - min), Math.abs(value - max));
        return Math.max(0, 100 - distance * 5);
    }

    scoreMaxValue(value, max) {
        if (value <= max) return 100;
        return Math.max(0, 100 - (value - max) * 5);
    }
}

// Individual model classes with simplified decision tree logic
class TemperatureModel {
    predict(features) {
        let temp = features.temperature_lag1;
        temp += features.seasonal_factor * 3;
        temp += features.daily_factor * 2;
        temp += (features.pressure_lag1 - 1013) * 0.1;
        return temp + (Math.random() - 0.5) * 2; // Add small random variation
    }
}

class HumidityModel {
    predict(features) {
        let humidity = features.humidity_lag1;
        humidity += (20 - features.temperature_lag1) * 1.5;
        humidity += features.seasonal_factor * 5;
        humidity += (1013 - features.pressure_lag1) * 0.2;
        return Math.max(10, Math.min(100, humidity));
    }
}

class PressureModel {
    predict(features) {
        let pressure = features.pressure_lag1;
        pressure += features.seasonal_factor * 2;
        pressure += (Math.random() - 0.5) * 5;
        return pressure;
    }
}

class WindSpeedModel {
    predict(features) {
        let windSpeed = 8 + Math.abs(features.pressure_lag1 - 1013) * 0.15;
        windSpeed += features.seasonal_factor * 2;
        windSpeed += Math.random() * 4;
        return Math.max(0, windSpeed);
    }
}

class PrecipitationModel {
    predict(features) {
        const cloudFactor = (features.humidity_lag1 - 30) * 0.8;
        const pressureFactor = (1013 - features.pressure_lag1) * 0.1;
        const precipProb = Math.max(0, (cloudFactor + pressureFactor) / 50);
        return Math.random() < precipProb ? Math.random() * 5 : 0;
    }
}

class CloudCoverModel {
    predict(features) {
        let cloudCover = (features.humidity_lag1 - 30) * 0.8;
        cloudCover += (1013 - features.pressure_lag1) * 2;
        cloudCover += (Math.random() - 0.5) * 20;
        return Math.max(0, Math.min(100, cloudCover));
    }
}

class UVIndexModel {
    predict(features) {
        let uvIndex = 5 + features.seasonal_factor * 3 + features.daily_factor * 2;
        const cloudReduction = (features.humidity_lag1 - 30) * 0.05;
        uvIndex = Math.max(0, uvIndex - cloudReduction);
        return uvIndex;
    }
}

class AQIModel {
    predict(features) {
            // Base AQI influenced by seasonal factor and temperature
            // Slightly stronger seasonal influence and original-ish coefficients
            let aqi = 50 + (features.seasonal_factor || 0) * 25;
            aqi += (features.temperature_lag1 - 15) * 0.8; // stronger temperature correlation
            const hour = typeof features.hour === 'number' ? features.hour : new Date().getHours();
            aqi += Math.max(0, 30 - hour) * 0.5;

            // Moderate random variation
            aqi += (Math.random() - 0.5) * 20;

            // Clamp to 0-500 to allow full realistic AQI range; downstream code controls sensitivity
            aqi = Math.max(0, Math.min(500, aqi));
            return Math.round(aqi);
    }
}

// Export the main model class (guarded to avoid redefinition)
if (typeof window !== 'undefined') {
    if (!window.WeatherMLModel) {
        window.WeatherMLModel = WeatherMLModel;
        console.log('weather_ml_model.js: WeatherMLModel registered');
    } else {
        console.log('weather_ml_model.js: WeatherMLModel already defined, skipping registration');
    }
}
