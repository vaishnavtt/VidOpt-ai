import os
import warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

warnings.filterwarnings("ignore")

# =====================================================
# CONFIGURATION
# =====================================================

DATA_PATH = "dataset/transcoding_mesurment.tsv"
OUTPUT_DIR = "eda_results"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(f"{OUTPUT_DIR}/plots", exist_ok=True)
os.makedirs(f"{OUTPUT_DIR}/reports", exist_ok=True)

sns.set_theme(style="whitegrid")

df = pd.read_csv(DATA_PATH, sep="\t")

report = []

def log(message=""):
    print(message)
    report.append(str(message))


log("=" * 65)
log("VIDOPT AI - COMPLETE EXPLORATORY DATA ANALYSIS")
log("=" * 65)


# =====================================================
# 1. DATASET OVERVIEW
# =====================================================

log("\n1. DATASET OVERVIEW")

log(f"Total records: {df.shape[0]}")
log(f"Total columns: {df.shape[1]}")
log(f"Memory usage: {df.memory_usage(deep=True).sum() / 1024**2:.2f} MB")

log("\nColumn names:")
log(df.columns.tolist().__str__())

log("\nData types:")
log(df.dtypes.to_string())

log("\nDataset information:")
log(df.info().__str__())

df.describe(include="all").T.to_csv(
    f"{OUTPUT_DIR}/reports/dataset_summary.csv"
)


# =====================================================
# 2. DATA QUALITY CHECKS
# =====================================================

log("\n2. DATA QUALITY CHECKS")

missing = df.isnull().sum()

log("\nMissing values:")
log(missing.to_string())

log(f"\nTotal missing values: {missing.sum()}")

duplicates = df.duplicated().sum()

log(f"\nDuplicate rows: {duplicates}")

log("\nConstant columns:")

constant_columns = [
    col for col in df.columns
    if df[col].nunique(dropna=False) <= 1
]

log(str(constant_columns))

log("\nUnique values per column:")

unique_counts = df.nunique().sort_values()

log(unique_counts.to_string())

unique_counts.to_csv(
    f"{OUTPUT_DIR}/reports/unique_value_counts.csv"
)

missing.to_csv(
    f"{OUTPUT_DIR}/reports/missing_values.csv"
)


# =====================================================
# 3. NUMERICAL AND CATEGORICAL FEATURES
# =====================================================

log("\n3. FEATURE TYPES")

numerical = df.select_dtypes(include=np.number).columns.tolist()

categorical = df.select_dtypes(
    include=["object", "category"]
).columns.tolist()

log(f"\nNumerical columns ({len(numerical)}):")
log(str(numerical))

log(f"\nCategorical columns ({len(categorical)}):")
log(str(categorical))


# =====================================================
# 4. TARGET VARIABLE ANALYSIS
# =====================================================

log("\n4. TARGET VARIABLE ANALYSIS")

TARGET = "utime"

if TARGET not in df.columns:
    raise ValueError("Target column 'utime' not found!")

log("\nTranscoding time statistics:")
log(df[TARGET].describe().to_string())

log(f"\nSkewness: {df[TARGET].skew():.4f}")
log(f"Kurtosis: {df[TARGET].kurtosis():.4f}")

log(f"\nZero or negative transcoding times: {(df[TARGET] <= 0).sum()}")

# Target histogram
plt.figure(figsize=(10, 6))

sns.histplot(df[TARGET], bins=60, kde=True)

plt.title("Distribution of Transcoding Time")
plt.xlabel("Transcoding Time (seconds)")
plt.ylabel("Frequency")

plt.tight_layout()
plt.savefig(f"{OUTPUT_DIR}/plots/target_distribution.png", dpi=150)
plt.close()

# Log transformed target
plt.figure(figsize=(10, 6))

sns.histplot(np.log1p(df[TARGET]), bins=60, kde=True)

plt.title("Log Transformed Transcoding Time")
plt.xlabel("log(1 + Transcoding Time)")
plt.ylabel("Frequency")

plt.tight_layout()
plt.savefig(f"{OUTPUT_DIR}/plots/target_log_distribution.png", dpi=150)
plt.close()

# Boxplot
plt.figure(figsize=(10, 4))

