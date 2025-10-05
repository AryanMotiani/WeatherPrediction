import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score, GridSearchCV
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from imblearn.over_sampling import SMOTE
import requests

class ClimateHealthRiskModel:
    def __init__(self, thresholds=None, model_type='rf', custom_features=None):
        self.default_thresholds = {
            'heat': 25,  # Celsius, lowered for balance
            'cold': -5,  # Celsius, lowered for balance
            'rain': 1.0,
            'snow': 0.1,
            'aqi': {'aod': 0.1, 'pm25': 20}
        }
        self.thresholds = thresholds if thresholds else self.default_thresholds
        self.model_type = model_type
        self.custom_features = custom_features or ['Year', 'Day_of_Year', 'Max_Temp', 'Min_Temp', 'Total_Precipitation',
                                                   'Mean_Wind_Speed', 'Mean_Surface_Humidity', 'Aerosol_Optical_Depth', 'Surface_PM2.5']
        self.models = {}
        self.climatological_means = {}
        self.scaler = StandardScaler()

    def preprocess_data(self, data_df):
        features = data_df[self.custom_features]
        continuous_features = [f for f in self.custom_features if f not in ['Year', 'Day_of_Year']]
        self.climatological_means = {feat: features[feat].mean() for feat in continuous_features}
        features_scaled = pd.DataFrame(self.scaler.fit_transform(features), columns=features.columns)
        return features_scaled

    def create_targets(self, data_df):
        targets = {}
        targets['heat'] = (data_df['Max_Temp'] >= self.thresholds['heat']).astype(int)
        targets['cold'] = (data_df['Min_Temp'] <= self.thresholds['cold']).astype(int)
        targets['rain'] = (data_df['Total_Precipitation'] >= self.thresholds['rain']).astype(int)
        if 'Snowfall' in data_df.columns:
            targets['snow'] = (data_df['Snowfall'] >= self.thresholds['snow']).astype(int)
        else:
            targets['snow'] = pd.Series([0] * len(data_df), dtype=int)
        targets['aqi'] = ((data_df['Aerosol_Optical_Depth'] >= self.thresholds['aqi']['aod']) |
                          (data_df['Surface_PM2.5'] >= self.thresholds['aqi']['pm25'])).astype(int)
        return targets

    def train_models(self, features, targets):
        results = {}
        for risk, y in targets.items():
            if self.model_type == 'rf':
                base_model = RandomForestClassifier(class_weight='balanced', random_state=42)
                param_grid = {
                    'n_estimators': [50, 100, 200],
                    'max_depth': [None, 10, 20],
                    'min_samples_split': [2, 5, 10]
                }
            elif self.model_type == 'xgb':
                try:
                    from xgboost import XGBClassifier
                except ImportError:
                    raise ImportError("XGBoost is not installed. Install it with 'pip install xgboost' or use model_type='rf'.")
                scale_pos_weight = len(y) / sum(y) if sum(y) > 0 else 1
                base_model = XGBClassifier(scale_pos_weight=scale_pos_weight, random_state=42)
                param_grid = {
                    'n_estimators': [50, 100, 200],
                    'max_depth': [3, 6, 10],
                    'learning_rate': [0.01, 0.1, 0.2]
                }
            else:
                raise ValueError("model_type must be 'rf' or 'xgb'")
            grid_search = GridSearchCV(base_model, param_grid, cv=5, scoring='accuracy', n_jobs=-1)
            grid_search.fit(features, y)
            best_model = grid_search.best_estimator_
            acc_scores = cross_val_score(best_model, features, y, cv=5, scoring='accuracy')
            try:
                f1_scores = cross_val_score(best_model, features, y, cv=5, scoring='f1')
                cv_f1 = f1_scores.mean()
            except ValueError:
                cv_f1 = 0.0
            self.models[risk] = best_model
            results[risk] = {
                'best_params': grid_search.best_params_,
                'cv_accuracy': acc_scores.mean(),
                'cv_f1': cv_f1
            }
        return results

    def predict_probabilities(self, new_features):
        new_features_scaled = pd.DataFrame(self.scaler.transform(new_features), columns=new_features.columns)
        probabilities = {}
        for risk, model in self.models.items():
            if len(model.classes_) == 1:
                prob = 0.0 if model.classes_[0] == 0 else 1.0
            else:
                prob = model.predict_proba(new_features_scaled)[0][1]
            probabilities[risk] = prob
        return probabilities

    def calculate_health_risk_score(self, probabilities):
        score = (0.4 * probabilities['heat'] +
                 0.3 * probabilities['aqi'] +
                 0.2 * probabilities['cold'] +
                 0.05 * probabilities['rain'] +
                 0.05 * probabilities['snow'])
        return score * 100

    def full_pipeline(self, data_df, new_day_of_year=None):
        from sklearn.model_selection import train_test_split
        features = self.preprocess_data(data_df)
        targets = self.create_targets(data_df)
        # Split into train (4000), val (2000), test (2000)
        X_train, X_temp, y_train_dict, y_temp_dict = {}, {}, {}, {}
        X_val, X_test, y_val_dict, y_test_dict = {}, {}, {}, {}
        for risk, y in targets.items():
            X_tr, X_te, y_tr, y_te = train_test_split(features, y, test_size=4000/8000, random_state=42, stratify=y if y.sum() > 0 and min(y.value_counts()) >= 5 else None)
            X_temp[risk] = X_te
            y_temp_dict[risk] = y_te
            X_va, X_te, y_va, y_te = train_test_split(X_temp[risk], y_temp_dict[risk], test_size=0.5, random_state=42, stratify=y_temp_dict[risk] if y_temp_dict[risk].sum() > 0 and min(y_temp_dict[risk].value_counts()) >= 2 else None)
            X_train[risk] = X_tr
            X_val[risk] = X_va
            X_test[risk] = X_te
            y_train_dict[risk] = y_tr
            y_val_dict[risk] = y_va
            y_test_dict[risk] = y_te
        training_results = self.train_models_generalized(X_train, y_train_dict, X_test, y_test_dict)
        new_features_dict = {feat: self.climatological_means.get(feat, 0) for feat in self.custom_features}
        new_features_dict['Year'] = 2023
        new_features_dict['Day_of_Year'] = new_day_of_year if new_day_of_year else 200
        new_features = pd.DataFrame([new_features_dict], columns=self.custom_features)
        probabilities = self.predict_probabilities(new_features)
        health_score = self.calculate_health_risk_score(probabilities)
        return {
            'probabilities': probabilities,
            'climatological_means': self.climatological_means,
            'health_risk_score': health_score,
            'training_results': training_results
        }

    def train_models_generalized(self, X_train, y_train_dict, X_test, y_test_dict):
        results = {}
        smote = SMOTE(random_state=42)
        for risk in y_train_dict.keys():
            y_train = y_train_dict[risk]
            y_test = y_test_dict[risk]
            X_tr = X_train[risk]
            # Apply SMOTE to training data if both classes are present and minority class has enough samples
            if len(np.unique(y_train)) > 1 and min(y_train.value_counts()) >= 6:
                X_tr_res, y_tr_res = smote.fit_resample(X_tr, y_train)
            else:
                X_tr_res, y_tr_res = X_tr, y_train
            if self.model_type == 'rf':
                base_model = RandomForestClassifier(class_weight='balanced', random_state=42)
                param_grid = {
                    'n_estimators': [50, 100, 200],
                    'max_depth': [2, 3, 4],  # More limited depth for regularization
                    'min_samples_split': [15, 20, 25],
                    'min_samples_leaf': [8, 10, 12]  # Higher for regularization
                }
            elif self.model_type == 'xgb':
                try:
                    from xgboost import XGBClassifier
                except ImportError:
                    raise ImportError("XGBoost is not installed. Install it with 'pip install xgboost' or use model_type='rf'.")
                scale_pos_weight = len(y_tr_res) / sum(y_tr_res) if sum(y_tr_res) > 0 else 1
                base_model = XGBClassifier(scale_pos_weight=scale_pos_weight, random_state=42)
                param_grid = {
                    'n_estimators': [50, 100, 200],
                    'max_depth': [2, 3, 4],  # More limited depth
                    'learning_rate': [0.01, 0.05, 0.1],
                    'reg_alpha': [5.0, 10.0, 20.0],  # Stronger L1 regularization
                    'reg_lambda': [10.0, 20.0, 30.0],  # Stronger L2 regularization
                    'gamma': [0.5, 1.0, 2.0],  # Additional regularization
                    'subsample': [0.7, 0.8, 0.9],
                    'colsample_bytree': [0.7, 0.8, 0.9]
                }
            else:
                raise ValueError("model_type must be 'rf' or 'xgb'")
            cv = 3 if min(y_tr_res.value_counts()) < 5 else 5
            grid_search = GridSearchCV(base_model, param_grid, cv=cv, scoring='f1_macro', n_jobs=-1)
            grid_search.fit(X_tr_res, y_tr_res)
            best_model = grid_search.best_estimator_
            self.models[risk] = best_model
            # Evaluate on test set
            y_pred = best_model.predict(X_test[risk])
            test_accuracy = accuracy_score(y_test, y_pred)
            try:
                test_f1 = f1_score(y_test, y_pred)
                test_precision = precision_score(y_test, y_pred)
                test_recall = recall_score(y_test, y_pred)
            except ValueError:
                test_f1 = 0.0
                test_precision = 0.0
                test_recall = 0.0
            results[risk] = {
                'best_params': grid_search.best_params_,
                'cv_accuracy': grid_search.best_score_,
                'test_accuracy': test_accuracy,
                'test_f1': test_f1,
                'test_precision': test_precision,
                'test_recall': test_recall
            }
        return results

