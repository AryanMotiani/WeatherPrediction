# Install XGBoost and other required packages
import subprocess
import sys

# Install XGBoost
subprocess.check_call([sys.executable, "-m", "pip", "install", "xgboost"])

print("XGBoost installed successfully!")