sns.boxplot(x=df[TARGET])

plt.title("Transcoding Time Outlier Analysis")

plt.tight_layout()
plt.savefig(f"{OUTPUT_DIR}/plots/target_boxplot.png", dpi=150)
plt.close()


# =====================================================
# 5. OUTLIER DETECTION
# =====================================================

log("\n5. OUTLIER DETECTION (IQR METHOD)")

outlier_results = []

for col in numerical:

    q1 = df[col].quantile(0.25)
    q3 = df[col].quantile(0.75)

    iqr = q3 - q1

    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr

    count = ((df[col] < lower) | (df[col] > upper)).sum()

    percentage = count / len(df) * 100

    outlier_results.append({
        "Feature": col,
        "Lower Bound": lower,
        "Upper Bound": upper,
        "Outlier Count": count,
        "Outlier Percentage": percentage
    })

outlier_df = pd.DataFrame(outlier_results)

log(outlier_df.to_string(index=False))

outlier_df.to_csv(
    f"{OUTPUT_DIR}/reports/outlier_analysis.csv",
    index=False
)


# =====================================================
# 6. CORRELATION ANALYSIS
# =====================================================

log("\n6. CORRELATION ANALYSIS")

correlation = df[numerical].corr()

correlation.to_csv(
    f"{OUTPUT_DIR}/reports/correlation_matrix.csv"
)

if TARGET in correlation.columns:

    target_corr = correlation[TARGET].sort_values(
        ascending=False
    )

    log("\nCorrelation with transcoding time:")
    log(target_corr.to_string())

# Correlation heatmap
plt.figure(figsize=(17, 13))

sns.heatmap(
    correlation,
    cmap="coolwarm",
    center=0,
    annot=False,
    linewidths=0.3
)

plt.title("Numerical Feature Correlation Heatmap")

plt.tight_layout()
plt.savefig(
    f"{OUTPUT_DIR}/plots/correlation_heatmap.png",
    dpi=150
)

plt.close()


# =====================================================
# 7. CATEGORICAL FEATURE ANALYSIS
# =====================================================

log("\n7. CATEGORICAL FEATURE ANALYSIS")

for col in categorical:

    log(f"\nFeature: {col}")

    log(df[col].value_counts(dropna=False).to_string())

    if col == "id":
        continue

    # Category distribution
    plt.figure(figsize=(10, 6))

    order = df[col].value_counts().index

    sns.countplot(
        data=df,
        x=col,
        order=order
    )

    plt.title(f"Distribution of {col}")
    plt.xticks(rotation=45)

    plt.tight_layout()

    plt.savefig(
        f"{OUTPUT_DIR}/plots/{col}_distribution.png",
        dpi=150
    )

    plt.close()

    # Target by category
    category_target = (
        df.groupby(col, observed=True)[TARGET]
        .agg(["count", "mean", "median", "std"])
        .sort_values("mean", ascending=False)
    )

    category_target.to_csv(
        f"{OUTPUT_DIR}/reports/{col}_target_analysis.csv"
    )

    log("\nTranscoding time by category:")
    log(category_target.to_string())


# =====================================================
# 8. VIDEO CHARACTERISTICS ANALYSIS
# =====================================================

log("\n8. VIDEO CHARACTERISTICS ANALYSIS")

video_features = [
    "duration",
    "width",
    "height",
    "bitrate",
    "framerate",
    "frames",
    "size",
    "o_bitrate",
    "o_framerate",
    "o_width",
    "o_height"
]

available_features = [
    col for col in video_features
    if col in df.columns
]

for col in available_features:

    plt.figure(figsize=(9, 5))

    sns.scatterplot(
        data=df.sample(min(5000, len(df)), random_state=42),
        x=col,
        y=TARGET,
        alpha=0.4
    )

    plt.title(f"{col} vs Transcoding Time")

    plt.tight_layout()

    plt.savefig(
        f"{OUTPUT_DIR}/plots/{col}_vs_utime.png",
        dpi=150
    )

    plt.close()


# Resolution analysis

if {"width", "height"}.issubset(df.columns):

    df["input_resolution"] = (
        df["width"].astype(str)
        + "x"
        + df["height"].astype(str)
    )

