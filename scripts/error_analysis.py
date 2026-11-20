import os
from pathlib import Path
import joblib

# Ensure repository root is working directory
REPO_ROOT = Path(__file__).resolve().parent.parent
os.chdir(REPO_ROOT)
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# ==========================================
# 1. CONFIGURATION
# ==========================================

DATA_PATH = "dataset/transcoding_mesurment.tsv"
os.makedirs("results", exist_ok=True)
os.makedirs("results/plots", exist_ok=True)

print("\n====================================")
print("   VIDOPT AI - ERROR ANALYSIS")
print("====================================")

# ==========================================
# 2. LOAD MODEL
# ==========================================

print("\n[1/6] Loading model...")
if os.path.exists("models/final_model.pkl"):
    model = joblib.load("models/final_model.pkl")
    model_label = "Final Model (final_model.pkl)"
elif os.path.exists("models/tuned_xgboost_model.pkl"):
    model = joblib.load("models/tuned_xgboost_model.pkl")
    model_label = "Tuned XGBoost (tuned_xgboost_model.pkl)"
else:
    raise FileNotFoundError("No model found. Run tune_xgboost.py first.")
print(f"Loaded: {model_label}")

# ==========================================
# 3. LOAD DATASET & SPLIT
# ==========================================

print("\n[2/6] Loading dataset...")
df = pd.read_csv(DATA_PATH, sep="\t")
print("Dataset shape:", df.shape)

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

splitter = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=42)
train_index, test_index = next(splitter.split(X, y, groups))

X_test  = X.iloc[test_index]
y_test  = y.iloc[test_index]
groups_test = groups.iloc[test_index]

# Also keep test slice of original df for feature access
df_test = df.iloc[test_index].copy()

print("Test samples:", len(X_test))

# ==========================================
# 4. PREDICT
# ==========================================

print("\n[3/6] Generating predictions...")
predictions = model.predict(X_test)
predictions = np.maximum(predictions, 0)

mae  = mean_absolute_error(y_test, predictions)
rmse = np.sqrt(mean_squared_error(y_test, predictions))
r2   = r2_score(y_test, predictions)
print(f"MAE={mae:.4f}  RMSE={rmse:.4f}  R2={r2:.4f}")

# ==========================================
# 5. BUILD ERROR TABLE
# ==========================================

print("\n[4/6] Building error table...")

error_df = df_test[features + ["utime", "id"]].copy()
error_df["predicted"] = predictions
error_df["abs_error"] = np.abs(error_df["utime"] - predictions)
error_df["pct_error"] = (error_df["abs_error"] / np.maximum(error_df["utime"], 0.001)) * 100

# Resolution grouping
def res_group(row):
    h = row["o_height"]
    if h < 720:   return "SD (<720p)"
    elif h == 720: return "HD (720p)"
    elif h == 1080: return "FHD (1080p)"
    else:          return "4K+"

error_df["resolution_group"] = error_df.apply(res_group, axis=1)

# Duration quartile
dur_q = pd.qcut(error_df["duration"], q=4, labels=["Short", "Medium", "Long", "Very Long"])
error_df["duration_quartile"] = dur_q

# Bitrate quartile
bit_q = pd.qcut(error_df["o_bitrate"], q=4, labels=["Low", "Medium", "High", "Very High"])
error_df["bitrate_quartile"] = bit_q

error_df.to_csv("results/error_analysis.csv", index=False)
print("Saved results/error_analysis.csv")

# ==========================================
# 6. PLOTS
# ==========================================

print("\n[5/6] Generating plots...")

