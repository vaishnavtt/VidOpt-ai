import os
import shutil
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

from xgboost import XGBRegressor
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.model_selection import GroupShuffleSplit, GroupKFold, RandomizedSearchCV
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# ==========================================
# 1. CONFIGURATION
# ==========================================

DATA_PATH = "dataset/transcoding_mesurment.tsv"

os.makedirs("models", exist_ok=True)
os.makedirs("results", exist_ok=True)
os.makedirs("results/plots", exist_ok=True)

print("\n====================================")
print("   VIDOPT AI - TUNED XGBOOST")
print("====================================")

# ==========================================
# 2. LOAD DATASET
# ==========================================

print("\n[1/9] Loading dataset...")

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

print("\n[2/9] Selecting features...")

numeric_features = [
    "duration", "width", "height", "bitrate", "framerate",
    "i", "p", "b", "frames", "i_size", "p_size", "size",
    "o_bitrate", "o_framerate", "o_width", "o_height"
]

categorical_features = ["codec", "o_codec"]
features = numeric_features + categorical_features

X = df[features].copy()
y = df["utime"].copy()
groups = df["id"].copy()

for col in categorical_features:
    X[col] = X[col].astype(str)

print("Total selected features:", len(features))

# ==========================================
# 4. GROUP TRAIN/TEST SPLIT
# ==========================================

print("\n[3/9] Splitting dataset...")

splitter = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=42)
train_index, test_index = next(splitter.split(X, y, groups))

X_train = X.iloc[train_index]
X_test  = X.iloc[test_index]
y_train = y.iloc[train_index]
y_test  = y.iloc[test_index]
groups_train = groups.iloc[train_index]
groups_test  = groups.iloc[test_index]

assert set(groups_train).isdisjoint(set(groups_test)), "Group leakage detected!"

print("Training samples:", len(X_train))
print("Testing samples: ", len(X_test))
print("Training video IDs:", groups_train.nunique())
print("Testing video IDs: ", groups_test.nunique())
print("Group leakage check: PASSED")

# Save training ranges for OOD detection
print("\n[4/9] Saving training ranges...")
training_ranges = pd.DataFrame({
    "feature": numeric_features,
    "min": [X_train[f].min() for f in numeric_features],
    "max": [X_train[f].max() for f in numeric_features]
})
training_ranges.to_csv("results/tuned_xgboost_training_ranges.csv", index=False)
print("Saved results/tuned_xgboost_training_ranges.csv")

# ==========================================
# 5. PREPROCESSING
# ==========================================

preprocessor = ColumnTransformer(
    transformers=[
        ("numeric", "passthrough", numeric_features),
        ("categorical", OneHotEncoder(handle_unknown="ignore"), categorical_features)
    ]
)

# ==========================================
# 6. HYPERPARAMETER SEARCH
# ==========================================

print("\n[5/9] Running RandomizedSearchCV (n_iter=20)...")

param_dist = {
    "model__n_estimators":      [300, 400, 500, 600, 800],
    "model__max_depth":         [4, 5, 6, 7, 8],
    "model__learning_rate":     [0.01, 0.03, 0.05, 0.08, 0.1],
    "model__min_child_weight":  [1, 3, 5],
    "model__subsample":         [0.7, 0.8, 0.9],
    "model__colsample_bytree":  [0.7, 0.8, 0.9],
    "model__reg_lambda":        [1, 1.5, 2],
    "model__gamma":             [0, 0.1, 0.2],
}

base_pipeline = Pipeline(steps=[
    ("preprocessor", preprocessor),
    ("model", XGBRegressor(
        objective="reg:squarederror",
        eval_metric="mae",
        random_state=42,
        n_jobs=-1,
        tree_method="hist"
    ))
])

cv = GroupKFold(n_splits=5)

search = RandomizedSearchCV(
    estimator=base_pipeline,
    param_distributions=param_dist,
    n_iter=20,
    scoring="neg_mean_absolute_error",
    cv=cv,
    n_jobs=1,
    random_state=42,
    verbose=2,
    refit=True
)

search.fit(X_train, y_train, groups=groups_train)

print("\nBest CV MAE:", -search.best_score_)
print("Best params:", search.best_params_)

# ==========================================
# 7. EVALUATION ON TEST SET
# ==========================================

print("\n[6/9] Evaluating on test set...")

best_model = search.best_estimator_
predictions = best_model.predict(X_test)
predictions = np.maximum(predictions, 0)

mae  = mean_absolute_error(y_test, predictions)
rmse = np.sqrt(mean_squared_error(y_test, predictions))
r2   = r2_score(y_test, predictions)

