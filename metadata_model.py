import os
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
from sklearn.model_selection import GroupShuffleSplit, GroupKFold, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# ==========================================
# 1. CONFIGURATION
# ==========================================

DATA_PATH = "dataset/transcoding_mesurment.tsv"
os.makedirs("models", exist_ok=True)
os.makedirs("results", exist_ok=True)
os.makedirs("results/plots", exist_ok=True)

print("\n====================================")
print("   VIDOPT AI - METADATA MODEL")
print("====================================")

# ==========================================
# 2. LOAD DATASET
# ==========================================

print("\n[1/8] Loading dataset...")
df = pd.read_csv(DATA_PATH, sep="\t")
print("Dataset shape:", df.shape)

# ==========================================
# 3. METADATA FEATURES ONLY
# ==========================================

print("\n[2/8] Setting up metadata features (no decode-required features)...")

meta_numeric = [
    "duration", "width", "height", "bitrate", "framerate",
    "o_bitrate", "o_framerate", "o_width", "o_height"
]
meta_categorical = ["codec", "o_codec"]
meta_features = meta_numeric + meta_categorical

X = df[meta_features].copy()
y = df["utime"].copy()
groups = df["id"].copy()

for col in meta_categorical:
    X[col] = X[col].astype(str)

print("Metadata features:", len(meta_features), "->", meta_features)

# ==========================================
# 4. GROUP TRAIN/TEST SPLIT
# ==========================================

print("\n[3/8] Splitting dataset...")

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
print("Group leakage check: PASSED")

# Save training ranges for OOD detection
training_ranges = pd.DataFrame({
    "feature": meta_numeric,
    "min": [X_train[f].min() for f in meta_numeric],
    "max": [X_train[f].max() for f in meta_numeric]
})
training_ranges.to_csv("results/metadata_training_ranges.csv", index=False)
print("Saved results/metadata_training_ranges.csv")

# ==========================================
# 5. LOAD BEST PARAMS FROM TUNED XGBOOST
# ==========================================

print("\n[4/8] Loading hyperparameters...")

best_params_path = "results/tuned_xgboost_best_params.csv"
if os.path.exists(best_params_path):
    best_params_df = pd.read_csv(best_params_path)
    best_params = best_params_df.iloc[0].to_dict()
    # Cast to correct types
    int_params = ["n_estimators", "max_depth", "min_child_weight"]
    for p in int_params:
        if p in best_params:
            best_params[p] = int(best_params[p])
    print("Using best params from tuned_xgboost:", best_params)
else:
    best_params = {
        "n_estimators": 500, "max_depth": 6, "learning_rate": 0.05,
        "min_child_weight": 1, "subsample": 0.8, "colsample_bytree": 0.8,
        "reg_lambda": 1, "gamma": 0
    }
    print("tuned_xgboost_best_params.csv not found. Using baseline params.")

# ==========================================
# 6. BUILD METADATA PIPELINE
# ==========================================

print("\n[5/8] Building metadata pipeline...")

preprocessor = ColumnTransformer(
    transformers=[
        ("numeric", "passthrough", meta_numeric),
        ("categorical", OneHotEncoder(handle_unknown="ignore"), meta_categorical)
    ]
)

pipeline = Pipeline(steps=[
    ("preprocessor", preprocessor),
    ("model", XGBRegressor(
        **best_params,
        objective="reg:squarederror",
        eval_metric="mae",
        random_state=42,
        n_jobs=-1,
        tree_method="hist"
    ))
])

# ==========================================
# 7. CROSS-VALIDATION ON TRAINING SET
# ==========================================

print("\n[6/8] Running GroupKFold(5) CV on training set...")

cv = GroupKFold(n_splits=5)
cv_scores = cross_val_score(
    pipeline, X_train, y_train,
    cv=cv, groups=groups_train,
    scoring="neg_mean_absolute_error",
    n_jobs=1
)
cv_mae = -cv_scores.mean()
print(f"CV MAE (5-fold): {cv_mae:.4f} seconds (std={-cv_scores.std():.4f})")

# ==========================================
# 8. FIT ON FULL TRAINING SET & EVALUATE
# ==========================================

print("\n[7/8] Fitting on full training set...")
pipeline.fit(X_train, y_train)

predictions = pipeline.predict(X_test)
predictions = np.maximum(predictions, 0)

mae  = mean_absolute_error(y_test, predictions)
rmse = np.sqrt(mean_squared_error(y_test, predictions))
r2   = r2_score(y_test, predictions)