if {"o_width", "o_height"}.issubset(df.columns):

    df["output_resolution"] = (
        df["o_width"].astype(str)
        + "x"
        + df["o_height"].astype(str)
    )

    resolution_analysis = (
        df.groupby("output_resolution")[TARGET]
        .agg(["count", "mean", "median"])
        .sort_values("mean", ascending=False)
    )

    resolution_analysis.to_csv(
        f"{OUTPUT_DIR}/reports/output_resolution_analysis.csv"
    )

    log("\nOutput resolution analysis:")
    log(resolution_analysis.to_string())


# =====================================================
# 9. ID AND DATA LEAKAGE INVESTIGATION
# =====================================================

log("\n9. ID AND DATA LEAKAGE INVESTIGATION")

if "id" in df.columns:

    id_counts = df["id"].value_counts()

    log(f"\nUnique video IDs: {df['id'].nunique()}")

    log(f"Repeated video IDs: {(id_counts > 1).sum()}")

    log(f"Maximum records per video: {id_counts.max()}")

    log("\nVideo ID frequency distribution:")
    log(id_counts.value_counts().sort_index().to_string())

    id_counts.rename_axis("video_id").reset_index(
        name="record_count"
    ).to_csv(
        f"{OUTPUT_DIR}/reports/video_id_frequency.csv",
        index=False
    )

# Investigate memory relationship
if "umem" in df.columns:

    log(
        "\nCorrelation between memory usage and transcoding time: "
        f"{df['umem'].corr(df[TARGET]):.4f}"
    )

    log(
        "WARNING: umem is an outcome measured during transcoding. "
        "Exclude it from the primary pre-transcoding prediction model."
    )

log(
    "\nIMPORTANT: Features such as frames, i, p, i_size, "
    "p_size and size may require analysing the source video. "
    "They are not necessarily available from basic user inputs."
)


# =====================================================
# 10. HIGHLY CORRELATED FEATURES
# =====================================================

log("\n10. HIGHLY CORRELATED FEATURE PAIRS")

upper_triangle = correlation.abs().where(
    np.triu(np.ones(correlation.shape), k=1).astype(bool)
)

high_corr_pairs = []

for col in upper_triangle.columns:

    for row in upper_triangle.index:

        value = upper_triangle.loc[row, col]

        if pd.notna(value) and value >= 0.90:

            high_corr_pairs.append({
                "Feature 1": row,
                "Feature 2": col,
                "Correlation": value
            })

high_corr_df = pd.DataFrame(high_corr_pairs)

if not high_corr_df.empty:
    log(high_corr_df.to_string(index=False))
else:
    log("No feature pairs above 0.90 correlation.")

high_corr_df.to_csv(
    f"{OUTPUT_DIR}/reports/high_correlation_pairs.csv",
    index=False
)


# =====================================================
# 11. INVALID AND UNUSUAL VALUE CHECKS
# =====================================================

log("\n11. INVALID VALUE CHECKS")

positive_features = [
    "duration",
    "width",
    "height",
    "bitrate",
    "framerate",
    "frames",
    "size",
    "o_bitrate",
    "o_framerate",
    "o_width",
    "o_height",
    "utime"
]

for col in positive_features:

    if col in df.columns:

        invalid = (df[col] <= 0).sum()

        log(f"{col}: {invalid} zero or negative values")

if {"i", "p", "b", "frames"}.issubset(df.columns):

    frame_difference = (
        df["i"] + df["p"] + df["b"] - df["frames"]
    )

    log(
        "\nRows where I + P + B frames do not equal total frames: "
        f"{(frame_difference != 0).sum()}"
    )


# =====================================================
# 12. EXPORT COMPLETE REPORT
# =====================================================

with open(
    f"{OUTPUT_DIR}/reports/complete_eda_report.txt",
    "w",
    encoding="utf-8"
) as file:

    file.write("\n".join(report))


log("\n" + "=" * 65)
log("EDA COMPLETED SUCCESSFULLY")
log("=" * 65)

log(f"\nAll results saved inside: {OUTPUT_DIR}/")

log("\nGenerated folders:")
log("eda_results/plots/")
log("eda_results/reports/")

print("\nOpen eda_results to explore your analysis.")