def fetch_nasa_power_data():
    """
    Fetch real NASA POWER data for training.
    Uses NASA POWER API for meteorological and air quality data.
    """
    url = "https://power.larc.nasa.gov/api/temporal/daily/point"
    params = {
        'parameters': 'T2M_MAX,T2M_MIN,PRECTOTCORR,WS2M,RH2M',
        'community': 'SB',
        'longitude': -122.4194,  # San Francisco
        'latitude': 37.7749,
        'start': '20100101',
        'end': '20201231',
        'format': 'JSON'
    }
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()
    properties = data['properties']
    parameter = properties['parameter']
    dates = list(parameter['T2M_MAX'].keys())
    df_data = {
        'Year': [int(d[:4]) for d in dates],
        'Day_of_Year': [int(d[5:8]) for d in dates],
        'Max_Temp': [parameter['T2M_MAX'][d] for d in dates],
        'Min_Temp': [parameter['T2M_MIN'][d] for d in dates],
        'Total_Precipitation': [parameter['PRECTOTCORR'][d] for d in dates],
        'Mean_Wind_Speed': [parameter['WS2M'][d] for d in dates],
        'Mean_Surface_Humidity': [parameter['RH2M'][d] for d in dates],
        'Aerosol_Optical_Depth': [0.0 for _ in dates],  # Not available, set to 0
        'Surface_PM2.5': [0.0 for _ in dates]  # PM2.5 data not available, set to 0
    }
    df = pd.DataFrame(df_data)
    return df