print("\n========== METADATA MODEL PERFORMANCE ==========")
print(f"MAE  : {mae:.4f} seconds")
print(f"RMSE : {rmse:.4f} seconds")
print(f"R2   : {r2:.4f}")
print(f"CV MAE (training): {cv_mae:.4f} seconds")

# Compare with tuned xgboost full model
tuned_xgb_mae  = None
tuned_xgb_rmse = None
tuned_xgb_r2   = None
if os.path.exists("results/tuned_xgboost_metrics.csv"):
    m = pd.read_csv("results/tuned_xgboost_metrics.csv").set_index("Metric")["Value"]
    tuned_xgb_mae  = m.get("MAE")
    tuned_xgb_rmse = m.get("RMSE")
    tuned_xgb_r2   = m.get("R2")
    print("\n--- Comparison vs Full-Feature Tuned XGBoost ---")
    print(f"Full Model  : MAE={tuned_xgb_mae:.4f}, RMSE={tuned_xgb_rmse:.4f}, R2={tuned_xgb_r2:.4f}")
    print(f"Metadata Mdl: MAE={mae:.4f}, RMSE={rmse:.4f}, R2={r2:.4f}")
    mae_delta  = mae - tuned_xgb_mae
    rmse_delta = rmse - tuned_xgb_rmse
    print(f"Performance gap: MAE +{mae_delta:.4f}s, RMSE +{rmse_delta:.4f}s")
    print("NOTE: Metadata model uses only 11 features (no content-based features).")
    print("      Performance gap reflects the trade-off for pre-transcode estimation.")

# ==========================================
# 9. SAVE OUTPUTS
# ==========================================

print("\n[8/8] Saving outputs...")

# Metrics
metrics_data = {
    "Metric": ["MAE", "RMSE", "R2", "CV_MAE"],
    "Value": [mae, rmse, r2, cv_mae]
}
if tuned_xgb_mae is not None:
    metrics_data["Metric"].extend(["FullModel_MAE", "FullModel_RMSE", "FullModel_R2"])
    metrics_data["Value"].extend([tuned_xgb_mae, tuned_xgb_rmse, tuned_xgb_r2])
pd.DataFrame(metrics_data).to_csv("results/metadata_model_metrics.csv", index=False)
print("Saved results/metadata_model_metrics.csv")

# Feature importance
inner_model = pipeline.named_steps["model"]
feature_names = pipeline.named_steps["preprocessor"].get_feature_names_out()
importance = pd.DataFrame({
    "Feature": feature_names,
    "Importance": inner_model.feature_importances_
}).sort_values("Importance", ascending=False)
importance.to_csv("results/metadata_model_feature_importance.csv", index=False)
print("Saved results/metadata_model_feature_importance.csv")

# Save model
joblib.dump(pipeline, "models/metadata_transcoding_model.pkl")
print("Saved models/metadata_transcoding_model.pkl")

# Feature importance plot
plt.figure(figsize=(10, 6))
sns.barplot(data=importance.head(15), x="Importance", y="Feature")
plt.title("Metadata Model - Feature Importance (pre-transcode features only)")
plt.xlabel("Importance Score")
plt.ylabel("Feature")
plt.tight_layout()
plt.savefig("results/plots/metadata_model_feature_importance.png", dpi=300)
plt.close()
print("Saved results/plots/metadata_model_feature_importance.png")

# Actual vs Predicted
plt.figure(figsize=(8, 6))
plt.scatter(y_test, predictions, alpha=0.3, s=8)
max_val = max(y_test.max(), predictions.max())
plt.plot([0, max_val], [0, max_val], "r--", linewidth=1.5, label="Ideal")
plt.title(f"Metadata Model - Actual vs Predicted\nMAE={mae:.4f}s  RMSE={rmse:.4f}s  R²={r2:.4f}")
plt.xlabel("Actual Transcoding Time (seconds)")
plt.ylabel("Predicted Transcoding Time (seconds)")
plt.legend()
plt.tight_layout()
plt.savefig("results/plots/metadata_actual_vs_predicted.png", dpi=300)
plt.close()
print("Saved results/plots/metadata_actual_vs_predicted.png")

print("\n====================================")
print("     METADATA MODEL COMPLETED")
print("====================================")
print(f"MAE : {mae:.4f}")
print(f"RMSE: {rmse:.4f}")
print(f"R2  : {r2:.4f}")
print(f"CV MAE: {cv_mae:.4f}")