print("\n========== TUNED XGBOOST PERFORMANCE ==========")
print(f"MAE  : {mae:.4f} seconds")
print(f"RMSE : {rmse:.4f} seconds")
print(f"R2   : {r2:.4f}")

# ==========================================
# 8. SAVE OUTPUTS
# ==========================================

print("\n[7/9] Saving outputs...")

# Metrics
metrics = pd.DataFrame({"Metric": ["MAE", "RMSE", "R2"], "Value": [mae, rmse, r2]})
metrics.to_csv("results/tuned_xgboost_metrics.csv", index=False)
print("Saved results/tuned_xgboost_metrics.csv")

# Best params
best_params_clean = {k.replace("model__", ""): v for k, v in search.best_params_.items()}
pd.DataFrame([best_params_clean]).to_csv("results/tuned_xgboost_best_params.csv", index=False)
print("Saved results/tuned_xgboost_best_params.csv")

# CV results
cv_df = pd.DataFrame(search.cv_results_)
cv_df.to_csv("results/tuned_xgboost_cv_results.csv", index=False)
print("Saved results/tuned_xgboost_cv_results.csv")

# Predictions
pred_df = pd.DataFrame({
    "video_id": groups_test.values,
    "actual_time": y_test.values,
    "predicted_time": predictions,
    "absolute_error": np.abs(y_test.values - predictions)
})
pred_df.to_csv("results/tuned_xgboost_predictions.csv", index=False)
print("Saved results/tuned_xgboost_predictions.csv")

# Feature importance
inner_model = best_model.named_steps["model"]
feature_names = best_model.named_steps["preprocessor"].get_feature_names_out()
importance = pd.DataFrame({
    "Feature": feature_names,
    "Importance": inner_model.feature_importances_
}).sort_values("Importance", ascending=False)
importance.to_csv("results/tuned_xgboost_feature_importance.csv", index=False)
print("Saved results/tuned_xgboost_feature_importance.csv")

# Save model
joblib.dump(best_model, "models/tuned_xgboost_model.pkl")
print("Saved models/tuned_xgboost_model.pkl")

# ==========================================
# 9. PLOTS
# ==========================================

print("\n[8/9] Generating plots...")

# Feature importance plot
plt.figure(figsize=(11, 7))
sns.barplot(data=importance.head(15), x="Importance", y="Feature")
plt.title("Tuned XGBoost - Top 15 Feature Importance")
plt.xlabel("Importance Score")
plt.ylabel("Feature")
plt.tight_layout()
plt.savefig("results/plots/tuned_xgboost_feature_importance.png", dpi=300)
plt.close()
print("Saved results/plots/tuned_xgboost_feature_importance.png")

# Actual vs Predicted
plt.figure(figsize=(8, 6))
plt.scatter(y_test, predictions, alpha=0.4, s=10)
max_val = max(y_test.max(), predictions.max())
plt.plot([0, max_val], [0, max_val], "r--", linewidth=1.5, label="Ideal")
plt.title("Tuned XGBoost - Actual vs Predicted")
plt.xlabel("Actual Transcoding Time (seconds)")
plt.ylabel("Predicted Transcoding Time (seconds)")
plt.legend()
plt.tight_layout()
plt.savefig("results/plots/tuned_xgboost_actual_vs_predicted.png", dpi=300)
plt.close()
print("Saved results/plots/tuned_xgboost_actual_vs_predicted.png")

# ==========================================
# 10. FINAL MODEL SELECTION
# ==========================================

print("\n[9/9] Selecting final model...")

existing_rmse = {
    "random_forest":        4.5048,
    "tuned_random_forest":  4.3490,
    "xgboost":              4.0727,
    "tuned_xgboost":        rmse
}

best_name = min(existing_rmse, key=existing_rmse.get)
print(f"Best model by RMSE: {best_name} (RMSE={existing_rmse[best_name]:.4f})")

# Always copy the tuned xgboost as it's being created now; if it beats others, it's final
if best_name == "tuned_xgboost":
    shutil.copy("models/tuned_xgboost_model.pkl", "models/final_model.pkl")
    print("Saved models/final_model.pkl  <-- tuned_xgboost (best RMSE)")
else:
    # Map name to file
    model_files = {
        "random_forest":       "models/random_forest_model.pkl",
        "tuned_random_forest": "models/tuned_random_forest_model.pkl",
        "xgboost":             "models/xgboost_model.pkl",
    }
    shutil.copy(model_files[best_name], "models/final_model.pkl")
    print(f"Saved models/final_model.pkl  <-- {best_name} (best RMSE)")

print("\n====================================")
print("     TUNED XGBOOST COMPLETED")
print("====================================")
print(f"MAE : {mae:.4f}")
print(f"RMSE: {rmse:.4f}")
print(f"R2  : {r2:.4f}")
