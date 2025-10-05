# Climate Health Risk Model

This project contains a machine learning model to predict climate-related health risks based on environmental data. The model uses meteorological and air quality features to estimate probabilities of heat, cold, rain, snow, and air quality index (AQI) risks, and calculates an overall health risk score.

## Features

- Uses Random Forest or XGBoost classifiers with hyperparameter tuning.
- Preprocesses data with feature scaling.
- Creates binary targets based on thresholds for heat, cold, rain, snow, and AQI.
- Supports synthetic data generation for training when sample data is small.
- Splits data into training, validation, and test sets.
- Evaluates models with cross-validation and test metrics.
- Outputs probabilities, climatological means, health risk score, and training results.
- Saves results to a text file.

## Usage

1. Place your input data CSV file named `sample_data.csv` in the same directory as the script.
2. Run the script:

```bash
python MLmodel.py
```

3. If the sample data is small, synthetic NASA-like data will be generated for training.
4. The script will print prediction probabilities, climatological means, health risk score, and training results.
5. Results will be saved to `model_results.txt`.

## Requirements

- Python 3.x
- pandas
- numpy
- scikit-learn
- xgboost (optional, if using XGBoost model)

Install dependencies with:

```bash
pip install pandas numpy scikit-learn xgboost
```

## Customization

- Modify thresholds in the `ClimateHealthRiskModel` class constructor.
- Change model type by setting `model_type` to `'rf'` or `'xgb'`.
- Adjust features by modifying the `custom_features` list.

## Notes

- The model uses stratified splits and cross-validation for robust evaluation.
- Synthetic data generation helps reduce overfitting when sample data is limited.
- Health risk score is a weighted combination of individual risk probabilities.

## License

This project is licensed under the MIT License.
