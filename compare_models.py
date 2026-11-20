import os
import time
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# ==========================================
# 1. CONFIGURATION
# ==========================================

os.makedirs("results", exist_ok=True)
os.makedirs("results/plots", exist_ok=True)

print("\n====================================")
print("   VIDOPT AI - MODEL COMPARISON")
print("====================================")

# ==========================================
# 2. LOAD METRICS
# ==========================================

print("\n[1/4] Loading metrics CSVs...")

def load_metric(path, model_name):
    df = pd.read_csv(path)
    row = {"Model": model_name}
    if "Metric" in df.columns and "Value" in df.columns:
        for _, r in df.iterrows():
            row[r["Metric"]] = float(r["Value"])
    else:
        row["MAE"] = float(df.iloc[0]["MAE"])
        row["RMSE"] = float(df.iloc[0]["RMSE"])
        row["R2"] = float(df.iloc[0]["R2"])
    return row

metrics_rows = [
    load_metric("results/random_forest_metrics.csv",        "Random Forest"),
    load_metric("results/tuned_random_forest_metrics.csv",  "Tuned Random Forest"),
    load_metric("results/xgboost_metrics.csv",              "XGBoost"),
    load_metric("results/tuned_xgboost_metrics.csv",        "Tuned XGBoost"),
]

metrics_df = pd.DataFrame(metrics_rows)
# Standardize column names
metrics_df = metrics_df.rename(columns={"MAE": "MAE", "RMSE": "RMSE", "R2": "R2"})

# ==========================================
# 3. MEASURE PREDICTION TIME & FILE SIZE
# ==========================================

print("\n[2/4] Measuring prediction speed and model file sizes...")

model_paths = {
    "Random Forest":        "models/random_forest_model.pkl",
    "Tuned Random Forest":  "models/tuned_random_forest_model.pkl",
    "XGBoost":              "models/xgboost_model.pkl",
    "Tuned XGBoost":        "models/tuned_xgboost_model.pkl",
}

# Build a small synthetic sample using realistic values
synthetic_sample = pd.DataFrame([{
    "duration": 60.0, "width": 1280, "height": 720,
    "bitrate": 2000, "framerate": 25.0,
    "i": 50, "p": 150, "b": 300,
    "frames": 1500, "i_size": 2000, "p_size": 1000, "size": 300000,
    "o_bitrate": 1500, "o_framerate": 25.0, "o_width": 1280, "o_height": 720,
    "codec": "h264", "o_codec": "h264"
}])

pred_times = {}
file_sizes = {}

for model_name, model_path in model_paths.items():
    if not os.path.exists(model_path):
        print(f"  WARNING: {model_path} not found, skipping timing.")
        pred_times[model_name] = np.nan
        file_sizes[model_name] = np.nan
        continue
    model = joblib.load(model_path)
    # Warmup
    _ = model.predict(synthetic_sample)
    # Time 50 predictions and extrapolate to 1000 predictions for benchmark
    start = time.perf_counter()
    for _ in range(50):
        model.predict(synthetic_sample)
    elapsed_ms = (time.perf_counter() - start) * 1000 * 20
    pred_times[model_name] = round(elapsed_ms, 3)
    file_sizes[model_name] = round(os.path.getsize(model_path) / (1024 * 1024), 3)
    print(f"  {model_name}: {elapsed_ms:.1f} ms / 1000 preds, size={file_sizes[model_name]:.2f} MB")

metrics_df["PredTime_ms"] = metrics_df["Model"].map(pred_times)
metrics_df["ModelSize_MB"] = metrics_df["Model"].map(file_sizes)

# ==========================================
# 4. SAVE COMPARISON TABLE
# ==========================================

print("\n[3/4] Saving comparison CSV...")

comparison = metrics_df[["Model", "MAE", "RMSE", "R2", "PredTime_ms", "ModelSize_MB"]]
comparison.to_csv("results/model_comparison.csv", index=False)
print("Saved results/model_comparison.csv")

# ==========================================
# 5. PRINT TABLE
# ==========================================

print("\n========== MODEL COMPARISON TABLE ==========")
print(comparison.to_string(index=False))
print("=" * 55)

# Recommendation logic: best MAE wins (primary), RMSE as tiebreaker
best_mae_idx = comparison["MAE"].idxmin()
best_model   = comparison.loc[best_mae_idx, "Model"]
best_mae     = comparison.loc[best_mae_idx, "MAE"]
best_rmse    = comparison.loc[best_mae_idx, "RMSE"]
best_r2      = comparison.loc[best_mae_idx, "R2"]

print(f"\nRECOMMENDED MODEL: {best_model}")
print(f"  MAE : {best_mae:.4f} s  (lowest mean absolute error - best for time prediction apps)")
print(f"  RMSE: {best_rmse:.4f} s")
print(f"  R2  : {best_r2:.4f}  (R² measures variance explained; higher is better but not the sole criterion)")
print("\nNote: MAE is chosen as the primary metric because it directly reflects the average")
print("prediction error in seconds, which is the most interpretable metric for end-users.")

# ==========================================
# 6. COMPARISON BAR CHARTS
# ==========================================

print("\n[4/4] Generating comparison charts...")

COLORS = ["#4C72B0", "#DD8452", "#55A868", "#C44E52"]
models = comparison["Model"].tolist()

def bar_chart(values, ylabel, title, outpath, higher_is_better=False):
    fig, ax = plt.subplots(figsize=(9, 5))
    bars = ax.bar(models, values, color=COLORS, edgecolor="white", linewidth=0.5)
    # Highlight best
    best_idx = values.index(min(values)) if not higher_is_better else values.index(max(values))
    bars[best_idx].set_edgecolor("gold")
    bars[best_idx].set_linewidth(2.5)
    for bar, val in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.01 * max(values),
                f"{val:.4f}", ha="center", va="bottom", fontsize=9)
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    ax.set_xticks(range(len(models)))
    ax.set_xticklabels(models, rotation=15, ha="right")
    plt.tight_layout()
    plt.savefig(outpath, dpi=300)
    plt.close()

bar_chart(comparison["MAE"].tolist(), "MAE (seconds)",
          "Model Comparison - Mean Absolute Error (lower is better)",
          "results/plots/comparison_mae.png")
print("Saved results/plots/comparison_mae.png")

bar_chart(comparison["RMSE"].tolist(), "RMSE (seconds)",
          "Model Comparison - Root Mean Squared Error (lower is better)",
          "results/plots/comparison_rmse.png")
print("Saved results/plots/comparison_rmse.png")

bar_chart(comparison["R2"].tolist(), "R² Score",
          "Model Comparison - R² Score (variance explained, higher is better)",
          "results/plots/comparison_r2.png", higher_is_better=True)
print("Saved results/plots/comparison_r2.png")

print("\n====================================")
print("     MODEL COMPARISON COMPLETED")
print("====================================")