def generate_synthetic_nasa_data(num_samples=8000):
    """
    Generate synthetic NASA-like data for training to reduce overfitting.
    Based on typical San Francisco climate data in Celsius.
    """
    np.random.seed(42)
    # Approximate means for San Francisco in Celsius
    data = {
        'Year': np.random.randint(1970, 2023, num_samples),
        'Day_of_Year': np.random.randint(1, 366, num_samples),
        'Max_Temp': np.random.normal(20, 5, num_samples),  # Around 20 C
        'Min_Temp': np.random.normal(10, 5, num_samples),  # Around 10 C
        'Total_Precipitation': np.random.exponential(1.5, num_samples),
        'Mean_Wind_Speed': np.random.normal(2, 1, num_samples),
        'Mean_Surface_Humidity': np.random.normal(70, 10, num_samples),
        'Aerosol_Optical_Depth': np.random.exponential(0.2, num_samples),
        'Surface_PM2.5': np.random.normal(10, 5, num_samples)
    }
    return pd.DataFrame(data)

if __name__ == "__main__":
    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sample_data_path = os.path.join(script_dir, 'sample_data.csv')
    if os.path.exists(sample_data_path):
        try:
            data_df = pd.read_csv(sample_data_path)
            # If sample data is small, generate synthetic NASA-like data
            if len(data_df) < 1000:
                print("Sample data is small. Generating synthetic NASA-like data with 2000 samples for generalization.")
                data_df = generate_synthetic_nasa_data(2000)
            print("Starting model training...")
            model = ClimateHealthRiskModel(model_type='rf')
            print("Model created. Running full pipeline...")
            results = model.full_pipeline(data_df, new_day_of_year=200)
            print("Pipeline completed.")
            print("Probabilities:", results['probabilities'])
            print("Climatological Means:", results['climatological_means'])
            print("Health Risk Score:", results['health_risk_score'])
            print("Training Results:", results['training_results'])
            results_file_path = 'C:/Users/Aryan/Desktop/model_results.txt'
            print("Saving to:", results_file_path)
            try:
                with open(results_file_path, 'w') as f:
                    f.write("Probabilities: " + str(results['probabilities']) + "\n")
                    f.write("Climatological Means: " + str(results['climatological_means']) + "\n")
                    f.write("Health Risk Score: " + str(results['health_risk_score']) + "\n")
                    f.write("Training Results: " + str(results['training_results']) + "\n")
                print("Results saved to model_results.txt")
            except Exception as file_error:
                print("Failed to save results to file:", file_error)
                print("Printing results to console instead:")
                print("Probabilities:", results['probabilities'])
                print("Climatological Means:", results['climatological_means'])
                print("Health Risk Score:", results['health_risk_score'])
                print("Training Results:", results['training_results'])
        except Exception as e:
            print("Error during execution:", str(e))
    else:
        try:
            print("Fetching real NASA POWER data for training.")
            data_df = fetch_nasa_power_data()
            print(f"Fetched {len(data_df)} samples from NASA POWER API.")
            model = ClimateHealthRiskModel()
            results = model.full_pipeline(data_df, new_day_of_year=200)
            print("Probabilities:", results['probabilities'])
            print("Climatological Means:", results['climatological_means'])
            print("Health Risk Score:", results['health_risk_score'])
            print("Training Results:", results['training_results'])
            results_file_path = 'C:/Users/Aryan/Desktop/model_results.txt'
            # Ensure file is properly flushed and closed
            with open(results_file_path, 'w', encoding='utf-8') as f:
                f.write("Probabilities: " + str(results['probabilities']) + "\n")
                f.write("Climatological Means: " + str(results['climatological_means']) + "\n")
                f.write("Health Risk Score: " + str(results['health_risk_score']) + "\n")
                f.write("Training Results: " + str(results['training_results']) + "\n")
                f.flush()
            print("Results saved to model_results.txt")
        except Exception as e:
            print("Error during execution:", str(e))
            print("Falling back to synthetic data.")
            data_df = generate_synthetic_nasa_data(2000)
            model = ClimateHealthRiskModel()
            results = model.full_pipeline(data_df, new_day_of_year=200)
            print("Probabilities:", results['probabilities'])
            print("Climatological Means:", results['climatological_means'])
            print("Health Risk Score:", results['health_risk_score'])
            print("Training Results:", results['training_results'])
            results_file_path = 'C:/Users/Aryan/Desktop/model_results.txt'
            with open(results_file_path, 'w') as f:
                f.write("Probabilities: " + str(results['probabilities']) + "\n")
                f.write("Climatological Means: " + str(results['climatological_means']) + "\n")
                f.write("Health Risk Score: " + str(results['health_risk_score']) + "\n")
                f.write("Training Results: " + str(results['training_results']) + "\n")
            print("Results saved to model_results.txt")
    print("Script completed")
