# Create and train multiple ML models for weather prediction
class WeatherPredictionModel:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.feature_columns = []
        self.target_columns = ['temperature', 'humidity', 'pressure', 'wind_speed', 'precipitation', 'cloud_cover', 'uv_index', 'aqi']
        
    def prepare_features(self, df):
        """Prepare features for ML models"""
        feature_cols = [
            'temperature_lag1', 'temperature_lag2', 'humidity_lag1', 'pressure_lag1',
            'hour', 'day_of_year', 'seasonal_factor', 'daily_factor'
        ]
        
        # Add interactions between features
        df_features = df[feature_cols].copy()
        df_features['temp_humidity_interaction'] = df['temperature_lag1'] * df['humidity_lag1']
        df_features['pressure_seasonal_interaction'] = df['pressure_lag1'] * df['seasonal_factor']
        df_features['hour_seasonal_interaction'] = df['hour'] * df['seasonal_factor']
        
        self.feature_columns = df_features.columns.tolist()
        return df_features
    
    def train_models(self, df):
        """Train Random Forest and Gradient Boosting models for each weather parameter"""
        print("Training ML models for weather prediction...")
        print("=" * 50)
        
        # Prepare features
        X = self.prepare_features(df)
        
        # Train a model for each target variable
        for target in self.target_columns:
            print(f"Training models for {target}...")
            
            y = df[target].values
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, shuffle=False
            )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Train Random Forest
            rf_model = RandomForestRegressor(
                n_estimators=100,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            )
            rf_model.fit(X_train_scaled, y_train)
            
            # Train Gradient Boosting (XGBoost alternative)
            gb_model = GradientBoostingRegressor(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=6,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42
            )
            gb_model.fit(X_train_scaled, y_train)
            
            # Evaluate models
            rf_pred = rf_model.predict(X_test_scaled)
            gb_pred = gb_model.predict(X_test_scaled)
            
            # Calculate metrics
            rf_mae = mean_absolute_error(y_test, rf_pred)
            rf_rmse = np.sqrt(mean_squared_error(y_test, rf_pred))
            rf_r2 = r2_score(y_test, rf_pred)
            
            gb_mae = mean_absolute_error(y_test, gb_pred)
            gb_rmse = np.sqrt(mean_squared_error(y_test, gb_pred))
            gb_r2 = r2_score(y_test, gb_pred)
            
            print(f"  Random Forest - MAE: {rf_mae:.3f}, RMSE: {rf_rmse:.3f}, R²: {rf_r2:.3f}")
            print(f"  Gradient Boost - MAE: {gb_mae:.3f}, RMSE: {gb_rmse:.3f}, R²: {gb_r2:.3f}")
            
            # Choose the better model based on R² score
            if rf_r2 > gb_r2:
                self.models[target] = rf_model
                print(f"  → Selected Random Forest for {target}")
            else:
                self.models[target] = gb_model
                print(f"  → Selected Gradient Boosting for {target}")
            
            self.scalers[target] = scaler
            print()
        
        print("All models trained successfully!")
        print()
        
    def predict(self, input_features):
        """Make predictions using trained models"""
        predictions = {}
        
        for target in self.target_columns:
            if target in self.models:
                # Scale input features
                input_scaled = self.scalers[target].transform([input_features])
                # Make prediction
                pred = self.models[target].predict(input_scaled)[0]
                predictions[target] = max(0, pred)  # Ensure non-negative values
        
        return predictions
    
    def get_feature_importance(self, target):
        """Get feature importance for a specific target"""
        if target in self.models:
            model = self.models[target]
            importance = model.feature_importances_
            feature_imp_df = pd.DataFrame({
                'feature': self.feature_columns,
                'importance': importance
            }).sort_values('importance', ascending=False)
            return feature_imp_df
        return None

# Initialize and train the model
weather_model = WeatherPredictionModel()
weather_model.train_models(weather_df)