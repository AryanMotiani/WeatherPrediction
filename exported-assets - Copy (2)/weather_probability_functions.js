
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
