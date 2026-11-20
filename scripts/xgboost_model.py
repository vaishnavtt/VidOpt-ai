import os
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from xgboost import XGBRegressor

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# ==========================================
# 1. CONFIGURATION
# ==========================================

DATA_PATH = "dataset/transcoding_mesurment.tsv"

os.makedirs("models", exist_ok=True)
os.makedirs("results", exist_ok=True)
os.makedirs("results/plots", exist_ok=True)

print("\n====================================")
print("       VIDOPT AI - XGBOOST")
print("====================================")


# ==========================================
# 2. LOAD DATASET
# ==========================================

print("\n[1/8] Loading dataset...")

df = pd.read_csv(DATA_PATH, sep="\t")

print("Dataset shape:", df.shape)

if df.isnull().sum().sum() > 0:
    raise ValueError("Missing values detected.")

if (df["utime"] < 0).any():
    raise ValueError("Invalid target values detected.")

print("Dataset loaded successfully.")


# ==========================================
# 3. FEATURE SELECTION
# ==========================================

print("\n[2/8] Selecting features...")

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

print("Total selected features:", len(features))


# ==========================================
# 4. GROUP TRAIN TEST SPLIT
# ==========================================

print("\n[3/8] Splitting dataset...")

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

print("Training samples:", len(X_train))
print("Testing samples:", len(X_test))

print("Training video IDs:", train_groups.nunique())
print("Testing video IDs:", test_groups.nunique())

print("Group leakage check: PASSED")


# ==========================================
# 5. PREPROCESSING
# ==========================================

print("\n[4/8] Preparing preprocessing pipeline...")

preprocessor = ColumnTransformer(
    transformers=[
        (
            "numeric",
            "passthrough",
            numeric_features
        ),
        (
            "categorical",
            OneHotEncoder(handle_unknown="ignore"),
            categorical_features
        )
    ]
)


# ==========================================
# 6. XGBOOST MODEL
# ==========================================

print("\n[5/8] Training XGBoost Regressor...")

xgb_model = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        (
            "model",
            XGBRegressor(
                n_estimators=600,
                learning_rate=0.05,
                max_depth=6,
                min_child_weight=1,
                subsample=0.8,
                colsample_bytree=0.8,
                reg_lambda=1,
                objective="reg:squarederror",
                eval_metric="mae",
                random_state=42,
                n_jobs=-1,
                tree_method="hist"
            )
        )
    ]
)

xgb_model.fit(X_train, y_train)

print("XGBoost training completed!")


# ==========================================
# 7. PREDICTION
# ==========================================

print("\n[6/8] Generating predictions...")

predictions = xgb_model.predict(X_test)

predictions = np.maximum(predictions, 0)


# ==========================================
# 8. MODEL EVALUATION
# ==========================================

mae = mean_absolute_error(y_test, predictions)

rmse = np.sqrt(
    mean_squared_error(y_test, predictions)
)

r2 = r2_score(y_test, predictions)

print("\n========== XGBOOST PERFORMANCE ==========")

print(f"MAE  : {mae:.4f} seconds")
print(f"RMSE : {rmse:.4f} seconds")
print(f"R2   : {r2:.4f}")

print(f"R2 Percentage: {r2 * 100:.2f}%")


# ==========================================
# 9. SAVE METRICS
# ==========================================

metrics = pd.DataFrame({
    "Metric": ["MAE", "RMSE", "R2"],
    "Value": [mae, rmse, r2]
})

metrics.to_csv(
    "results/xgboost_metrics.csv",
    index=False
)


# ==========================================
# 10. SAVE PREDICTIONS
# ==========================================

prediction_results = pd.DataFrame({
    "video_id": test_groups.values,
    "actual_time": y_test.values,
    "predicted_time": predictions,
    "absolute_error": np.abs(
        y_test.values - predictions
    )
})

prediction_results.to_csv(
    "results/xgboost_predictions.csv",
    index=False
)


# ==========================================
# 11. FEATURE IMPORTANCE
# ==========================================

print("\nGenerating feature importance...")

model = xgb_model.named_steps["model"]

feature_names = (
    xgb_model
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
    "results/xgboost_feature_importance.csv",
    index=False
)

print("\nTop 15 important features:")

print(
    importance.head(15).to_string(index=False)
)


# ==========================================
# 12. FEATURE IMPORTANCE GRAPH
# ==========================================

plt.figure(figsize=(11, 7))

sns.barplot(
    data=importance.head(15),
    x="Importance",
    y="Feature"
)

plt.title("XGBoost - Top 15 Feature Importance")
plt.xlabel("Importance Score")
plt.ylabel("Features")

plt.tight_layout()

plt.savefig(
    "results/plots/xgboost_feature_importance.png",
    dpi=300
)

plt.close()


# ==========================================
# 13. ACTUAL VS PREDICTED GRAPH
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

plt.title("XGBoost - Actual vs Predicted")
plt.xlabel("Actual Transcoding Time (seconds)")
plt.ylabel("Predicted Transcoding Time (seconds)")

plt.tight_layout()

plt.savefig(
    "results/plots/xgboost_actual_vs_predicted.png",
    dpi=300
)

plt.close()


# ==========================================
# 14. SAVE TRAINED MODEL
# ==========================================

joblib.dump(
    xgb_model,
    "models/xgboost_model.pkl"
)

print("\n====================================")
print("       XGBOOST COMPLETED")
print("====================================")

print("MAE:", round(mae, 4))
print("RMSE:", round(rmse, 4))
print("R2:", round(r2, 4))

print("\nGenerated files:")
print("models/xgboost_model.pkl")
print("results/xgboost_metrics.csv")
print("results/xgboost_predictions.csv")
print("results/xgboost_feature_importance.csv")
print("results/plots/xgboost_feature_importance.png")
print("results/plots/xgboost_actual_vs_predicted.png")