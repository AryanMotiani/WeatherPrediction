// Revolutionary Weather Prediction App - Team Pseudo Force
// NASA Space Apps Challenge 2025

class WeatherPredictionApp {
    constructor() {
        this.currentStep = 1;
        this.selectedPreset = null;
        this.customPreset = null;
        this.selectedMode = null;
        this.locations = {
            start: null,
            destination: null
        };
        this.dates = {
            start: null,
            end: null,
            target: null
        };
        this.map = null;
        this.currentMarkers = [];
        this.weatherData = null;
        this.healthData = null;
        this.charts = {};
        this.isMapInitialized = false;

        // App configuration with enhanced data
        this.config = {
            presets: {
                beach: {
                    name: "Perfect Beach Day",
                    icon: "🏖️",
                    description: "Warm, sunny with gentle breeze",
                    tempMin: 25, tempMax: 32, windMax: 15, humidityMax: 70, cloudMax: 20, precipMax: 2,
                    weights: { temp: 0.3, wind: 0.2, humidity: 0.15, precipitation: 0.25, air_quality: 0.1 }
                },
                hiking: {
                    name: "Ideal Hiking Weather", 
                    icon: "🥾",
                    description: "Cool, clear with low humidity",
                    tempMin: 15, tempMax: 25, windMax: 25, humidityMax: 60, cloudMax: 30, precipMax: 5,
                    weights: { temp: 0.25, wind: 0.15, humidity: 0.15, precipitation: 0.3, air_quality: 0.15 }
                },
                ski: {
                    name: "Prime Ski Conditions",
                    icon: "⛷️", 
                    description: "Cold, snowy with good visibility",
                    tempMin: -10, tempMax: 5, windMax: 30, humidityMax: 80, cloudMax: 70, precipMax: 20,
                    weights: { temp: 0.4, wind: 0.2, humidity: 0.1, precipitation: 0.2, air_quality: 0.1 }
                },
                photography: {
                    name: "Perfect Photography",
                    icon: "📷",
                    description: "Golden hour with dramatic clouds",
                    tempMin: 10, tempMax: 30, windMax: 20, humidityMax: 75, cloudMax: 70, precipMax: 0,
                    weights: { temp: 0.2, wind: 0.25, humidity: 0.15, precipitation: 0.35, air_quality: 0.05 }
                },
                stargazing: {
                    name: "Stargazing Paradise",
                    icon: "🌟",
                    description: "Clear skies, low humidity",
                    tempMin: 5, tempMax: 25, windMax: 15, humidityMax: 50, cloudMax: 10, precipMax: 0,
                    weights: { temp: 0.15, wind: 0.15, humidity: 0.2, precipitation: 0.4, air_quality: 0.1 }
                }
            },
            healthThresholds: {
                aqi: { good: [0, 50], moderate: [51, 100], unhealthy_sensitive: [101, 150], unhealthy: [151, 200], very_unhealthy: [201, 300], hazardous: [301, 500] },
                pm25: { good: [0, 12], moderate: [12.1, 35.4], unhealthy_sensitive: [35.5, 55.4], unhealthy: [55.5, 150.4], very_unhealthy: [150.5, 250.4], hazardous: [250.5, 999] },
                pm10: { good: [0, 54], moderate: [55, 154], unhealthy_sensitive: [155, 254], unhealthy: [255, 354], very_unhealthy: [355, 424], hazardous: [425, 999] }
            },
            riskLevels: {
                low: { color: "#10b981", range: [0, 25], label: "Low Risk" },
                medium: { color: "#f59e0b", range: [26, 50], label: "Medium Risk" },
                high: { color: "#f97316", range: [51, 75], label: "High Risk" },
                extreme: { color: "#ef4444", range: [76, 100], label: "Extreme Risk" }
            },
            geminiConfig: {
                apiKey: "AIzaSyBvfqGr4hRB8KVz3DpZNJCO24bXbRZKkm8",
                model: "gemini-pro"
            },
            loadingMessages: [
                "Connecting to NASA satellites...",
                "Analyzing historical weather patterns...", 
                "Processing air quality data...",
                "Calculating probability distributions..",
                "Generating health risk assessments...",
                "Preparing AI insights..."
            ]
        };

        // (Removed AQI tuning UI and persisted tuning values to keep UI minimal)

        this.init();
    }

    init() {
        this.startupAnimation();
        this.initializeTheme();
        setTimeout(() => {
            this.setupEventListeners();
            // ML integration self-check
            try {
                if (typeof window !== 'undefined' && window.weatherMLModel) {
                    console.log('ML status: weatherMLModel detected');
                    const keys = Object.keys(window.weatherMLModel.models || {});
                    console.log('ML models available:', keys.join(', '));
                } else {
                    console.log('ML status: weatherMLModel not found — using fallbacks');
                }
            } catch (e) { console.warn('ML self-check error', e); }
        }, 100);
    }

    // (AQI tuning and debug UI removed per user request)

    // Startup Animation Sequence
    startupAnimation() {
        this.animateLoading();
    }

    animateLoading() {
        let progress = 0;
        const progressBar = document.querySelector('.loading-progress');
        const loadingText = document.querySelector('.loading-text');
        const messages = this.config.loadingMessages;
        let messageIndex = 0;

        const loadingInterval = setInterval(() => {
            progress += Math.random() * 25 + 10;
            if (progress > 100) progress = 100;

            if (progressBar) {
                progressBar.style.width = progress + '%';
            }

            if (progress > (messageIndex + 1) * (100 / messages.length) && messageIndex < messages.length - 1) {
                messageIndex++;
                if (loadingText) {
                    loadingText.textContent = messages[messageIndex];
                }
            }

            if (progress >= 100) {
                clearInterval(loadingInterval);
                setTimeout(() => {
                    this.transitionToMainApp();
                }, 1000);
            }
        }, 150);
    }

    transitionToMainApp() {
        const startupScreen = document.getElementById('startupScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (startupScreen) {
            startupScreen.style.opacity = '0';
            startupScreen.style.transform = 'scale(1.1)';
            
            setTimeout(() => {
                startupScreen.style.display = 'none';
                if (mainApp) {
                    mainApp.classList.remove('hidden');
                    mainApp.style.opacity = '1';
                    mainApp.style.transform = 'translateY(0)';
                }
            }, 800);
        }
    }

