import os
import joblib
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.model_selection import (
    GroupShuffleSplit,
    GroupKFold,
    RandomizedSearchCV
)
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# ==========================================
# 1. CONFIGURATION
# ==========================================

DATA_PATH = "dataset/transcoding_mesurment.tsv"

os.makedirs("models", exist_ok=True)
os.makedirs("results", exist_ok=True)

print("\n===== VIDOPT AI: RANDOM FOREST TUNING =====")

# ==========================================
# 2. LOAD DATA
# ==========================================

df = pd.read_csv(DATA_PATH, sep="\t")

numeric_features = [
    "duration", "width", "height", "bitrate",
    "framerate", "i", "p", "b", "frames",
    "i_size", "p_size", "size",
    "o_bitrate", "o_framerate",
    "o_width", "o_height"
]

categorical_features = ["codec", "o_codec"]

features = numeric_features + categorical_features

X = df[features].copy()
y = df["utime"].copy()
groups = df["id"].copy()

for col in categorical_features:
    X[col] = X[col].astype(str)

# ==========================================
# 3. GROUP TRAIN TEST SPLIT
# ==========================================

splitter = GroupShuffleSplit(
    n_splits=1,
    test_size=0.20,
    random_state=42
)

train_idx, test_idx = next(
    splitter.split(X, y, groups)
)

X_train = X.iloc[train_idx]
X_test = X.iloc[test_idx]

y_train = y.iloc[train_idx]
y_test = y.iloc[test_idx]

groups_train = groups.iloc[train_idx]

assert set(groups_train).isdisjoint(set(groups.iloc[test_idx]))

print("Training records:", len(X_train))
print("Testing records:", len(X_test))

# ==========================================
# 4. PREPROCESSING
# ==========================================

preprocessor = ColumnTransformer([
    ("numeric", "passthrough", numeric_features),
    (
        "categorical",
        OneHotEncoder(handle_unknown="ignore"),
        categorical_features
    )
])

pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("model", RandomForestRegressor(
        random_state=42,
        n_jobs=-1
    ))
])

# ==========================================
# 5. HYPERPARAMETER SEARCH
# ==========================================

parameter_grid = {
    "model__n_estimators": [200, 300, 400, 500],
    "model__max_depth": [10, 15, 20, 30, None],
    "model__min_samples_split": [2, 5, 10],
    "model__min_samples_leaf": [1, 2, 4],
    "model__max_features": [0.7, 0.85, 1.0]
}

cv = GroupKFold(n_splits=5)

search = RandomizedSearchCV(
    estimator=pipeline,
    param_distributions=parameter_grid,
    n_iter=15,
    scoring="neg_mean_absolute_error",
    cv=cv,
    random_state=42,
    n_jobs=1,
    verbose=2
)

print("\nStarting hyperparameter tuning...")

search.fit(
    X_train,
    y_train,
    groups=groups_train
)

# ==========================================
# 6. BEST MODEL
# ==========================================

best_model = search.best_estimator_

print("\nBest parameters:")
print(search.best_params_)

print("\nBest cross-validation MAE:")
print(-search.best_score_)

# ==========================================
# 7. FINAL TEST EVALUATION
# ==========================================

predictions = best_model.predict(X_test)
predictions = np.maximum(predictions, 0)

mae = mean_absolute_error(y_test, predictions)

rmse = np.sqrt(
    mean_squared_error(y_test, predictions)
)

r2 = r2_score(y_test, predictions)

print("\n===== TUNED RANDOM FOREST RESULTS =====")

print(f"MAE  : {mae:.4f} seconds")
print(f"RMSE : {rmse:.4f} seconds")
print(f"R2   : {r2:.4f}")
print(f"R2 percentage: {r2 * 100:.2f}%")

# ==========================================
# 8. SAVE RESULTS
# ==========================================

joblib.dump(
    best_model,
    "models/tuned_random_forest_model.pkl"
)

pd.DataFrame([{
    "Model": "Tuned Random Forest",
    "MAE": mae,
    "RMSE": rmse,
    "R2": r2,
    "Best_CV_MAE": -search.best_score_
}]).to_csv(
    "results/tuned_random_forest_metrics.csv",
    index=False
)

pd.DataFrame(search.cv_results_).to_csv(
    "results/random_forest_tuning_results.csv",
    index=False
)

print("\nTuned model saved successfully!")
print("Training and evaluation completed.")