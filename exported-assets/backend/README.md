# NASA Weather Probability API Backend

This backend service integrates with NASA POWER API to provide real-time weather probability analysis for the "Will It Rain On My Parade?" application.

## Features

- **Real NASA Data**: Fetches live data from NASA POWER API (MERRA-2 reanalysis)
- **Statistical Analysis**: Advanced probability calculations using 20+ years of historical data
- **Rate Limiting**: Respects NASA API rate limits
- **Error Handling**: Robust error handling with fallback mechanisms
- **Caching**: Intelligent caching to improve performance
- **CORS Support**: Ready for frontend integration

## Quick Start

### Option 1: Using Python directly

1. **Install Python 3.11+** (if not already installed)

2. **Install dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Start the server:**
   ```bash
   python start.py
   ```
   
   Or manually:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. **Access the API:**
   - Server: http://localhost:8000
   - Documentation: http://localhost:8000/docs
   - Health check: http://localhost:8000

### Option 2: Using Docker

1. **Build the Docker image:**
   ```bash
   cd backend
   docker build -t nasa-weather-api .
   ```

2. **Run the container:**
   ```bash
   docker run -p 8000:8000 nasa-weather-api
   ```

## API Endpoints

### GET /
Health check endpoint
- **Response**: `{"message": "NASA Weather Probability API", "status": "active"}`

### GET /api/v1/weather/analyze
Analyze weather probabilities for a specific location and date

**Parameters:**
- `latitude` (float): Latitude in decimal degrees (-90 to 90)
- `longitude` (float): Longitude in decimal degrees (-180 to 180)
- `date` (string): Target date in YYYY-MM-DD format
- `baseline_years` (int, optional): Number of historical years to analyze (5-40, default: 20)

**Example Request:**
```
GET /api/v1/weather/analyze?latitude=40.7128&longitude=-74.0060&date=2025-07-04&baseline_years=20
```

**Example Response:**
```json
{
  "location": {"latitude": 40.7128, "longitude": -74.0060},
  "date": "2025-07-04",
  "probabilities": {
    "rain": 32.1,
    "heavy_rain": 8.5,
    "very_hot": 15.2,
    "very_cold": 0.0,
    "high_wind": 18.7,
    "high_humidity": 45.3,
    "uncomfortable": 28.9
  },
  "historical_averages": {
    "temperature": 24.2,
    "max_temperature": 28.8,
    "min_temperature": 19.6,
    "precipitation": 3.4,
    "wind_speed": 4.1,
    "humidity": 68.5
  },
  "risk_assessment": {
    "suitability_score": 72.3,
    "overall_risk": "Moderate",
    "recommendations": [
      "High chance of rain - bring waterproof clothing and consider covered areas",
      "High humidity expected - ensure adequate ventilation"
    ]
  },
  "thresholds": {
    "very_hot_threshold": 32.4,
    "very_cold_threshold": 8.2,
    "high_wind_threshold": 6.8,
    "rain_threshold": 1.0,
    "heavy_rain_threshold": 10.0,
    "high_humidity_threshold": 80.0
  },
  "metadata": {
    "data_source": "NASA POWER (power.larc.nasa.gov)",
    "model": "MERRA-2 Reanalysis",
    "spatial_resolution": "0.5° × 0.625°",
    "temporal_resolution": "Daily",
    "historical_period": "2004-2023",
    "total_years": 20,
    "total_records": 20,
    "analysis_timestamp": "2025-01-04T10:30:00"
  }
}
```

### GET /api/v1/weather/locations
Get sample locations for testing
- **Response**: List of sample locations with coordinates

## Data Sources

- **NASA POWER**: Prediction of Worldwide Energy Resources
- **MERRA-2**: Modern-Era Retrospective analysis for Research and Applications, Version 2
- **Spatial Resolution**: 0.5° × 0.625° (approximately 50km × 50km)
- **Temporal Coverage**: 1981-present (daily data)

## Weather Parameters

The API analyzes the following NASA POWER parameters:

- **T2M**: Temperature at 2 Meters (°C)
- **T2M_MAX**: Maximum Temperature at 2 Meters (°C)
- **T2M_MIN**: Minimum Temperature at 2 Meters (°C)
- **PRECTOTCORR**: Precipitation Corrected (mm/day)
- **WS10M**: Wind Speed at 10 Meters (m/s)
- **RH2M**: Relative Humidity at 2 Meters (%)
- **PS**: Surface Pressure (kPa)
- **QV2M**: Specific Humidity at 2 Meters (g/kg)
- **CLOUD_AMT**: Cloud Amount (0-1 fraction)

## Probability Calculations

### Thresholds

- **Rain**: ≥1.0 mm/day
- **Heavy Rain**: ≥10.0 mm/day
- **Very Hot**: Mean + 1.5 × Standard Deviation of historical max temperatures
- **Very Cold**: Mean - 1.5 × Standard Deviation of historical min temperatures
- **High Wind**: Mean + 1.0 × Standard Deviation of historical wind speeds
- **High Humidity**: ≥80%
- **Uncomfortable**: Composite index based on temperature and humidity

### Statistical Methods

1. **Historical Filtering**: Extract data for the same date (month/day) across all available years
2. **Probability Calculation**: Empirical probability = (Count of events exceeding threshold) / (Total observations)
3. **Dynamic Thresholds**: Statistical outlier detection using mean and standard deviation
4. **Risk Assessment**: Weighted scoring algorithm combining all probability factors

## Performance & Reliability

- **Rate Limiting**: 1 second delay between NASA API requests
- **Timeout Handling**: 30-second timeout for NASA API requests
- **Error Recovery**: Graceful handling of API failures
- **Data Validation**: Comprehensive input validation and sanitization
- **Logging**: Detailed logging for monitoring and debugging

## Development

### Running in Development Mode

```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Testing the API

1. **Health Check:**
   ```bash
   curl http://localhost:8000/
   ```

2. **Weather Analysis:**
   ```bash
   curl "http://localhost:8000/api/v1/weather/analyze?latitude=40.7128&longitude=-74.0060&date=2025-07-04"
   ```

3. **Interactive Documentation:**
   Visit http://localhost:8000/docs for Swagger UI

### Environment Variables

- `NASA_API_TIMEOUT`: Request timeout in seconds (default: 30)
- `RATE_LIMIT_DELAY`: Delay between requests in seconds (default: 1.0)
- `LOG_LEVEL`: Logging level (default: INFO)

## Deployment

### Production Deployment

For production deployment, consider:

1. **Environment Configuration:**
   ```bash
   export NASA_API_TIMEOUT=60
   export RATE_LIMIT_DELAY=1.5
   export LOG_LEVEL=WARNING
   ```

2. **Process Management:**
   ```bash
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```

3. **Reverse Proxy:** Use nginx or similar for SSL termination and load balancing

4. **Monitoring:** Implement health checks and error monitoring

### Docker Deployment

```bash
# Build
docker build -t nasa-weather-api .

# Run
docker run -d -p 8000:8000 --name nasa-weather-api nasa-weather-api

# With environment variables
docker run -d -p 8000:8000 -e NASA_API_TIMEOUT=60 nasa-weather-api
```

## Troubleshooting

### Common Issues

1. **NASA API Timeout:**
   - Increase `NASA_API_TIMEOUT` environment variable
   - Check internet connectivity
   - Verify NASA POWER API status

2. **Rate Limiting:**
   - Increase `RATE_LIMIT_DELAY` if getting 429 errors
   - Implement request queuing for high-traffic scenarios

3. **Memory Usage:**
   - Monitor memory usage for large date ranges
   - Consider implementing data streaming for very large datasets

4. **CORS Issues:**
   - Update `allow_origins` in CORS middleware for production
   - Ensure frontend URL is whitelisted

### Logs

Check application logs for detailed error information:
```bash
# If running with uvicorn
tail -f uvicorn.log

# If running with Docker
docker logs nasa-weather-api
```

## License

This project is part of the NASA Space Apps Challenge 2025 solution and is intended for educational and demonstration purposes.

## Support

For issues and questions:
1. Check the logs for error details
2. Verify NASA POWER API availability
3. Test with sample coordinates first
4. Review the API documentation at `/docs`