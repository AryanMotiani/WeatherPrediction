import pandas as pd
import numpy as np
from MLmodel import ClimateHealthRiskModel, generate_synthetic_nasa_data
import unittest

class TestClimateHealthRiskModel(unittest.TestCase):

    def setUp(self):
        # Generate a small synthetic dataset for testing
        self.test_data = generate_synthetic_nasa_data(100)
        self.model = ClimateHealthRiskModel()

    def test_preprocess_data(self):
        features = self.model.preprocess_data(self.test_data)
        self.assertEqual(features.shape[0], 100)
        self.assertEqual(features.shape[1], 9)  # Number of features
        # Check if scaled
        self.assertTrue(features.mean().abs().max() < 1)  # Roughly centered

    def test_create_targets(self):
        targets = self.model.create_targets(self.test_data)
        self.assertIn('heat', targets)
        self.assertIn('cold', targets)
        self.assertIn('rain', targets)
        self.assertIn('snow', targets)
        self.assertIn('aqi', targets)
        for risk, y in targets.items():
            self.assertEqual(len(y), 100)
            self.assertTrue(y.dtype == int)

    def test_predict_probabilities(self):
        # Train the model first
        self.model.full_pipeline(self.test_data, new_day_of_year=200)
        new_features = pd.DataFrame([{
            'Year': 2023,
            'Day_of_Year': 200,
            'Max_Temp': 85,
            'Min_Temp': 60,
            'Total_Precipitation': 0.5,
            'Mean_Wind_Speed': 5,
            'Mean_Surface_Humidity': 70,
            'Aerosol_Optical_Depth': 0.1,
            'Surface_PM2.5': 30
        }])
        probabilities = self.model.predict_probabilities(new_features)
        self.assertIn('heat', probabilities)
        self.assertIn('cold', probabilities)
        self.assertIn('rain', probabilities)
        self.assertIn('snow', probabilities)
        self.assertIn('aqi', probabilities)
        for prob in probabilities.values():
            self.assertGreaterEqual(prob, 0.0)
            self.assertLessEqual(prob, 1.0)

    def test_calculate_health_risk_score(self):
        probabilities = {'heat': 0.5, 'cold': 0.2, 'rain': 0.1, 'snow': 0.0, 'aqi': 0.3}
        score = self.model.calculate_health_risk_score(probabilities)
        expected_score = (0.4 * 0.5 + 0.3 * 0.3 + 0.2 * 0.2 + 0.05 * 0.1 + 0.05 * 0.0) * 100
        self.assertAlmostEqual(score, expected_score, places=2)

    def test_full_pipeline(self):
        results = self.model.full_pipeline(self.test_data, new_day_of_year=200)
        self.assertIn('probabilities', results)
        self.assertIn('climatological_means', results)
        self.assertIn('health_risk_score', results)
        self.assertIn('training_results', results)
        self.assertGreaterEqual(results['health_risk_score'], 0)
        self.assertLessEqual(results['health_risk_score'], 100)

if __name__ == '__main__':
    unittest.main()