    // Theme Management
    initializeTheme() {
        document.documentElement.setAttribute('data-color-scheme', 'dark');
        setTimeout(() => {
            const themeIcon = document.querySelector('.theme-icon');
            if (themeIcon) {
                themeIcon.textContent = '☀️';
            }
        }, 100);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-color-scheme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-color-scheme', newTheme);
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        }

        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);
        }
    }

    // Event Listeners Setup
    setupEventListeners() {
        console.log('Setting up event listeners...');

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Step navigation and other controls using event delegation
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            if (target.id === 'nextStep1') {
                e.preventDefault();
                this.nextStep();
            } else if (target.id === 'prevStep2') {
                e.preventDefault();
                this.prevStep();
            } else if (target.id === 'nextStep2') {
                e.preventDefault();
                this.nextStep();
            } else if (target.id === 'prevStep3') {
                e.preventDefault();
                this.prevStep();
            } else if (target.id === 'nextStep3') {
                e.preventDefault();
                this.nextStep();
            } else if (target.id === 'prevStep4') {
                e.preventDefault();
                this.prevStep();
            } else if (target.id === 'analyzeWeather') {
                e.preventDefault();
                this.analyzeWeather();
            } else if (target.closest('.preset-card')) {
                this.selectPreset(target.closest('.preset-card'));
            } else if (target.closest('.mode-card')) {
                this.selectMode(target.closest('.mode-card'));
            } else if (target.id === 'searchBtn') {
                this.searchLocation();
            } else if (target.id === 'searchStartBtn') {
                this.searchLocation('start');
            } else if (target.id === 'searchDestBtn') {
                this.searchLocation('dest');
            } else if (target.id === 'exportCSV') {
                this.exportData('csv');
            } else if (target.id === 'exportJSON') {
                this.exportData('json');
            } else if (target.id === 'exportPDF') {
                this.exportData('pdf');
            } else if (target.id === 'startOver') {
                this.startOver();
            }
        });

        // Location search enter keys
        const locationInputs = ['locationSearch', 'startLocationSearch', 'destLocationSearch'];
        locationInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if (inputId === 'startLocationSearch') {
                            this.searchLocation('start');
                        } else if (inputId === 'destLocationSearch') {
                            this.searchLocation('dest');
                        } else {
                            this.searchLocation();
                        }
                    }
                });
            }
        });

        this.setupCustomPresetSliders();
        this.showStep(1);
    }

    // Preset Selection
    selectPreset(card) {
        if (!card) return;
        
        document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        
        const presetType = card.dataset.preset;
        this.selectedPreset = presetType;

        const customBuilder = document.getElementById('customBuilder');
        if (presetType === 'custom' && customBuilder) {
            customBuilder.classList.remove('hidden');
        } else if (customBuilder) {
            customBuilder.classList.add('hidden');
        }
    }

    // Custom Preset Sliders
    setupCustomPresetSliders() {
        const sliders = {
            tempMin: 'tempMinVal',
            tempMax: 'tempMaxVal',
            windMax: 'windMaxVal',
            humidity: 'humidityVal',
            clouds: 'cloudsVal',
            precip: 'precipVal'
        };

        Object.keys(sliders).forEach(sliderId => {
            const slider = document.getElementById(sliderId);
            const display = document.getElementById(sliders[sliderId]);
            
            if (slider && display) {
                slider.addEventListener('input', (e) => {
                    display.textContent = e.target.value;
                    this.updateCustomPreset();
                });
                
                display.textContent = slider.value;
            }
        });
    }

    updateCustomPreset() {
        const customName = document.getElementById('customName');
        const tempMin = document.getElementById('tempMin');
        const tempMax = document.getElementById('tempMax');
        const windMax = document.getElementById('windMax');
        const humidity = document.getElementById('humidity');
        const clouds = document.getElementById('clouds');
        const precip = document.getElementById('precip');

        this.customPreset = {
            name: customName ? customName.value || 'Custom Weather' : 'Custom Weather',
            tempMin: tempMin ? parseInt(tempMin.value) : 20,
            tempMax: tempMax ? parseInt(tempMax.value) : 25,
            windMax: windMax ? parseInt(windMax.value) : 15,
            humidityMax: humidity ? parseInt(humidity.value) : 60,
            cloudMax: clouds ? parseInt(clouds.value) : 30,
            precipMax: precip ? parseInt(precip.value) : 2,
            weights: { temp: 0.25, wind: 0.2, humidity: 0.15, precipitation: 0.25, air_quality: 0.15 }
        };
    }

    // Mode Selection with enhanced UI updates
    selectMode(card) {
        if (!card) return;
        
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        
        this.selectedMode = card.dataset.mode;

        // Update UI based on mode
        const locationHeader = document.getElementById('locationHeader');
        const dateHeader = document.getElementById('dateHeader');
        const singleDatePicker = document.getElementById('singleDatePicker');
        const rangeDatePicker = document.getElementById('rangeDatePicker');
        const destinationContainer = document.getElementById('destinationSearchContainer');
        const travelContainer = document.getElementById('travelSearchContainer');

        if (this.selectedMode === 'travel') {
            if (locationHeader) locationHeader.textContent = 'Select Start and Destination Locations';
            if (dateHeader) dateHeader.textContent = 'Select Travel Dates';
            if (singleDatePicker) singleDatePicker.classList.add('hidden');
            if (rangeDatePicker) rangeDatePicker.classList.remove('hidden');
            if (destinationContainer) destinationContainer.classList.add('hidden');
            if (travelContainer) travelContainer.classList.remove('hidden');
        } else {
            if (locationHeader) locationHeader.textContent = 'Select Destination Location';
            if (dateHeader) dateHeader.textContent = 'Select Target Date';
            if (singleDatePicker) singleDatePicker.classList.remove('hidden');
            if (rangeDatePicker) rangeDatePicker.classList.add('hidden');
            if (destinationContainer) destinationContainer.classList.remove('hidden');
            if (travelContainer) travelContainer.classList.add('hidden');
        }
    }

    // Map Initialization
    initializeMap() {
        if (this.isMapInitialized) return;

        const mapElement = document.getElementById('map');
        if (!mapElement) return;

        try {
            this.map = L.map('map', {
                center: [40.7128, -74.0060],
                zoom: 4,
                zoomControl: true
            });
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18
            }).addTo(this.map);

            this.map.on('click', (e) => {
                this.selectLocationOnMap(e);
            });

            this.isMapInitialized = true;
            
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                }
            }, 300);

        } catch (error) {
            console.error('Map initialization error:', error);
        }
    }

    // Enhanced Location Search
    async searchLocation(type = 'destination') {
        let locationSearch;
        if (type === 'start') {
            locationSearch = document.getElementById('startLocationSearch');
        } else if (type === 'dest') {
            locationSearch = document.getElementById('destLocationSearch');
        } else {
            locationSearch = document.getElementById('locationSearch');
        }
        
        if (!locationSearch) return;
        
        const query = locationSearch.value.trim();
        if (!query) return;

        console.log('Searching for:', query, 'type:', type);

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const results = await response.json();
            
            if (results.length > 0) {
                const result = results[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);
                
                if (this.map) {
                    this.map.setView([lat, lng], 10);
                    this.selectLocationOnMap({ latlng: { lat, lng } }, result.display_name, type);
                }
                this.showNotification('Location found!', 'success');
            } else {
                this.showNotification('Location not found. Try a different search term.', 'warning');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showNotification('Search failed. Please try again.', 'error');
        }
    }

    // Enhanced Map Location Selection
    selectLocationOnMap(e, displayName = null, searchType = null) {
        if (!e.latlng || !this.map) return;
        
        const { lat, lng } = e.latlng;
        
        if (this.selectedMode === 'destination') {
            this.clearMarkers();
            const marker = L.marker([lat, lng]).addTo(this.map);
            this.currentMarkers.push(marker);
            
            this.locations.destination = { 
                lat, 
                lng, 
                name: displayName || `${lat.toFixed(4)}, ${lng.toFixed(4)}` 
            };
            
        } else if (this.selectedMode === 'travel') {
            if (searchType === 'start' || (!this.locations.start && !searchType)) {
                // Clear existing start marker if any
                if (this.locations.start) {
                    this.clearMarkers();
                }
                
                const marker = L.marker([lat, lng]).addTo(this.map);
                this.currentMarkers.push(marker);
                
                this.locations.start = { 
                    lat, 
                    lng, 
                    name: displayName || `${lat.toFixed(4)}, ${lng.toFixed(4)}` 
                };
                
            } else if (searchType === 'dest' || (!this.locations.destination && this.locations.start)) {
                const marker = L.marker([lat, lng]).addTo(this.map);
                this.currentMarkers.push(marker);
                
                this.locations.destination = { 
                    lat, 
                    lng, 
                    name: displayName || `${lat.toFixed(4)}, ${lng.toFixed(4)}` 
                };
                
                // Draw route line
                if (this.locations.start) {
                    const polyline = L.polyline([
                        [this.locations.start.lat, this.locations.start.lng],
                        [this.locations.destination.lat, this.locations.destination.lng]
                    ], { color: '#1FB8CD', weight: 3 }).addTo(this.map);
                    this.currentMarkers.push(polyline);
                }
            }
        }
        
        this.updateLocationDisplay();
    }

    clearMarkers() {
        if (!this.map) return;
        
        this.currentMarkers.forEach(marker => {
            try {
                this.map.removeLayer(marker);
            } catch (e) {
                console.log('Error removing marker:', e);
            }
        });
        this.currentMarkers = [];
    }

    updateLocationDisplay() {
        const startDisplay = document.getElementById('startLocation');
        const destDisplay = document.getElementById('destLocation');

        if (startDisplay) startDisplay.classList.add('hidden');
        if (destDisplay) destDisplay.classList.add('hidden');

        if (this.selectedMode === 'destination' && this.locations.destination) {
            if (destDisplay) {
                destDisplay.classList.remove('hidden');
                const locationText = destDisplay.querySelector('.location-text');
                const locationCoords = destDisplay.querySelector('.location-coords');
                if (locationText) locationText.textContent = this.locations.destination.name;
                if (locationCoords) locationCoords.textContent = 
                    `${this.locations.destination.lat.toFixed(4)}, ${this.locations.destination.lng.toFixed(4)}`;
            }
            
        } else if (this.selectedMode === 'travel') {
            if (this.locations.start && startDisplay) {
                startDisplay.classList.remove('hidden');
                const locationText = startDisplay.querySelector('.location-text');
                const locationCoords = startDisplay.querySelector('.location-coords');
                if (locationText) locationText.textContent = this.locations.start.name;
                if (locationCoords) locationCoords.textContent = 
                    `${this.locations.start.lat.toFixed(4)}, ${this.locations.start.lng.toFixed(4)}`;
            }
            
            if (this.locations.destination && destDisplay) {
                destDisplay.classList.remove('hidden');
                const locationText = destDisplay.querySelector('.location-text');
                const locationCoords = destDisplay.querySelector('.location-coords');
                if (locationText) locationText.textContent = this.locations.destination.name;
                if (locationCoords) locationCoords.textContent = 
                    `${this.locations.destination.lat.toFixed(4)}, ${this.locations.destination.lng.toFixed(4)}`;
            }
        }
    }

    // Step Navigation
    nextStep() {
        if (!this.validateCurrentStep()) return;
        
        if (this.currentStep < 5) {
            this.currentStep++;
            this.showStep(this.currentStep);
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    }

    showStep(stepNumber) {
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
        });
        const targetStepNav = document.querySelector(`[data-step="${stepNumber}"]`);
        if (targetStepNav) {
            targetStepNav.classList.add('active');
        }

        document.querySelectorAll('.step-section').forEach(section => {
            section.classList.remove('active');
            section.classList.add('hidden');
        });

        const targetSection = document.getElementById(`step${stepNumber}`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            targetSection.classList.add('active');
        }

        if (stepNumber === 3) {
            setTimeout(() => {
                this.initializeMap();
            }, 200);
        }
    }

    validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                if (!this.selectedPreset) {
                    this.showNotification('Please select a weather preset', 'warning');
                    return false;
                }
                if (this.selectedPreset === 'custom') {
                    this.updateCustomPreset();
                }
                return true;
            
            case 2:
                if (!this.selectedMode) {
                    this.showNotification('Please select an analysis mode', 'warning');
                    return false;
                }
                return true;
            
            case 3:
                if (this.selectedMode === 'destination' && !this.locations.destination) {
                    this.showNotification('Please select a destination location', 'warning');
                    return false;
                }
                if (this.selectedMode === 'travel' && (!this.locations.start || !this.locations.destination)) {
                    this.showNotification('Please select both start and destination locations', 'warning');
                    return false;
                }
                return true;
            
            case 4:
                if (this.selectedMode === 'destination') {
                    const targetDate = document.getElementById('targetDate');
                    if (!targetDate || !targetDate.value) {
                        this.showNotification('Please select a target date', 'warning');
                        return false;
                    }
                    this.dates.target = targetDate.value;
                } else {
                    const startDate = document.getElementById('startDate');
                    const endDate = document.getElementById('endDate');
                    if (!startDate || !endDate || !startDate.value || !endDate.value) {
                        this.showNotification('Please select both start and end dates', 'warning');
                        return false;
                    }
                    this.dates.start = startDate.value;
                    this.dates.end = endDate.value;
                }
                return true;
            
            default:
                return true;
        }
    }

    // Enhanced Weather Analysis
    async analyzeWeather() {
        console.log('Starting enhanced weather analysis...');
        this.showProcessingScreen();
        
        try {
            await this.fetchWeatherData();
            await this.fetchHealthData();
            const analysis = this.processWeatherData();
            const healthAnalysis = this.processHealthData();
            const probabilities = this.calculateProbabilities();
            const suitabilityScore = this.calculateSuitabilityScore(analysis, healthAnalysis, probabilities);
            const aiRecommendation = await this.getEnhancedAIRecommendation(analysis, healthAnalysis, probabilities, suitabilityScore);
            // Debug: log scored components for easier tuning (weather, health, risk)
            try {
                console.info('Suitability components', {
                    weatherScore: typeof analysis.overallProbability === 'number' ? analysis.overallProbability : null,
                    healthAQI: healthAnalysis && healthAnalysis.aqi ? healthAnalysis.aqi.value : null,
                    suitabilityScore
                });
            } catch (e) { /* no-op */ }

            this.showResults(analysis, healthAnalysis, probabilities, suitabilityScore, aiRecommendation);
            
        } catch (error) {
            console.error('Weather analysis error:', error);
            this.showNotification('Analysis failed. Please try again.', 'error');
            this.hideProcessingScreen();
        }
    }

    showProcessingScreen() {
        const processingScreen = document.getElementById('processingScreen');
        if (processingScreen) {
            processingScreen.classList.remove('hidden');
        }

        let progress = 0;
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        const processingMessage = document.querySelector('.processing-message');
        
        const messages = this.config.loadingMessages;
        let messageIndex = 0;

        this.processingInterval = setInterval(() => {
            progress += Math.random() * 20 + 5;
            if (progress > 100) progress = 100;

            if (progressFill) progressFill.style.width = progress + '%';
            if (progressText) progressText.textContent = Math.round(progress) + '%';

            if (progress > (messageIndex + 1) * (100 / messages.length) && processingMessage && messageIndex < messages.length - 1) {
                messageIndex++;
                processingMessage.textContent = messages[messageIndex];
            }

            if (progress >= 100) {
                clearInterval(this.processingInterval);
            }
        }, 200);
    }

    hideProcessingScreen() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
        }
        
        const processingScreen = document.getElementById('processingScreen');
        if (processingScreen) {
            processingScreen.classList.add('hidden');
        }
    }

    async fetchWeatherData() {
        console.log('Fetching weather data...');
        const location = this.locations.destination || this.locations.start;
        // Prefer ML-based generation if available (injected by weather_ml_integration.js)
        if (typeof window !== 'undefined' && typeof window.generateSimulatedWeatherData === 'function') {
            try {
                this.weatherData = window.generateSimulatedWeatherData(location.lat, location.lng);
            } catch (e) {
                console.warn('ML generateSimulatedWeatherData failed, falling back to simulation:', e);
                await new Promise(resolve => setTimeout(resolve, 800));
                this.weatherData = this.generateSimulatedWeatherDataFallback(location.lat, location.lng);
            }
        } else {
            await new Promise(resolve => setTimeout(resolve, 1500));
            this.weatherData = this.generateSimulatedWeatherDataFallback(location.lat, location.lng);
        }
    }

    async fetchHealthData() {
        console.log('Fetching health/air quality data...');
        const location = this.locations.destination || this.locations.start;
        // Prefer ML-based health generation if available
        if (typeof window !== 'undefined' && typeof window.generateSimulatedHealthData === 'function') {
            try {
                this.healthData = window.generateSimulatedHealthData(location.lat, location.lng);
            } catch (e) {
                console.warn('ML generateSimulatedHealthData failed, falling back to simulation:', e);
                await new Promise(resolve => setTimeout(resolve, 800));
                this.healthData = this.generateSimulatedHealthDataFallback(location.lat, location.lng);
            }
        } else {
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.healthData = this.generateSimulatedHealthDataFallback(location.lat, location.lng);
        }
    }

    // Fallback implementations (previous simulation logic moved here)
    generateSimulatedWeatherDataFallback(lat, lng) {
        // Use original simulation to keep app functional if ML not loaded
        const currentDate = new Date();
        const month = currentDate.getMonth();
        
        let baseTempMin, baseTempMax, baseHumidity, basePrecip;
        
        if (Math.abs(lat) < 23.5) {
            baseTempMin = 22 + Math.sin(month * Math.PI / 6) * 3;
            baseTempMax = 32 + Math.sin(month * Math.PI / 6) * 4;
            baseHumidity = 70 + Math.random() * 20;
            basePrecip = 5 + Math.random() * 15;
        } else if (Math.abs(lat) < 50) {
            baseTempMin = 10 + Math.sin(month * Math.PI / 6) * 15;
            baseTempMax = 20 + Math.sin(month * Math.PI / 6) * 20;
            baseHumidity = 50 + Math.random() * 30;
            basePrecip = 2 + Math.random() * 10;
        } else {
            baseTempMin = -5 + Math.sin(month * Math.PI / 6) * 20;
            baseTempMax = 5 + Math.sin(month * Math.PI / 6) * 25;
            baseHumidity = 60 + Math.random() * 20;
            basePrecip = 1 + Math.random() * 8;
        }

        const historicalData = [];
        for (let i = 0; i < 30; i++) {
            const temp = baseTempMin + Math.random() * (baseTempMax - baseTempMin);
            const humidity = Math.max(0, Math.min(100, baseHumidity + (Math.random() - 0.5) * 40));
            const windSpeed = 5 + Math.random() * 25;
            const precipitation = Math.random() > 0.7 ? basePrecip * Math.random() : 0;
            
            historicalData.push({
                date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
                temperature: temp,
                tempMax: Math.max(temp, baseTempMax + (Math.random() - 0.5) * 5),
                tempMin: Math.min(temp, baseTempMin + (Math.random() - 0.5) * 5),
                humidity: humidity,
                precipitation: precipitation,
                windSpeed: windSpeed,
                cloudCover: Math.random() * 100
            });
        }

        return {
            location: { lat, lng },
            historical: historicalData,
            averages: {
                temperature: historicalData.reduce((sum, day) => sum + day.temperature, 0) / 30,
                tempMax: historicalData.reduce((sum, day) => sum + day.tempMax, 0) / 30,
                tempMin: historicalData.reduce((sum, day) => sum + day.tempMin, 0) / 30,
                humidity: historicalData.reduce((sum, day) => sum + day.humidity, 0) / 30,
                precipitation: historicalData.reduce((sum, day) => sum + day.precipitation, 0) / 30,
                windSpeed: historicalData.reduce((sum, day) => sum + day.windSpeed, 0) / 30,
                cloudCover: historicalData.reduce((sum, day) => sum + day.cloudCover, 0) / 30
            }
        };
    }

    generateSimulatedHealthDataFallback(lat, lng) {
        const isUrban = Math.abs(lat) > 30 && Math.abs(lng) > 30;
        const industrialFactor = Math.random() > 0.8 ? 1.3 : 1.0;
        const seasonalFactor = 0.9 + Math.random() * 0.3;

        // Base AQI with smaller random swings, then clamp to 0-250
        const baseAQI = isUrban ? (40 + Math.random() * 80) : (10 + Math.random() * 30);
        let adjustedAQI = baseAQI * industrialFactor * seasonalFactor;
        adjustedAQI = Math.max(0, Math.min(250, Math.round(adjustedAQI)));

        return {
            aqi: adjustedAQI,
            pm25: Math.round(Math.min(150, adjustedAQI * 0.35 + Math.random() * 8)),
            pm10: Math.round(Math.min(200, adjustedAQI * 0.6 + Math.random() * 15)),
            no2: Math.round(10 + Math.random() * 40 * (isUrban ? 1.3 : 0.6)),
            o3: Math.round(20 + Math.random() * 60),
            so2: Math.round(5 + Math.random() * 12 * industrialFactor),
            timestamp: new Date().toISOString()
        };
    }

    generateSimulatedWeatherData(lat, lng) {
        const currentDate = new Date();
        const month = currentDate.getMonth();
        
        let baseTempMin, baseTempMax, baseHumidity, basePrecip;
        
        if (Math.abs(lat) < 23.5) {
            baseTempMin = 22 + Math.sin(month * Math.PI / 6) * 3;
            baseTempMax = 32 + Math.sin(month * Math.PI / 6) * 4;
            baseHumidity = 70 + Math.random() * 20;
            basePrecip = 5 + Math.random() * 15;
        } else if (Math.abs(lat) < 50) {
            baseTempMin = 10 + Math.sin(month * Math.PI / 6) * 15;
            baseTempMax = 20 + Math.sin(month * Math.PI / 6) * 20;
            baseHumidity = 50 + Math.random() * 30;
            basePrecip = 2 + Math.random() * 10;
        } else {
            baseTempMin = -5 + Math.sin(month * Math.PI / 6) * 20;
            baseTempMax = 5 + Math.sin(month * Math.PI / 6) * 25;
            baseHumidity = 60 + Math.random() * 20;
            basePrecip = 1 + Math.random() * 8;
        }

        const historicalData = [];
        for (let i = 0; i < 30; i++) {
            const temp = baseTempMin + Math.random() * (baseTempMax - baseTempMin);
            const humidity = Math.max(0, Math.min(100, baseHumidity + (Math.random() - 0.5) * 40));
            const windSpeed = 5 + Math.random() * 25;
            const precipitation = Math.random() > 0.7 ? basePrecip * Math.random() : 0;
            
            historicalData.push({
                date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
                temperature: temp,
                tempMax: Math.max(temp, baseTempMax + (Math.random() - 0.5) * 5),
                tempMin: Math.min(temp, baseTempMin + (Math.random() - 0.5) * 5),
                humidity: humidity,
                precipitation: precipitation,
                windSpeed: windSpeed,
                cloudCover: Math.random() * 100
            });
        }

        return {
            location: { lat, lng },
            historical: historicalData,
            averages: {
                temperature: historicalData.reduce((sum, day) => sum + day.temperature, 0) / 30,
                tempMax: historicalData.reduce((sum, day) => sum + day.tempMax, 0) / 30,
                tempMin: historicalData.reduce((sum, day) => sum + day.tempMin, 0) / 30,
                humidity: historicalData.reduce((sum, day) => sum + day.humidity, 0) / 30,
                precipitation: historicalData.reduce((sum, day) => sum + day.precipitation, 0) / 30,
                windSpeed: historicalData.reduce((sum, day) => sum + day.windSpeed, 0) / 30,
                cloudCover: historicalData.reduce((sum, day) => sum + day.cloudCover, 0) / 30
            }
        };
    }

    generateSimulatedHealthData(lat, lng) {
        // Simulate air quality based on location (urban vs rural, industrial areas, etc.)
        const isUrban = Math.abs(lat) > 30 && Math.abs(lng) > 30;
        const industrialFactor = Math.random() > 0.7 ? 1.5 : 1.0;
        const seasonalFactor = 0.8 + Math.random() * 0.4;
        
        const baseAQI = isUrban ? (50 + Math.random() * 100) : (10 + Math.random() * 40);
        const adjustedAQI = Math.min(300, baseAQI * industrialFactor * seasonalFactor);
        
        return {
            aqi: Math.round(adjustedAQI),
            pm25: Math.round(adjustedAQI * 0.4 + Math.random() * 10),
            pm10: Math.round(adjustedAQI * 0.6 + Math.random() * 20),
            no2: Math.round(10 + Math.random() * 80 * (isUrban ? 1.5 : 0.5)),
            o3: Math.round(20 + Math.random() * 120),
            so2: Math.round(5 + Math.random() * 30 * industrialFactor),
            timestamp: new Date().toISOString()
        };
    }

    processWeatherData() {
        const { historical } = this.weatherData;
        const preset = this.selectedPreset === 'custom' ? this.customPreset : this.config.presets[this.selectedPreset];
        
        const analysis = {
            temperatureProbability: this.calculateProbability(historical, preset, 'temperature'),
            precipitationProbability: this.calculateProbability(historical, preset, 'precipitation'),
            windProbability: this.calculateProbability(historical, preset, 'wind'),
            cloudProbability: this.calculateProbability(historical, preset, 'cloud'),
            chartData: this.prepareChartData(historical)
        };

        analysis.overallProbability = Math.round((
            analysis.temperatureProbability +
            analysis.precipitationProbability +
            analysis.windProbability +
            analysis.cloudProbability
        ) / 4);

        return analysis;
    }

    processHealthData() {
        const health = this.healthData;
        // Use raw AQI from health data (no tuning)
        return {
            aqi: {
                value: health.aqi,
                status: this.getHealthStatus('aqi', health.aqi),
                level: this.getHealthLevel('aqi', health.aqi)
            },
            pm25: {
                value: health.pm25,
                status: this.getHealthStatus('pm25', health.pm25),
                level: this.getHealthLevel('pm25', health.pm25)
            },
            pm10: {
                value: health.pm10,
                status: this.getHealthStatus('pm10', health.pm10),
                level: this.getHealthLevel('pm10', health.pm10)
            },
            no2: {
                value: health.no2,
                status: 'Moderate',
                level: 2
            },
            o3: {
                value: health.o3,
                status: 'Moderate',
                level: 2
            },
            so2: {
                value: health.so2,
                status: 'Good',
                level: 1
            }
        };
    }

    getHealthStatus(type, value) {
        const thresholds = this.config.healthThresholds[type];
        if (!thresholds) return 'Moderate';
        
        if (value <= thresholds.good[1]) return 'Good';
        if (value <= thresholds.moderate[1]) return 'Moderate';
        if (value <= thresholds.unhealthy_sensitive[1]) return 'Unhealthy for Sensitive Groups';
        if (value <= thresholds.unhealthy[1]) return 'Unhealthy';
        if (value <= thresholds.very_unhealthy[1]) return 'Very Unhealthy';
        return 'Hazardous';
    }

    getHealthLevel(type, value) {
        const status = this.getHealthStatus(type, value);
        const levelMap = {
            'Good': 1,
            'Moderate': 2,
            'Unhealthy for Sensitive Groups': 3,
            'Unhealthy': 4,
            'Very Unhealthy': 5,
            'Hazardous': 6
        };
        return levelMap[status] || 2;
    }

    calculateProbabilities() {
        const { historical, averages } = this.weatherData;
        
        // Calculate percentiles for risk assessment
        const temps = historical.map(d => d.temperature).sort((a, b) => a - b);
        const precips = historical.map(d => d.precipitation).sort((a, b) => a - b);
        const winds = historical.map(d => d.windSpeed).sort((a, b) => a - b);
        const humidities = historical.map(d => d.humidity).sort((a, b) => a - b);
        
        const percentile = (arr, p) => arr[Math.floor(arr.length * p / 100)];
        
        return {
            rain: Math.round(Math.min(100, (averages.precipitation * 3.5))),
            heavyRain: Math.round(precips.filter(p => p > percentile(precips, 90)).length / precips.length * 100),
            extremeHeat: Math.round(temps.filter(t => t > percentile(temps, 90)).length / temps.length * 100),
            extremeCold: Math.round(temps.filter(t => t < percentile(temps, 10)).length / temps.length * 100),
            highWind: Math.round(winds.filter(w => w > percentile(winds, 85)).length / winds.length * 100),
            highHumidity: Math.round(humidities.filter(h => h > 80).length / humidities.length * 100),
            uncomfortable: Math.round((
                (temps.filter(t => t > percentile(temps, 90) || t < percentile(temps, 10)).length / temps.length * 100) +
                (humidities.filter(h => h > 80).length / humidities.length * 100) +
                (winds.filter(w => w > percentile(winds, 85)).length / winds.length * 100)
            ) / 3)
        };
    }

    calculateSuitabilityScore(weatherAnalysis, healthAnalysis, probabilities) {
        // Compute a normalized suitability score using three components:
        // - Weather match (component of preset-related probabilities)
        // - Health (derived from AQI normalized to 0-100 using AQI scale 0-500)
        // - Risk (inverted average of extreme risks)
        // Combine with weights: weather 70%, health 20%, risk 10% for a clear overall score

        const preset = this.selectedPreset === 'custom' ? this.customPreset : this.config.presets[this.selectedPreset] || {};
        const weights = preset.weights || { temp: 0.3, wind: 0.2, humidity: 0.15, precipitation: 0.25, air_quality: 0.1 };

        // Prefer ML-provided suitability score for weather when available (from mlPredictions)
        let weatherScore;
        try {
            if (this.weatherData && this.weatherData.mlPredictions && typeof this.weatherData.mlPredictions.suitabilityScore === 'number') {
                weatherScore = Math.round(this.weatherData.mlPredictions.suitabilityScore);
            }
        } catch (e) { /* ignore */ }

        // Use per-component match probabilities when ML suitability is not available
        if (typeof weatherScore !== 'number') {
            const tempProb = typeof weatherAnalysis.temperatureProbability === 'number' ? weatherAnalysis.temperatureProbability : (weatherAnalysis.overallProbability || 50);
            const precipProb = typeof weatherAnalysis.precipitationProbability === 'number' ? weatherAnalysis.precipitationProbability : (weatherAnalysis.overallProbability || 50);
            const windProb = typeof weatherAnalysis.windProbability === 'number' ? weatherAnalysis.windProbability : (weatherAnalysis.overallProbability || 50);
            const cloudProb = typeof weatherAnalysis.cloudProbability === 'number' ? weatherAnalysis.cloudProbability : (weatherAnalysis.overallProbability || 50);

            // Normalize weather weights so they sum to 1 across weather components
            const weatherWeightSum = (weights.temp || 0) + (weights.wind || 0) + (weights.humidity || 0) + (weights.precipitation || 0);
            const wTemp = (weights.temp || 0) / (weatherWeightSum || 1);
            const wWind = (weights.wind || 0) / (weatherWeightSum || 1);
            const wHumidity = (weights.humidity || 0) / (weatherWeightSum || 1);
            const wPrecip = (weights.precipitation || 0) / (weatherWeightSum || 1);

            // Weather component as weighted average (0-100)
            weatherScore = Math.round(
                tempProb * wTemp +
                windProb * wWind +
                (typeof weatherAnalysis.humidityProbability === 'number' ? weatherAnalysis.humidityProbability : cloudProb) * wHumidity +
                precipProb * wPrecip
            );
        }

        // ...weatherScore already computed above (either ML-provided or per-component)

    // Health component: normalize AQI into 0-100 where lower AQI -> higher score
    // Restored to previous mapping (AQI 0-500 => health 0-100) so AQI behavior matches earlier release
    const aqiVal = healthAnalysis && healthAnalysis.aqi && typeof healthAnalysis.aqi.value === 'number' ? healthAnalysis.aqi.value : 50;
    const healthScore = Math.max(0, Math.min(100, Math.round(100 - (aqiVal / 500) * 100)));

    // Risk component: consider risks with reasonable probability; lower threshold so risks surface where needed
    const riskCandidates = [probabilities.extremeHeat || 0, probabilities.extremeCold || 0, probabilities.highWind || 0, probabilities.uncomfortable || 0];
    const significant = riskCandidates.filter(r => r > 30);
        let riskScore;
        if (significant.length === 0) {
            // No significant risks -> high risk score
            riskScore = 100;
        } else {
            const avgSignificant = significant.reduce((a, b) => a + b, 0) / significant.length;
            riskScore = Math.max(0, Math.min(100, Math.round(100 - avgSignificant)));
        }

        // Final weighted combination: favor weather (75%), health 20%, risk 5%
        const finalScore = Math.round(
            weatherScore * 0.75 +
            healthScore * 0.2 +
            riskScore * 0.05
        );
        // No location-specific hard-coded boosts here — keep scoring general and consistent across locations
        return Math.min(100, Math.max(0, finalScore));
    }

    calculateProbability(historical, preset, type) {
        let matchingDays;
        
        switch (type) {
            case 'temperature':
                matchingDays = historical.filter(day => 
                    day.temperature >= preset.tempMin && day.temperature <= preset.tempMax
                );
                break;
            case 'precipitation':
                matchingDays = historical.filter(day => day.precipitation <= preset.precipMax);
                break;
            case 'wind':
                matchingDays = historical.filter(day => day.windSpeed <= preset.windMax);
                break;
            case 'cloud':
                matchingDays = historical.filter(day => day.cloudCover <= preset.cloudMax);
                break;
        }
        
        return Math.round((matchingDays.length / historical.length) * 100);
    }

    prepareChartData(historical) {
        // Smooth temperature series for charts using a small moving average to reduce noise
        const slice = historical.slice(-10);
        const dates = slice.map(day => day.date.toLocaleDateString());
        const tempsRaw = slice.map(day => day.temperature);

        // moving average window (odd number)
        const smooth = (arr, window = 3) => {
            const res = [];
            const half = Math.floor(window / 2);
            for (let i = 0; i < arr.length; i++) {
                let sum = 0, count = 0;
                for (let j = i - half; j <= i + half; j++) {
                    if (j >= 0 && j < arr.length) { sum += arr[j]; count++; }
                }
                res.push(count ? Math.round((sum / count) * 10) / 10 : arr[i]);
            }
            return res;
        };

        const temperatures = smooth(tempsRaw, 3);
        const precipitation = slice.map(day => Math.round(day.precipitation * 10) / 10);

        return { dates, temperatures, precipitation };
    }

    async getEnhancedAIRecommendation(weatherAnalysis, healthAnalysis, probabilities, suitabilityScore) {
        console.log('Getting enhanced AI recommendation...');
        
        try {
            // Try Gemini API first
            const geminiResponse = await this.callGeminiAPI(weatherAnalysis, healthAnalysis, probabilities, suitabilityScore);
            if (geminiResponse) {
                return geminiResponse;
            }
        } catch (error) {
            console.warn('Gemini API failed, using fallback:', error);
        }
        
        // Fallback to simulated AI response
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.generateFallbackRecommendation(weatherAnalysis, healthAnalysis, probabilities, suitabilityScore);
    }

    async callGeminiAPI(weatherAnalysis, healthAnalysis, probabilities, suitabilityScore) {
        const preset = this.selectedPreset === 'custom' ? this.customPreset : this.config.presets[this.selectedPreset];
        const location = this.locations.destination || this.locations.start;
        
        const prompt = `As a weather and health expert, analyze this data for ${preset.name} conditions:

Location: ${location.name}
Mode: ${this.selectedMode}
Suitability Score: ${suitabilityScore}/100

Weather Probabilities:
- Temperature match: ${weatherAnalysis.temperatureProbability}%
- Precipitation: ${weatherAnalysis.precipitationProbability}%
- Wind: ${weatherAnalysis.windProbability}%

Risk Probabilities:
- Rain: ${probabilities.rain}%
- Heavy rain: ${probabilities.heavyRain}%
- Extreme heat: ${probabilities.extremeHeat}%
- Extreme cold: ${probabilities.extremeCold}%
- High wind: ${probabilities.highWind}%
- High humidity: ${probabilities.highHumidity}%
- Uncomfortable conditions: ${probabilities.uncomfortable}%

Air Quality:
- AQI: ${healthAnalysis.aqi.value} (${healthAnalysis.aqi.status})
- PM2.5: ${healthAnalysis.pm25.value} μg/m³
- PM10: ${healthAnalysis.pm10.value} μg/m³

Provide a concise recommendation (2-3 sentences) about whether conditions are suitable, key risks to consider, and health precautions if needed.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.config.geminiConfig.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        }
        
        throw new Error('API request failed');
    }

    generateFallbackRecommendation(weatherAnalysis, healthAnalysis, probabilities, suitabilityScore) {
        const preset = this.selectedPreset === 'custom' ? this.customPreset : this.config.presets[this.selectedPreset];
        
        let response = "";
        
        if (suitabilityScore >= 75) {
            response = `Excellent conditions for ${preset.name}! With a ${suitabilityScore}% suitability score, this looks perfect. `;
        } else if (suitabilityScore >= 50) {
            response = `Good prospects with ${suitabilityScore}% suitability for ${preset.name}. `;
        } else {
            response = `Challenging conditions with ${suitabilityScore}% suitability. Consider adjusting your plans. `;
        }

        // Add health considerations
        if (healthAnalysis.aqi.value > 100) {
            response += `⚠️ Air quality is ${healthAnalysis.aqi.status.toLowerCase()} (AQI: ${healthAnalysis.aqi.value}). Limit outdoor activities and consider wearing a mask. `;
        } else if (healthAnalysis.aqi.value > 50) {
            response += `Air quality is moderate (AQI: ${healthAnalysis.aqi.value}). Sensitive individuals should take precautions. `;
        }

        // Add risk warnings
        if (probabilities.uncomfortable > 50) {
            response += "High chance of uncomfortable conditions - plan accordingly.";
        }

        return response;
    }

    showResults(weatherAnalysis, healthAnalysis, probabilities, suitabilityScore, aiRecommendation) {
        console.log('Showing enhanced results...');
        this.hideProcessingScreen();
        this.currentStep = 5;
        this.showStep(5);

        setTimeout(() => {
            this.updateProbabilityCards(probabilities);
            this.updateRiskAssessment(suitabilityScore);
            this.updateHealthCards(healthAnalysis);
            this.updateResultsUI(weatherAnalysis);
            this.createCharts(weatherAnalysis.chartData);
            this.showAIRecommendation(aiRecommendation);
        }, 500);
    }

    updateProbabilityCards(probabilities) {
        const probabilityData = {
            'rain': { value: probabilities.rain, icon: '🌧️', label: 'Rain Probability' },
            'heavy-rain': { value: probabilities.heavyRain, icon: '⛈️', label: 'Heavy Rain Risk' },
            'extreme-heat': { value: probabilities.extremeHeat, icon: '🔥', label: 'Extreme Heat Risk' },
            'extreme-cold': { value: probabilities.extremeCold, icon: '❄️', label: 'Extreme Cold Risk' },
            'high-wind': { value: probabilities.highWind, icon: '💨', label: 'High Wind Risk' },
            'high-humidity': { value: probabilities.highHumidity, icon: '💧', label: 'High Humidity Risk' },
            'uncomfortable': { value: probabilities.uncomfortable, icon: '😣', label: 'Uncomfortable Conditions' }
        };

        Object.keys(probabilityData).forEach(type => {
            const card = document.querySelector(`[data-type="${type}"]`);
            if (card) {
                const data = probabilityData[type];
                const valueElement = card.querySelector('.probability-value');
                const fillElement = card.querySelector('.probability-fill');
                
                if (valueElement) valueElement.textContent = `${data.value}%`;
                if (fillElement) {
                    fillElement.style.width = `${data.value}%`;
                }
                
                // Set risk level color
                const riskLevel = this.getRiskLevel(data.value);
                card.setAttribute('data-risk', riskLevel);
            }
        });
    }

    getRiskLevel(value) {
        if (value <= 25) return 'low';
        if (value <= 50) return 'medium';
        if (value <= 75) return 'high';
        return 'extreme';
    }

    updateRiskAssessment(suitabilityScore) {
        const scoreElement = document.getElementById('suitabilityScore');
        const riskLevelElement = document.getElementById('riskLevel');
        const riskDescriptionElement = document.getElementById('riskDescription');

        if (scoreElement) {
            scoreElement.textContent = suitabilityScore;
        }

        // Determine risk level (inverted from suitability score)
        const riskValue = 100 - suitabilityScore;
        let riskLevel, riskText, riskDescription;

        if (riskValue <= 25) {
            riskLevel = 'low';
            riskText = 'Low Risk';
            riskDescription = 'Excellent conditions! Perfect for your planned activities with minimal weather-related risks.';
        } else if (riskValue <= 50) {
            riskLevel = 'medium';
            riskText = 'Medium Risk';
            riskDescription = 'Good conditions with some minor weather considerations. Generally suitable for most activities.';
        } else if (riskValue <= 75) {
            riskLevel = 'high';
            riskText = 'High Risk';
            riskDescription = 'Challenging weather conditions. Consider postponing or taking extra precautions for outdoor activities.';
        } else {
            riskLevel = 'extreme';
            riskText = 'Extreme Risk';
            riskDescription = 'Severe weather conditions expected. Avoid outdoor activities and consider alternative plans.';
        }

        if (riskLevelElement) {
            riskLevelElement.setAttribute('data-level', riskLevel);
            const riskTextElement = riskLevelElement.querySelector('.risk-text');
            if (riskTextElement) riskTextElement.textContent = riskText;
        }

        if (riskDescriptionElement) {
            riskDescriptionElement.textContent = riskDescription;
        }

        // Update score circle color
        const scoreCircle = document.querySelector('.score-circle');
        if (scoreCircle) {
            const color = this.config.riskLevels[riskLevel]?.color || '#f59e0b';
            scoreCircle.style.background = `conic-gradient(${color} ${suitabilityScore * 3.6}deg, var(--color-secondary) ${suitabilityScore * 3.6}deg)`;
        }
    }

    updateHealthCards(healthAnalysis) {
        const healthData = {
            'aqi': { value: healthAnalysis.aqi.value, unit: '', status: healthAnalysis.aqi.status },
            'pm25': { value: healthAnalysis.pm25.value, unit: ' μg/m³', status: healthAnalysis.pm25.status },
            'pm10': { value: healthAnalysis.pm10.value, unit: ' μg/m³', status: healthAnalysis.pm10.status },
            'no2': { value: healthAnalysis.no2.value, unit: ' ppb', status: healthAnalysis.no2.status },
            'o3': { value: healthAnalysis.o3.value, unit: ' ppb', status: healthAnalysis.o3.status },
            'so2': { value: healthAnalysis.so2.value, unit: ' ppb', status: healthAnalysis.so2.status }
        };

        Object.keys(healthData).forEach(type => {
            const valueElement = document.getElementById(`${type}Value`);
            const statusElement = document.getElementById(`${type}Status`);
            
            if (valueElement) {
                valueElement.textContent = healthData[type].value + healthData[type].unit;
            }
            
            if (statusElement) {
                statusElement.textContent = healthData[type].status;
                statusElement.className = 'health-status ' + this.getHealthStatusClass(healthData[type].status);
            }
        });
    }

    getHealthStatusClass(status) {
        const statusMap = {
            'Good': 'good',
            'Moderate': 'moderate',
            'Unhealthy for Sensitive Groups': 'unhealthy',
            'Unhealthy': 'unhealthy',
            'Very Unhealthy': 'hazardous',
            'Hazardous': 'hazardous'
        };
        return statusMap[status] || 'moderate';
    }

    updateResultsUI(analysis) {
        const preset = this.selectedPreset === 'custom' ? this.customPreset : this.config.presets[this.selectedPreset];
        
        const elements = {
            tempResult: `${preset.tempMin}-${preset.tempMax}°C`,
            precipResult: `<${preset.precipMax} mm`,
            windResult: `<${preset.windMax} km/h`,
            cloudResult: `<${preset.cloudMax}%`
        };

        const probabilities = {
            tempResult: analysis.temperatureProbability,
            precipResult: analysis.precipitationProbability,
            windResult: analysis.windProbability,
            cloudResult: analysis.cloudProbability
        };

        Object.keys(elements).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = elements[key];
                const probElement = element.parentNode.querySelector('.metric-probability');
                if (probElement) {
                    probElement.textContent = `${probabilities[key]}% match`;
                }
            }
        });

        // Animate metric cards
        document.querySelectorAll('.metric-card').forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('animate');
            }, index * 100);
        });
    }

    createCharts(data) {
        const colors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F'];
        
        // Temperature chart
        const tempCtx = document.getElementById('tempChart');
        if (tempCtx && typeof Chart !== 'undefined') {
            new Chart(tempCtx, {
                type: 'line',
                data: {
                    labels: data.dates,
                    datasets: [{
                        label: 'Temperature (°C)',
                        data: data.temperatures,
                        borderColor: colors[0],
                        backgroundColor: colors[0] + '30',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: 'var(--color-text)'
                            }
                        }
                    },
                    scales: {
                        y: {
                            ticks: {
                                color: 'var(--color-text-secondary)'
                            },
                            grid: {
                                color: 'var(--color-border)'
                            }
                        },
                        x: {
                            ticks: {
                                color: 'var(--color-text-secondary)'
                            },
                            grid: {
                                color: 'var(--color-border)'
                            }
                        }
                    }
                }
            });
        }

        // Precipitation chart
        const precipCtx = document.getElementById('precipChart');
        if (precipCtx && typeof Chart !== 'undefined') {
            new Chart(precipCtx, {
                type: 'bar',
                data: {
                    labels: data.dates,
                    datasets: [{
                        label: 'Precipitation (mm)',
                        data: data.precipitation,
                        backgroundColor: colors[1],
                        borderColor: colors[1],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: 'var(--color-text)'
                            }
                        }
                    },
                    scales: {
                        y: {
                            ticks: {
                                color: 'var(--color-text-secondary)'
                            },
                            grid: {
                                color: 'var(--color-border)'
                            }
                        },
                        x: {
                            ticks: {
                                color: 'var(--color-text-secondary)'
                            },
                            grid: {
                                color: 'var(--color-border)'
                            }
                        }
                    }
                }
            });
        }
    }

    showAIRecommendation(text) {
        const aiText = document.getElementById('aiRecommendation');
        const typingIndicator = document.querySelector('.typing-indicator');
        
        if (!aiText) return;
        
        if (typingIndicator) typingIndicator.classList.remove('hidden');
        
        setTimeout(() => {
            if (typingIndicator) typingIndicator.classList.add('hidden');
            
            // Type text effect
            let i = 0;
            aiText.textContent = '';
            const typeWriter = () => {
                if (i < text.length) {
                    aiText.textContent += text.charAt(i);
                    i++;
                    setTimeout(typeWriter, 30);
                }
            };
            typeWriter();
        }, 2000);
    }

    // Data Export Functions
    exportData(format) {
        console.log('Exporting data as:', format);
        
        if (!this.weatherData || !this.healthData) {
            this.showNotification('No data to export. Please run analysis first.', 'warning');
            return;
        }

        const data = this.prepareExportData();
        
        switch (format) {
            case 'csv':
                this.downloadCSV(data);
                break;
            case 'json':
                this.downloadJSON(data);
                break;
            case 'pdf':
                this.generatePDFReport(data);
                break;
        }
        
        this.showNotification(`${format.toUpperCase()} export completed!`, 'success');
    }

    prepareExportData() {
        const preset = this.selectedPreset === 'custom' ? this.customPreset : this.config.presets[this.selectedPreset];
        
        return {
            analysis: {
                preset: preset.name,
                mode: this.selectedMode,
                location: this.locations,
                dates: this.dates,
                timestamp: new Date().toISOString()
            },
            weatherData: this.weatherData,
            healthData: this.healthData
        };
    }

    downloadCSV(data) {
        const csv = this.convertToCSV(data.weatherData.historical);
        const blob = new Blob([csv], { type: 'text/csv' });
        this.downloadFile(blob, 'weather-health-data.csv');
    }

    downloadJSON(data) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        this.downloadFile(blob, 'weather-health-analysis.json');
    }

    convertToCSV(data) {
        const headers = ['Date', 'Temperature', 'Humidity', 'Precipitation', 'Wind Speed', 'Cloud Cover'];
        const rows = data.map(day => [
            day.date.toISOString().split('T')[0],
            day.temperature.toFixed(1),
            day.humidity.toFixed(1),
            day.precipitation.toFixed(1),
            day.windSpeed.toFixed(1),
            day.cloudCover.toFixed(1)
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    generatePDFReport(data) {
        const report = `Weather & Health Analysis Report - Team Pseudo Force
NASA Space Apps Challenge 2025

Generated: ${new Date().toLocaleString()}

Analysis Parameters:
- Preset: ${data.analysis.preset}
- Mode: ${data.analysis.mode}
- Location: ${data.analysis.location.destination ? data.analysis.location.destination.name : 'N/A'}

Weather Data Summary:
- Analysis based on 30 days of historical data
- Location coordinates: ${data.weatherData.location.lat.toFixed(4)}, ${data.weatherData.location.lng.toFixed(4)}
- Average temperature: ${data.weatherData.averages.temperature.toFixed(1)}°C
- Average humidity: ${data.weatherData.averages.humidity.toFixed(1)}%

Health Data:
- AQI: ${data.healthData.aqi}
- PM2.5: ${data.healthData.pm25} μg/m³  
- PM10: ${data.healthData.pm10} μg/m³
`;
        
        const blob = new Blob([report], { type: 'text/plain' });
        this.downloadFile(blob, 'weather-health-report.txt');
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Utility Functions
    showNotification(message, type = 'info') {
        console.log(`Notification (${type}):`, message);
        
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">×</button>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            .notification {
                position: fixed;
                top: 80px;
                right: 20px;
                background: var(--color-surface);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-base);
                padding: var(--space-16);
                box-shadow: var(--shadow-lg);
                z-index: 10000;
                transform: translateX(100%);
                transition: transform 0.3s ease;
                max-width: 350px;
                font-size: var(--font-size-sm);
            }
            .notification--success { border-left: 4px solid var(--color-success); }
            .notification--error { border-left: 4px solid var(--color-error); }
            .notification--warning { border-left: 4px solid var(--color-warning); }
            .notification--info { border-left: 4px solid var(--color-info); }
            .notification.show { transform: translateX(0); }
            .notification-content { 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                gap: var(--space-8); 
            }
            .notification-close { 
                background: none; 
                border: none; 
                font-size: 18px; 
                cursor: pointer; 
                color: var(--color-text-secondary);
                padding: 0;
                line-height: 1;
            }
            .notification-message { flex: 1; }
        `;
        
        if (!document.querySelector('style[data-notifications]')) {
            style.setAttribute('data-notifications', 'true');
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);

        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        });
    }

    startOver() {
        console.log('Starting over...');
        
        // Reset all state
        this.currentStep = 1;
        this.selectedPreset = null;
        this.customPreset = null;
        this.selectedMode = null;
        this.locations = { start: null, destination: null };
        this.dates = { start: null, end: null, target: null };
        this.weatherData = null;
        this.healthData = null;

        // Clear UI selections
        document.querySelectorAll('.preset-card').forEach(card => card.classList.remove('selected'));
        document.querySelectorAll('.mode-card').forEach(card => card.classList.remove('selected'));
        
        const customBuilder = document.getElementById('customBuilder');
        if (customBuilder) customBuilder.classList.add('hidden');

        // Clear map
        this.clearMarkers();

        // Clear forms
        const forms = ['locationSearch', 'startLocationSearch', 'destLocationSearch', 'customName', 'targetDate', 'startDate', 'endDate'];
        forms.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });

        // Clear location displays
        document.querySelectorAll('.location-info').forEach(info => info.classList.add('hidden'));

        // Clear results
        const aiRecommendation = document.getElementById('aiRecommendation');
        if (aiRecommendation) aiRecommendation.textContent = '';

        // Reset sliders
        this.setupCustomPresetSliders();

        // Go to step 1
        this.showStep(1);

        this.showNotification('Application reset successfully!', 'success');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing enhanced weather prediction app...');
    new WeatherPredictionApp();
});