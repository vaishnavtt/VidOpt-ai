import os
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.model_selection import GroupShuffleSplit
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# ==========================================
# 1. CONFIGURATION
# ==========================================

DATA_PATH = "dataset/transcoding_mesurment.tsv"

os.makedirs("models", exist_ok=True)
os.makedirs("results", exist_ok=True)
os.makedirs("results/plots", exist_ok=True)


# ==========================================
# 2. LOAD DATASET
# ==========================================

print("\n========== VIDOPT AI ==========")
print("Random Forest Regression\n")

df = pd.read_csv(DATA_PATH, sep="\t")

print("Dataset loaded successfully")
print("Dataset shape:", df.shape)

if df.isnull().sum().sum() > 0:
    raise ValueError("Missing values detected. Review the dataset before training.")

if (df["utime"] < 0).any():
    raise ValueError("Negative target values detected.")


# ==========================================
# 3. FEATURE SELECTION
# ==========================================

# Exclude:
# id     -> Used only for group splitting
# umem   -> Measured during transcoding
# b_size -> Constant feature
# utime  -> Prediction target

numeric_features = [
    "duration",
    "width",
    "height",
    "bitrate",
    "framerate",
    "i",
    "p",
    "b",
    "frames",
    "i_size",
    "p_size",
    "size",
    "o_bitrate",
    "o_framerate",
    "o_width",
    "o_height"
]

categorical_features = [
    "codec",
    "o_codec"
]

features = numeric_features + categorical_features

X = df[features].copy()
y = df["utime"].copy()
groups = df["id"].copy()

for column in categorical_features:
    X[column] = X[column].astype(str)

print("\nFeatures selected:", len(features))
print("Target variable: utime")


# ==========================================
# 4. TRAIN TEST SPLIT
# ==========================================

splitter = GroupShuffleSplit(
    n_splits=1,
    test_size=0.20,
    random_state=42
)

train_index, test_index = next(
    splitter.split(X, y, groups)
)

X_train = X.iloc[train_index]
X_test = X.iloc[test_index]

y_train = y.iloc[train_index]
y_test = y.iloc[test_index]

train_groups = groups.iloc[train_index]
test_groups = groups.iloc[test_index]

assert set(train_groups).isdisjoint(set(test_groups))

print("\nTraining samples:", len(X_train))
print("Testing samples:", len(X_test))

print("Training video IDs:", train_groups.nunique())
print("Testing video IDs:", test_groups.nunique())

print("Group leakage check: PASSED")


# ==========================================
# 5. DATA PREPROCESSING
# ==========================================

preprocessor = ColumnTransformer(
    transformers=[
        ("numeric", "passthrough", numeric_features),
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features
        )
    ]
)


# ==========================================
# 6. RANDOM FOREST MODEL
# ==========================================

print("\nTraining Random Forest Regressor...")

random_forest = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        (
            "model",
            RandomForestRegressor(
                n_estimators=200,
                max_depth=None,
                min_samples_split=2,
                min_samples_leaf=1,
                max_features=1.0,
                random_state=42,
                n_jobs=-1
            )
        )
    ]
)

random_forest.fit(X_train, y_train)

print("Model training completed!")


# ==========================================
# 7. PREDICTION
# ==========================================

print("\nGenerating predictions...")

predictions = random_forest.predict(X_test)

predictions = np.maximum(predictions, 0)


# ==========================================
# 8. MODEL EVALUATION
# ==========================================

mae = mean_absolute_error(y_test, predictions)

rmse = np.sqrt(
    mean_squared_error(y_test, predictions)
)

r2 = r2_score(y_test, predictions)

print("\n========== MODEL PERFORMANCE ==========")

print(f"MAE  : {mae:.4f} seconds")
print(f"RMSE : {rmse:.4f} seconds")
print(f"R2   : {r2:.4f}")

metrics = pd.DataFrame({
    "Metric": ["MAE", "RMSE", "R2"],
    "Value": [mae, rmse, r2]
})

metrics.to_csv(
    "results/random_forest_metrics.csv",
    index=False
)


# ==========================================
# 9. SAVE PREDICTIONS
# ==========================================

prediction_results = pd.DataFrame({
    "video_id": test_groups.values,
    "actual_time": y_test.values,
    "predicted_time": predictions,
    "absolute_error": np.abs(y_test.values - predictions)
})

prediction_results.to_csv(
    "results/random_forest_predictions.csv",
    index=False
)


# ==========================================
# 10. FEATURE IMPORTANCE
# ==========================================

model = random_forest.named_steps["model"]

feature_names = (
    random_forest
    .named_steps["preprocessor"]
    .get_feature_names_out()
)

importance = pd.DataFrame({
    "Feature": feature_names,
    "Importance": model.feature_importances_
})

importance = importance.sort_values(
    by="Importance",
    ascending=False
)

importance.to_csv(
    "results/random_forest_feature_importance.csv",
    index=False
)

print("\nTop 15 Important Features:")

print(importance.head(15).to_string(index=False))


# ==========================================
# 11. FEATURE IMPORTANCE VISUALIZATION
# ==========================================

plt.figure(figsize=(11, 7))

sns.barplot(
    data=importance.head(15),
    x="Importance",
    y="Feature"
)

plt.title("Random Forest - Top 15 Feature Importance")
plt.xlabel("Importance Score")
plt.ylabel("Features")

plt.tight_layout()

plt.savefig(
    "results/plots/random_forest_feature_importance.png",
    dpi=300
)

plt.close()


# ==========================================
# 12. ACTUAL VS PREDICTED GRAPH
# ==========================================

plt.figure(figsize=(8, 6))

plt.scatter(
    y_test,
    predictions,
    alpha=0.4
)

max_value = max(y_test.max(), predictions.max())

plt.plot(
    [0, max_value],
    [0, max_value],
    linestyle="--"
)

plt.title("Actual vs Predicted Transcoding Time")
plt.xlabel("Actual Time (seconds)")
plt.ylabel("Predicted Time (seconds)")

plt.tight_layout()

plt.savefig(
    "results/plots/actual_vs_predicted.png",
    dpi=300
)

plt.close()


# ==========================================
# 13. SAVE TRAINED MODEL
# ==========================================

joblib.dump(
    random_forest,
    "models/random_forest_model.pkl"
)

print("\n====================================")
print("RANDOM FOREST TRAINING COMPLETED")
print("====================================")

print("\nGenerated files:")
print("models/random_forest_model.pkl")
print("results/random_forest_metrics.csv")
print("results/random_forest_predictions.csv")
print("results/random_forest_feature_importance.csv")
print("results/plots/random_forest_feature_importance.png")
print("results/plots/actual_vs_predicted.png")