# 6a. Actual vs Predicted scatter
plt.figure(figsize=(8, 6))
plt.scatter(error_df["utime"], error_df["predicted"], alpha=0.3, s=8)
max_val = max(error_df["utime"].max(), error_df["predicted"].max())
plt.plot([0, max_val], [0, max_val], "r--", linewidth=1.5, label="Ideal")
plt.title(f"Error Analysis - Actual vs Predicted\nMAE={mae:.4f}s  RMSE={rmse:.4f}s  R²={r2:.4f}")
plt.xlabel("Actual Transcoding Time (seconds)")
plt.ylabel("Predicted Transcoding Time (seconds)")
plt.legend()
plt.tight_layout()
plt.savefig("results/plots/error_actual_vs_predicted.png", dpi=300)
plt.close()
print("Saved results/plots/error_actual_vs_predicted.png")

# 6b. Error distribution histogram
residuals = error_df["predicted"] - error_df["utime"]
plt.figure(figsize=(9, 5))
plt.hist(residuals, bins=80, edgecolor="white", linewidth=0.3, color="#4C72B0")
plt.axvline(0, color="red", linestyle="--", linewidth=1.5, label="Zero error")
plt.axvline(residuals.mean(), color="orange", linestyle="-", linewidth=1.5,
            label=f"Mean={residuals.mean():.2f}s")
plt.title("Error Distribution (Predicted - Actual)")
plt.xlabel("Residual (seconds)")
plt.ylabel("Count")
plt.legend()
plt.tight_layout()
plt.savefig("results/plots/error_distribution.png", dpi=300)
plt.close()
print("Saved results/plots/error_distribution.png")

# ==========================================
# 7. ANALYSIS BY CATEGORY
# ==========================================

print("\n[6/6] Summarizing by category...")

def summary(df, group_col):
    return (df.groupby(group_col, observed=True)["abs_error"]
              .agg(count="count", mean_abs_error="mean", median_abs_error="median",
                   std_abs_error="std", max_abs_error="max")
              .reset_index()
              .sort_values("mean_abs_error", ascending=False))

# By duration quartile
dur_sum = summary(error_df, "duration_quartile")
dur_sum.to_csv("results/error_analysis_by_duration.csv", index=False)
print("\nErrors by Duration Quartile:")
print(dur_sum.to_string(index=False))

# By resolution
res_sum = summary(error_df, "resolution_group")
res_sum.to_csv("results/error_analysis_by_resolution.csv", index=False)
print("\nErrors by Resolution Group:")
print(res_sum.to_string(index=False))

# By codec
codec_sum = summary(error_df, "codec")
codec_sum.to_csv("results/error_analysis_by_codec.csv", index=False)
print("\nErrors by Codec:")
print(codec_sum.to_string(index=False))

# Top 20 worst errors
top20 = error_df.nlargest(20, "abs_error")[
    ["id", "duration", "codec", "o_codec", "o_height", "utime", "predicted", "abs_error", "pct_error"]
]
top20.to_csv("results/error_top20_worst.csv", index=False)
print("\nTop 20 worst errors saved to results/error_top20_worst.csv")

# ==========================================
# 8. FINDINGS SUMMARY
# ==========================================

print("\n========== ERROR ANALYSIS FINDINGS ==========")
print(f"Overall MAE : {mae:.4f} seconds")
print(f"Overall RMSE: {rmse:.4f} seconds")
print(f"Overall R2  : {r2:.4f}")
print(f"Mean residual: {residuals.mean():.4f} s  (bias)")
print(f"Residual std : {residuals.std():.4f} s")

worst_dur   = dur_sum.iloc[0]["duration_quartile"]
worst_res   = res_sum.iloc[0]["resolution_group"]
worst_codec = codec_sum.iloc[0]["codec"]
best_dur    = dur_sum.iloc[-1]["duration_quartile"]
best_res    = res_sum.iloc[-1]["resolution_group"]

print(f"\nWhere model STRUGGLES (high MAE):")
print(f"  Duration: {worst_dur}")
print(f"  Resolution: {worst_res}")
print(f"  Codec: {worst_codec}")
print(f"\nWhere model PERFORMS BEST (low MAE):")
print(f"  Duration: {best_dur}")
print(f"  Resolution: {best_res}")

print("\n====================================")
print("     ERROR ANALYSIS COMPLETED")
print("====================================")
