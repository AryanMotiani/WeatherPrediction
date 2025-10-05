// NASA Weather Probability Application JavaScript

class WeatherProbabilityApp {
    constructor() {
        this.locations = {
            'new-york': { name: 'New York, NY', lat: 40.7128, lon: -74.006 },
            'los-angeles': { name: 'Los Angeles, CA', lat: 34.0522, lon: -118.2437 },
            'phoenix': { name: 'Phoenix, AZ', lat: 33.4484, lon: -112.074 },
            'chicago': { name: 'Chicago, IL', lat: 41.8781, lon: -87.6298 },
            'miami': { name: 'Miami, FL', lat: 25.7617, lon: -80.1918 }
        };
        
        this.selectedLocation = null;
        this.selectedDate = null;
        this.map = null;
        this.mapMarker = null;
        this.weatherData = null;
        this.currentResults = null;
        this.travelMode = false;
        this.startLocation = null;
        this.endLocation = null;
        this.travelMap = null;
        this.travelMarkers = [];
        this.travelResults = null;
        
        // API configuration
        this.apiBaseUrl = this.detectApiUrl();
        this.requestCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        this.init();
    }

    detectApiUrl() {
        // Try to detect if backend is running locally, otherwise use fallback
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:8000';
        }
        // For production, you would set your deployed backend URL here
        return 'http://localhost:8000'; // Change this to your deployed backend URL
    }

    async init() {
        this.setupEventListeners();
        this.initializeMap();
        this.setDefaultDate();
        await this.loadWeatherData();
    }

    setupEventListeners() {
        // Location selection
        document.getElementById('location-select').addEventListener('change', (e) => {
            this.handleLocationChange(e.target.value);
        });

        // Date selection - Fixed event listener
        document.getElementById('date-input').addEventListener('change', (e) => {
            this.handleDateChange(e.target.value);
        });

        // Also listen for input events for better responsiveness
        document.getElementById('date-input').addEventListener('input', (e) => {
            this.handleDateChange(e.target.value);
        });

        // Quick date buttons - Fixed event handling
        document.querySelectorAll('.quick-date-buttons .btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const days = parseInt(e.target.dataset.days);
                this.setQuickDate(days);
            });
        });

        // Parameter controls
        document.getElementById('select-all-params').addEventListener('click', () => {
            this.toggleAllParameters(true);
        });

        document.getElementById('clear-all-params').addEventListener('click', () => {
            this.toggleAllParameters(false);
        });

        // Travel mode toggle
        document.getElementById('travel-mode-toggle').addEventListener('change', (e) => {
            this.toggleTravelMode(e.target.checked);
        });

        // Travel location selections
        document.getElementById('start-location-select').addEventListener('change', (e) => {
            this.handleStartLocationChange(e.target.value);
        });

        document.getElementById('end-location-select').addEventListener('change', (e) => {
            this.handleEndLocationChange(e.target.value);
        });

        // Analysis button
        document.getElementById('analyze-btn').addEventListener('click', () => {
            if (this.travelMode) {
                this.analyzeTravelRoute();
            } else {
                this.analyzeWeather();
            }
        });

        // Export buttons
        document.getElementById('export-csv').addEventListener('click', () => {
            this.exportData('csv');
        });

        document.getElementById('export-json').addEventListener('click', () => {
            this.exportData('json');
        });

        document.getElementById('export-travel-csv').addEventListener('click', () => {
            this.exportTravelData('csv');
        });

        document.getElementById('share-results').addEventListener('click', () => {
            this.shareResults();
        });

        // Custom location modal
        document.getElementById('custom-location-btn').addEventListener('click', () => {
            this.openCustomLocationModal();
        });

        document.getElementById('modal-close').addEventListener('click', () => {
            this.closeCustomLocationModal();
        });

        document.getElementById('modal-cancel').addEventListener('click', () => {
            this.closeCustomLocationModal();
        });

        document.getElementById('modal-save').addEventListener('click', () => {
            this.saveCustomLocation();
        });

        // Close modal on backdrop click
        document.getElementById('custom-location-modal').addEventListener('click', (e) => {
            if (e.target.id === 'custom-location-modal') {
                this.closeCustomLocationModal();
            }
        });
    }

    initializeMap() {
        this.map = L.map('map').setView([39.8283, -98.5795], 4); // Center of USA
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        this.map.on('click', (e) => {
            this.handleMapClick(e.latlng);
        });

        // Initialize travel map
        this.travelMap = L.map('travel-map').setView([39.8283, -98.5795], 4);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.travelMap);
    }

    setDefaultDate() {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const dateString = nextWeek.toISOString().split('T')[0];
        
        document.getElementById('date-input').value = dateString;
        this.handleDateChange(dateString);
    }

    async loadWeatherData() {
        try {
            // Test backend connectivity
            const healthResponse = await fetch(`${this.apiBaseUrl}/`);
            if (healthResponse.ok) {
                const healthData = await healthResponse.json();
                console.log('Backend connected:', healthData.message);
                this.backendAvailable = true;
            } else {
                throw new Error('Backend not available');
            }
        } catch (error) {
            console.warn('Backend not available, using fallback mode:', error);
            this.backendAvailable = false;
            // Load fallback data and functions
            await this.loadFallbackData();
        }
    }

    async loadFallbackData() {
        try {
            const response = await fetch('weather_sample_data.json');
            this.weatherData = await response.json();
            
            // Load probability calculation functions for fallback
            if (typeof calculateWeatherProbabilities === 'undefined') {
                const script = document.createElement('script');
                script.src = 'weather_probability_functions.js';
                script.onload = () => {
                    console.log('Fallback weather probability functions loaded');
                };
                document.head.appendChild(script);
            }
        } catch (error) {
            console.error('Error loading fallback weather data:', error);
            this.showError('Failed to load weather data. Please check your internet connection.');
        }
    }

    handleLocationChange(locationKey) {
        if (!locationKey) {
            this.selectedLocation = null;
            this.updateCoordinatesDisplay();
            return;
        }

        const location = this.locations[locationKey];
        if (location) {
            this.selectedLocation = location;
            this.updateCoordinatesDisplay();
            this.updateMapLocation(location.lat, location.lon);
        }
    }

    handleMapClick(latlng) {
        const customLocation = {
            name: `Custom (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`,
            lat: latlng.lat,
            lon: latlng.lng
        };
        
        this.selectedLocation = customLocation;
        this.updateCoordinatesDisplay();
        this.updateMapLocation(latlng.lat, latlng.lng);
        
        // Reset dropdown
        document.getElementById('location-select').value = '';
    }

    updateCoordinatesDisplay() {
        const latDisplay = document.getElementById('lat-display');
        const lonDisplay = document.getElementById('lon-display');
        
        if (this.selectedLocation) {
            latDisplay.textContent = this.selectedLocation.lat.toFixed(4);
            lonDisplay.textContent = this.selectedLocation.lon.toFixed(4);
        } else {
            latDisplay.textContent = '--';
            lonDisplay.textContent = '--';
        }
    }

    updateMapLocation(lat, lon) {
        if (this.mapMarker) {
            this.map.removeLayer(this.mapMarker);
        }
        
        this.mapMarker = L.marker([lat, lon]).addTo(this.map);
        this.map.setView([lat, lon], 8);
    }

    // Fixed date change handling
    handleDateChange(dateString) {
        if (!dateString) return;
        
        // Parse the date properly
        const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
        
        // Validate the date
        if (isNaN(date.getTime())) {
            console.error('Invalid date:', dateString);
            return;
        }
        
        this.selectedDate = date;
        
        // Update date display with proper formatting
        const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
        
        // Calculate day of year correctly
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);
        
        document.getElementById('month-day-display').textContent = monthDay;
        document.getElementById('day-of-year-display').textContent = dayOfYear;
        
        console.log('Date updated:', { dateString, monthDay, dayOfYear, date });
    }

    // Fixed quick date setting
    setQuickDate(days) {
        const today = new Date();
        const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
        const dateString = futureDate.toISOString().split('T')[0];
        
        // Update the input field
        const dateInput = document.getElementById('date-input');
        dateInput.value = dateString;
        
        // Trigger the change handler
        this.handleDateChange(dateString);
        
        console.log('Quick date set:', { days, dateString, futureDate });
    }

    toggleAllParameters(checked) {
        const checkboxes = document.querySelectorAll('input[name="weather-param"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
    }

    getSelectedParameters() {
        const checkboxes = document.querySelectorAll('input[name="weather-param"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    showLoading() {
        document.getElementById('loading-overlay').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading-overlay').classList.add('hidden');
    }

    showError(message) {
        alert(message); // Simple error handling - could be enhanced with a proper toast/notification system
    }

    async analyzeWeather() {
        if (!this.selectedLocation) {
            this.showError('Please select a location first.');
            return;
        }

        if (!this.selectedDate) {
            this.showError('Please select a date first.');
            return;
        }

        const selectedParams = this.getSelectedParameters();
        if (selectedParams.length === 0) {
            this.showError('Please select at least one weather parameter to analyze.');
            return;
        }

        this.showLoading();

        try {
            let results;
            
            if (this.backendAvailable) {
                // Use real NASA data via backend API
                results = await this.analyzeWithNASAData();
            } else {
                // Use fallback sample data
                results = await this.analyzeWithFallbackData();
            }

            this.currentResults = results;
            this.displayResults(results);
            
        } catch (error) {
            console.error('Analysis error:', error);
            this.showError(`Analysis failed: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    async analyzeWithNASAData() {
        const dateString = this.selectedDate.toISOString().split('T')[0];
        const cacheKey = `${this.selectedLocation.lat}_${this.selectedLocation.lon}_${dateString}`;
        
        // Check cache first
        if (this.requestCache.has(cacheKey)) {
            const cached = this.requestCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('Using cached NASA data');
                return cached.data;
            }
        }

        const url = `${this.apiBaseUrl}/api/v1/weather/analyze?` + 
                   `latitude=${this.selectedLocation.lat}&` +
                   `longitude=${this.selectedLocation.lon}&` +
                   `date=${dateString}&` +
                   `baseline_years=20`;

        console.log('Fetching NASA data from:', url);

        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `API request failed: ${response.status}`);
        }

        const data = await response.json();
        
        // Transform API response to match frontend expectations
        const results = this.transformNASAResponse(data);
        
        // Cache the results
        this.requestCache.set(cacheKey, {
            data: results,
            timestamp: Date.now()
        });

        return results;
    }

    transformNASAResponse(apiData) {
        return {
            location: this.selectedLocation.name,
            date: apiData.date,
            coordinates: {
                lat: apiData.location.latitude,
                lon: apiData.location.longitude
            },
            probabilities: apiData.probabilities,
            suitability_score: apiData.risk_assessment.suitability_score,
            risk_level: apiData.risk_assessment.overall_risk,
            recommendations: apiData.risk_assessment.recommendations,
            historical_averages: apiData.historical_averages,
            thresholds: apiData.thresholds,
            metadata: apiData.metadata,
            data_source: 'NASA POWER (Live Data)'
        };
    }

    async analyzeWithFallbackData() {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Generate results based on sample data (existing logic)
        const month = this.selectedDate.getMonth() + 1;
        const isWinter = month === 12 || month === 1 || month === 2;
        const isSummer = month === 6 || month === 7 || month === 8;
        
        const baseProbabilities = {
            rain: 25,
            heavy_rain: 5,
            very_hot: isSummer ? 25 : 5,
            very_cold: isWinter ? 15 : 0,
            high_wind: 20,
            high_humidity: isSummer ? 40 : 25,
            uncomfortable: isSummer ? 30 : (isWinter ? 20 : 15)
        };
        
        const locationMultiplier = this.selectedLocation.name.includes('Phoenix') ? 1.3 : 
                                 this.selectedLocation.name.includes('Los Angeles') ? 0.8 : 1.0;
        
        const probabilities = {};
        const selectedParams = this.getSelectedParameters();
        selectedParams.forEach(param => {
            const baseValue = baseProbabilities[param] || 10;
            const adjusted = Math.min(Math.round(baseValue * locationMultiplier + (Math.random() * 10 - 5)), 100);
            probabilities[param] = Math.max(adjusted, 0);
        });
        
        const avgProbability = Object.values(probabilities).reduce((sum, val) => sum + val, 0) / Object.values(probabilities).length;
        const suitabilityScore = Math.max(10, Math.min(100, Math.round(100 - avgProbability * 1.5)));
        const riskLevel = avgProbability <= 15 ? 'Low' : avgProbability <= 30 ? 'Moderate' : 'High';
        
        return {
            location: this.selectedLocation.name,
            date: this.selectedDate.toISOString().split('T')[0],
            coordinates: {
                lat: this.selectedLocation.lat,
                lon: this.selectedLocation.lon
            },
            probabilities: probabilities,
            suitability_score: suitabilityScore,
            risk_level: riskLevel,
            recommendations: this.generateRecommendations(probabilities, riskLevel),
            historical_averages: {
                temperature: isSummer ? 28.5 : (isWinter ? 5.2 : 18.3),
                max_temperature: isSummer ? 35.1 : (isWinter ? 10.8 : 24.8),
                min_temperature: isSummer ? 21.9 : (isWinter ? -0.4 : 11.6),
                precipitation: month >= 4 && month <= 9 ? 3.2 : 1.8,
                wind_speed: 4.2 + (Math.random() * 2),
                humidity: isSummer ? 75.3 : 65.3
            },
            data_source: 'Sample Data (Fallback Mode)'
        };
    }

    generateRecommendations(probabilities, riskLevel) {
        const recommendations = [];
        
        if (probabilities.rain && probabilities.rain > 20) {
            recommendations.push('Rain likely - bring waterproof clothing and consider covered areas');
        }
        
        if (probabilities.heavy_rain && probabilities.heavy_rain > 10) {
            recommendations.push('Heavy rain possible - have indoor backup plans ready');
        }
        
        if (probabilities.very_hot && probabilities.very_hot > 15) {
            recommendations.push('High temperatures expected - ensure shade and hydration available');
        }
        
        if (probabilities.very_cold && probabilities.very_cold > 10) {
            recommendations.push('Cold conditions likely - provide warming areas and appropriate clothing');
        }
        
        if (probabilities.high_wind && probabilities.high_wind > 25) {
            recommendations.push('Strong winds possible - secure loose items and decorations');
        }
        
        if (probabilities.high_humidity && probabilities.high_humidity > 35) {
            recommendations.push('High humidity expected - ensure adequate ventilation');
        }
        
        if (riskLevel === 'Low') {
            recommendations.push('Generally favorable conditions for outdoor events');
        } else if (riskLevel === 'High') {
            recommendations.push('Consider postponing or moving event indoors');
        }
        
        return recommendations.length > 0 ? recommendations : ['Conditions appear manageable for outdoor activities'];
    }

    displayResults(results) {
        // Show results section
        document.getElementById('results-section').classList.remove('hidden');
        document.getElementById('results-section').classList.add('fade-in');

        // Display data source indicator
        this.displayDataSourceInfo(results);

        // Display probability cards
        this.displayProbabilityCards(results.probabilities);

        // Display risk assessment
        this.displayRiskAssessment(results);

        // Display AQI data
        this.displayAQIData(results.aqi_data);

        // Display historical context
        this.displayHistoricalContext(results.historical_averages);

        // Update charts
        this.updateCharts(results.probabilities);

        // Scroll to results
        document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
    }

    displayDataSourceInfo(results) {
        // Add data source indicator to the results
        let dataSourceElement = document.getElementById('data-source-info');
        if (!dataSourceElement) {
            dataSourceElement = document.createElement('div');
            dataSourceElement.id = 'data-source-info';
            dataSourceElement.className = 'data-source-info';
            
            const resultsSection = document.getElementById('results-section');
            resultsSection.insertBefore(dataSourceElement, resultsSection.firstChild);
        }

        const isLiveData = results.data_source && results.data_source.includes('NASA POWER');
        const sourceIcon = isLiveData ? '🛰️' : '📊';
        const sourceText = isLiveData ? 'Live NASA POWER Data' : 'Sample Data (Demo Mode)';
        const sourceClass = isLiveData ? 'live-data' : 'sample-data';

        dataSourceElement.innerHTML = `
            <div class="data-source-badge ${sourceClass}">
                <span class="source-icon">${sourceIcon}</span>
                <span class="source-text">${sourceText}</span>
                ${results.metadata ? `<span class="source-details">• ${results.metadata.total_years} years • ${results.metadata.total_records} records</span>` : ''}
            </div>
        `;
    }

    displayProbabilityCards(probabilities) {
        const grid = document.getElementById('probability-grid');
        grid.innerHTML = '';

        const parameterLabels = {
            rain: 'Rain Probability',
            heavy_rain: 'Heavy Rain Risk',
            very_hot: 'Extreme Heat Risk',
            very_cold: 'Extreme Cold Risk',
            high_wind: 'High Wind Risk',
            high_humidity: 'High Humidity Risk',
            uncomfortable: 'Uncomfortable Conditions'
        };

        Object.entries(probabilities).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                const card = this.createProbabilityCard(parameterLabels[key], value);
                grid.appendChild(card);
            }
        });
    }

    createProbabilityCard(label, probability) {
        const card = document.createElement('div');
        card.className = `probability-card ${this.getRiskClass(probability)}`;

        card.innerHTML = `
            <div class="probability-value">${probability}%</div>
            <div class="probability-label">${label}</div>
            <div class="probability-bar">
                <div class="probability-fill ${this.getRiskClass(probability)}" style="width: ${probability}%"></div>
            </div>
        `;

        return card;
    }

    getRiskClass(probability) {
        if (probability <= 15) return 'risk-low';
        if (probability <= 30) return 'risk-moderate';
        return 'risk-high';
    }

    displayRiskAssessment(results) {
        document.getElementById('suitability-score').textContent = results.suitability_score;
        
        const riskLevelElement = document.getElementById('risk-level');
        riskLevelElement.textContent = results.risk_level;
        riskLevelElement.className = `risk-level ${results.risk_level.toLowerCase()}`;

        const recommendationsList = document.getElementById('recommendations-list');
        recommendationsList.innerHTML = '';
        
        results.recommendations.forEach(recommendation => {
            const li = document.createElement('li');
            li.textContent = recommendation;
            recommendationsList.appendChild(li);
        });
    }

    displayAQIData(aqiData) {
        if (!aqiData) {
            document.getElementById('aqi-value').textContent = '--';
            document.getElementById('aqi-category').textContent = 'No AQI Data';
            document.getElementById('aqi-category').className = 'aqi-category';
            document.getElementById('aqi-details').innerHTML = '';
            return;
        }

        // Display main AQI value and category
        document.getElementById('aqi-value').textContent = aqiData.aqi;
        document.getElementById('aqi-category').textContent = aqiData.category;
        
        // Apply AQI color class
        const aqiClass = this.getAQIClass(aqiData.aqi);
        document.getElementById('aqi-category').className = `aqi-category ${aqiClass}`;

        // Display AQI details
        const detailsContainer = document.getElementById('aqi-details');
        detailsContainer.innerHTML = '';

        const pollutants = [
            { key: 'pm25', label: 'PM2.5', value: aqiData.pm25, unit: 'μg/m³' },
            { key: 'pm10', label: 'PM10', value: aqiData.pm10, unit: 'μg/m³' },
            { key: 'co', label: 'CO', value: aqiData.co, unit: 'mg/m³' },
            { key: 'no2', label: 'NO₂', value: aqiData.no2, unit: 'μg/m³' },
            { key: 'o3', label: 'O₃', value: aqiData.o3, unit: 'μg/m³' },
            { key: 'so2', label: 'SO₂', value: aqiData.so2, unit: 'μg/m³' }
        ];

        pollutants.forEach(pollutant => {
            if (pollutant.value !== null && pollutant.value !== undefined) {
                const div = document.createElement('div');
                div.className = 'aqi-detail-item';
                div.innerHTML = `
                    <span class="aqi-detail-value">${pollutant.value.toFixed(1)}</span>
                    <span class="aqi-detail-label">${pollutant.label}</span>
                `;
                detailsContainer.appendChild(div);
            }
        });
    }

    displayHistoricalContext(averages) {
        const container = document.getElementById('historical-averages');
        container.innerHTML = '';

        const historicalData = [
            { label: 'Avg Temp', value: `${averages.temperature.toFixed(1)}°C`, unit: '' },
            { label: 'Max Temp', value: `${averages.max_temperature.toFixed(1)}°C`, unit: '' },
            { label: 'Min Temp', value: `${averages.min_temperature.toFixed(1)}°C`, unit: '' },
            { label: 'Precipitation', value: `${averages.precipitation.toFixed(1)}`, unit: 'mm' },
            { label: 'Wind Speed', value: `${averages.wind_speed.toFixed(1)}`, unit: 'm/s' },
            { label: 'Humidity', value: `${averages.humidity.toFixed(1)}`, unit: '%' }
        ];

        historicalData.forEach(item => {
            const div = document.createElement('div');
            div.className = 'historical-item';
            div.innerHTML = `
                <span class="historical-value">${item.value}${item.unit}</span>
                <span class="historical-label">${item.label}</span>
            `;
            container.appendChild(div);
        });
    }

    updateCharts(probabilities) {
        const ctx = document.getElementById('probability-chart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (window.probabilityChart) {
            window.probabilityChart.destroy();
        }

        const labels = [];
        const data = [];
        const colors = [];

        const parameterLabels = {
            rain: 'Rain',
            heavy_rain: 'Heavy Rain',
            very_hot: 'Extreme Heat',
            very_cold: 'Extreme Cold',
            high_wind: 'High Wind',
            high_humidity: 'High Humidity',
            uncomfortable: 'Uncomfortable'
        };

        Object.entries(probabilities).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                labels.push(parameterLabels[key]);
                data.push(value);
                
                // Color based on risk level
                if (value <= 15) colors.push('#1FB8CD');
                else if (value <= 30) colors.push('#FFC185');
                else colors.push('#B4413C');
            }
        });

        window.probabilityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Probability (%)',
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Weather Probability Analysis - ${this.selectedLocation ? this.selectedLocation.name : 'Selected Location'}`
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    exportData(format) {
        if (!this.currentResults) {
            this.showError('No data to export. Please run an analysis first.');
            return;
        }

        let data, filename, mimeType;

        if (format === 'csv') {
            data = this.generateCSV();
            filename = `weather-analysis-${this.selectedDate.toISOString().split('T')[0]}.csv`;
            mimeType = 'text/csv';
        } else if (format === 'json') {
            data = JSON.stringify(this.currentResults, null, 2);
            filename = `weather-analysis-${this.selectedDate.toISOString().split('T')[0]}.json`;
            mimeType = 'application/json';
        }

        this.downloadFile(data, filename, mimeType);
    }

    generateCSV() {
        const results = this.currentResults;
        let csv = 'Parameter,Probability (%)\n';
        
        Object.entries(results.probabilities).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                csv += `${key.replace('_', ' ')},${value}\n`;
            }
        });

        csv += '\nHistorical Averages\n';
        csv += 'Metric,Value\n';
        Object.entries(results.historical_averages).forEach(([key, value]) => {
            csv += `${key.replace('_', ' ')},${value}\n`;
        });

        // Add AQI data if available
        if (results.aqi_data) {
            csv += '\nAQI Data\n';
            csv += 'Metric,Value\n';
            csv += `AQI,${results.aqi_data.aqi}\n`;
            csv += `Category,${results.aqi_data.category}\n`;
            if (results.aqi_data.pm25) csv += `PM2.5,${results.aqi_data.pm25}\n`;
            if (results.aqi_data.pm10) csv += `PM10,${results.aqi_data.pm10}\n`;
            if (results.aqi_data.co) csv += `CO,${results.aqi_data.co}\n`;
            if (results.aqi_data.no2) csv += `NO2,${results.aqi_data.no2}\n`;
            if (results.aqi_data.o3) csv += `O3,${results.aqi_data.o3}\n`;
            if (results.aqi_data.so2) csv += `SO2,${results.aqi_data.so2}\n`;
        }

        return csv;
    }

    exportTravelData(format) {
        if (!this.travelResults) {
            this.showError('No travel data to export. Please run a travel analysis first.');
            return;
        }

        let data, filename, mimeType;

        if (format === 'csv') {
            data = this.generateTravelCSV();
            filename = `travel-analysis-${this.selectedDate.toISOString().split('T')[0]}.csv`;
            mimeType = 'text/csv';
        }

        this.downloadFile(data, filename, mimeType);
    }

    generateTravelCSV() {
        const results = this.travelResults;
        let csv = 'Route Analysis\n';
        csv += `Total Distance,${results.total_distance} km\n`;
        csv += `Travel Summary,${results.travel_summary}\n\n`;
        
        csv += 'Route Points\n';
        csv += 'Type,Location,Latitude,Longitude,Temperature,Precipitation,Wind Speed,AQI,Category\n';
        
        results.route_points.forEach(point => {
            const weather = point.weather_analysis?.historical_averages || {};
            const aqi = point.aqi_data || {};
            
            csv += `${point.type},${point.location_name},${point.latitude},${point.longitude},`;
            csv += `${weather.temperature || '--'},${weather.precipitation || '--'},${weather.wind_speed || '--'},`;
            csv += `${aqi.aqi || '--'},${aqi.category || '--'}\n`;
        });

        return csv;
    }

    downloadFile(data, filename, mimeType) {
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    shareResults() {
        if (!this.currentResults) {
            this.showError('No results to share. Please run an analysis first.');
            return;
        }

        const shareText = `Weather Analysis for ${this.selectedLocation.name} on ${this.selectedDate.toDateString()}\n` +
                         `Suitability Score: ${this.currentResults.suitability_score}/100\n` +
                         `Risk Level: ${this.currentResults.risk_level}\n` +
                         `Generated by NASA Weather Probability Predictor`;

        if (navigator.share) {
            navigator.share({
                title: 'Weather Analysis Results',
                text: shareText,
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(shareText).then(() => {
                alert('Results copied to clipboard!');
            }).catch(() => {
                this.showError('Failed to copy results to clipboard.');
            });
        }
    }

    openCustomLocationModal() {
        document.getElementById('custom-location-modal').classList.remove('hidden');
    }

    closeCustomLocationModal() {
        document.getElementById('custom-location-modal').classList.add('hidden');
        // Clear form
        document.getElementById('custom-location-name').value = '';
        document.getElementById('custom-lat').value = '';
        document.getElementById('custom-lon').value = '';
    }

    saveCustomLocation() {
        const name = document.getElementById('custom-location-name').value.trim();
        const lat = parseFloat(document.getElementById('custom-lat').value);
        const lon = parseFloat(document.getElementById('custom-lon').value);

        if (!name || isNaN(lat) || isNaN(lon)) {
            this.showError('Please fill in all fields with valid values.');
            return;
        }

        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            this.showError('Please enter valid coordinates (lat: -90 to 90, lon: -180 to 180).');
            return;
        }

        const customLocation = { name, lat, lon };
        this.selectedLocation = customLocation;
        this.updateCoordinatesDisplay();
        this.updateMapLocation(lat, lon);
        
        // Reset dropdown
        document.getElementById('location-select').value = '';
        
        this.closeCustomLocationModal();
    }

    // Travel Mode Methods
    toggleTravelMode(enabled) {
        this.travelMode = enabled;
        
        const singleMode = document.getElementById('single-location-mode');
        const travelMode = document.getElementById('travel-location-mode');
        const travelInfo = document.getElementById('travel-mode-info');
        
        if (enabled) {
            singleMode.classList.add('hidden');
            travelMode.classList.remove('hidden');
            travelInfo.classList.remove('hidden');
        } else {
            singleMode.classList.remove('hidden');
            travelMode.classList.add('hidden');
            travelInfo.classList.add('hidden');
        }
    }

    handleStartLocationChange(locationKey) {
        if (!locationKey) {
            this.startLocation = null;
            this.updateTravelCoordinatesDisplay();
            return;
        }

        const location = this.locations[locationKey];
        if (location) {
            this.startLocation = location;
            this.updateTravelCoordinatesDisplay();
            this.updateTravelMap();
        }
    }

    handleEndLocationChange(locationKey) {
        if (!locationKey) {
            this.endLocation = null;
            this.updateTravelCoordinatesDisplay();
            return;
        }

        const location = this.locations[locationKey];
        if (location) {
            this.endLocation = location;
            this.updateTravelCoordinatesDisplay();
            this.updateTravelMap();
        }
    }

    updateTravelCoordinatesDisplay() {
        const startLatDisplay = document.getElementById('start-lat-display');
        const startLonDisplay = document.getElementById('start-lon-display');
        const endLatDisplay = document.getElementById('end-lat-display');
        const endLonDisplay = document.getElementById('end-lon-display');
        
        if (this.startLocation) {
            startLatDisplay.textContent = this.startLocation.lat.toFixed(4);
            startLonDisplay.textContent = this.startLocation.lon.toFixed(4);
        } else {
            startLatDisplay.textContent = '--';
            startLonDisplay.textContent = '--';
        }

        if (this.endLocation) {
            endLatDisplay.textContent = this.endLocation.lat.toFixed(4);
            endLonDisplay.textContent = this.endLocation.lon.toFixed(4);
        } else {
            endLatDisplay.textContent = '--';
            endLonDisplay.textContent = '--';
        }
    }

    updateTravelMap() {
        // Clear existing markers
        this.travelMarkers.forEach(marker => this.travelMap.removeLayer(marker));
        this.travelMarkers = [];

        if (this.startLocation && this.endLocation) {
            // Add start marker
            const startMarker = L.marker([this.startLocation.lat, this.startLocation.lon])
                .addTo(this.travelMap)
                .bindPopup(`Start: ${this.startLocation.name}`);
            this.travelMarkers.push(startMarker);

            // Add end marker
            const endMarker = L.marker([this.endLocation.lat, this.endLocation.lon])
                .addTo(this.travelMap)
                .bindPopup(`End: ${this.endLocation.name}`);
            this.travelMarkers.push(endMarker);

            // Fit map to show both points
            const group = new L.featureGroup(this.travelMarkers);
            this.travelMap.fitBounds(group.getBounds().pad(0.1));

            // Calculate and display distance
            const distance = this.calculateDistance(
                this.startLocation.lat, this.startLocation.lon,
                this.endLocation.lat, this.endLocation.lon
            );
            document.getElementById('route-distance').textContent = `${distance.toFixed(1)} km`;
        }
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    async analyzeTravelRoute() {
        if (!this.startLocation) {
            this.showError('Please select a starting location.');
            return;
        }

        if (!this.endLocation) {
            this.showError('Please select a destination.');
            return;
        }

        if (!this.selectedDate) {
            this.showError('Please select a date.');
            return;
        }

        this.showLoading();

        try {
            const dateString = this.selectedDate.toISOString().split('T')[0];
            const url = `${this.apiBaseUrl}/api/v1/travel/analyze?` +
                       `start_latitude=${this.startLocation.lat}&` +
                       `start_longitude=${this.startLocation.lon}&` +
                       `end_latitude=${this.endLocation.lat}&` +
                       `end_longitude=${this.endLocation.lon}&` +
                       `date=${dateString}&` +
                       `baseline_years=20`;

            console.log('Fetching travel analysis from:', url);

            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `API request failed: ${response.status}`);
            }

            const data = await response.json();
            this.travelResults = data;
            this.displayTravelResults(data);
            
        } catch (error) {
            console.error('Travel analysis error:', error);
            this.showError(`Travel analysis failed: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    displayTravelResults(results) {
        // Show travel results section
        document.getElementById('travel-results-section').classList.remove('hidden');
        document.getElementById('travel-results-section').classList.add('fade-in');

        // Display travel distance
        document.getElementById('travel-distance').textContent = `${results.total_distance} km`;

        // Display travel summary
        document.getElementById('travel-summary-text').textContent = results.travel_summary;

        // Display route points
        this.displayRoutePoints(results.route_points);

        // Scroll to results
        document.getElementById('travel-results-section').scrollIntoView({ behavior: 'smooth' });
    }

    displayRoutePoints(routePoints) {
        const container = document.getElementById('route-points');
        container.innerHTML = '';

        routePoints.forEach((point, index) => {
            const pointElement = document.createElement('div');
            pointElement.className = `route-point ${point.type}`;

            let weatherHtml = '';
            if (point.weather_analysis) {
                const weather = point.weather_analysis;
                weatherHtml = `
                    <div class="route-point-weather">
                        <div class="weather-item">
                            <span class="weather-value">${weather.historical_averages?.temperature?.toFixed(1) || '--'}°C</span>
                            <span class="weather-label">Temp</span>
                        </div>
                        <div class="weather-item">
                            <span class="weather-value">${weather.historical_averages?.precipitation?.toFixed(1) || '--'}mm</span>
                            <span class="weather-label">Precip</span>
                        </div>
                        <div class="weather-item">
                            <span class="weather-value">${weather.historical_averages?.wind_speed?.toFixed(1) || '--'}m/s</span>
                            <span class="weather-label">Wind</span>
                        </div>
                    </div>
                `;
            }

            let aqiHtml = '';
            if (point.aqi_data) {
                const aqi = point.aqi_data;
                const aqiClass = this.getAQIClass(aqi.aqi);
                aqiHtml = `
                    <div class="route-point-aqi">
                        <div class="aqi-compact">
                            <span class="aqi-compact-value">${aqi.aqi}</span>
                            <span class="aqi-compact-category ${aqiClass}">${aqi.category}</span>
                        </div>
                    </div>
                `;
            }

            pointElement.innerHTML = `
                <div class="route-point-header">
                    <span class="route-point-type">${point.type}</span>
                    <span class="route-point-name">${point.location_name}</span>
                </div>
                ${weatherHtml}
                ${aqiHtml}
            `;

            container.appendChild(pointElement);
        });
    }

    getAQIClass(aqi) {
        if (aqi <= 50) return 'aqi-good';
        if (aqi <= 100) return 'aqi-moderate';
        if (aqi <= 150) return 'aqi-unhealthy-sensitive';
        if (aqi <= 200) return 'aqi-unhealthy';
        if (aqi <= 300) return 'aqi-very-unhealthy';
        return 'aqi-hazardous';
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WeatherProbabilityApp();
});

// Add some utility functions for weather calculations
function calculateProbability(data, threshold, operator = '>') {
    if (!data || data.length === 0) return 0;
    
    let count = 0;
    data.forEach(value => {
        if (operator === '>' && value > threshold) count++;
        else if (operator === '<' && value < threshold) count++;
        else if (operator === '>=' && value >= threshold) count++;
        else if (operator === '<=' && value <= threshold) count++;
    });
    
    return Math.round((count / data.length) * 100);
}

function calculateStats(data) {
    if (!data || data.length === 0) return { mean: 0, std: 0 };
    
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const std = Math.sqrt(variance);
    
    return { mean, std };
}

// Add keyboard navigation support
document.addEventListener('keydown', (e) => {
    // Close modal on Escape key
    if (e.key === 'Escape') {
        const modal = document.getElementById('custom-location-modal');
        if (!modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
        }
    }
    
    // Quick analysis on Ctrl+Enter
    if (e.ctrlKey && e.key === 'Enter') {
        const analyzeBtn = document.getElementById('analyze-btn');
        if (analyzeBtn) {
            analyzeBtn.click();
        }
    }
});