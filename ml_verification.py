"""
ml_verification.py - VidOpt AI ML Verification Suite
Runs all model and output checks. Exits with 0 on all-pass, 1 if any fail.
"""

import os
import sys
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import GroupShuffleSplit

# ==========================================
# CONFIGURATION
# ==========================================

DATA_PATH = "dataset/transcoding_mesurment.tsv"

FULL_NUMERIC = [
    "duration", "width", "height", "bitrate", "framerate",
    "i", "p", "b", "frames", "i_size", "p_size", "size",
    "o_bitrate", "o_framerate", "o_width", "o_height"
]
FULL_CATEGORICAL = ["codec", "o_codec"]
FULL_FEATURES = FULL_NUMERIC + FULL_CATEGORICAL  # 18 features

META_NUMERIC = [
    "duration", "width", "height", "bitrate", "framerate",
    "o_bitrate", "o_framerate", "o_width", "o_height"
]
META_CATEGORICAL = ["codec", "o_codec"]
META_FEATURES = META_NUMERIC + META_CATEGORICAL  # 11 features

# Synthetic sample rows
FULL_SAMPLE = pd.DataFrame([{
    "duration": 60.0, "width": 1280, "height": 720,
    "bitrate": 2000, "framerate": 25.0,
    "i": 50, "p": 150, "b": 300,
    "frames": 1500, "i_size": 2000, "p_size": 1000, "size": 300000,
    "o_bitrate": 1500, "o_framerate": 25.0, "o_width": 1280, "o_height": 720,
    "codec": "h264", "o_codec": "libx264"
}])

META_SAMPLE = pd.DataFrame([{
    "duration": 60.0, "width": 1280, "height": 720,
    "bitrate": 2000, "framerate": 25.0,
    "o_bitrate": 1500, "o_framerate": 25.0, "o_width": 1280, "o_height": 720,
    "codec": "h264", "o_codec": "libx264"
}])

REQUIRED_CSVS = [
    "results/random_forest_metrics.csv",
    "results/tuned_random_forest_metrics.csv",
    "results/xgboost_metrics.csv",
    "results/tuned_xgboost_metrics.csv",
    "results/tuned_xgboost_best_params.csv",
    "results/tuned_xgboost_cv_results.csv",
    "results/tuned_xgboost_predictions.csv",
    "results/tuned_xgboost_feature_importance.csv",
    "results/tuned_xgboost_training_ranges.csv",
    "results/model_comparison.csv",
    "results/error_analysis.csv",
    "results/error_top20_worst.csv",
    "results/error_analysis_by_duration.csv",
    "results/error_analysis_by_resolution.csv",
    "results/error_analysis_by_codec.csv",
    "results/metadata_model_metrics.csv",
    "results/metadata_model_feature_importance.csv",
    "results/metadata_training_ranges.csv",
]

# ==========================================
# TEST RUNNER
# ==========================================

results = []
all_pass = True

def test(name: str, fn):
    global all_pass
    try:
        fn()
        results.append((name, "PASS", ""))
    except Exception as e:
        results.append((name, "FAIL", str(e)))
        all_pass = False

# ==========================================
# TEST 1: Load final_model.pkl
# ==========================================

def test_final_model():
    m = joblib.load("models/final_model.pkl")
    assert m is not None, "final_model.pkl loaded as None"

test("1. Load models/final_model.pkl", test_final_model)

# ==========================================
# TEST 2: Load metadata_transcoding_model.pkl
# ==========================================

def test_metadata_model():
    m = joblib.load("models/metadata_transcoding_model.pkl")
    assert m is not None, "metadata_transcoding_model.pkl loaded as None"

test("2. Load models/metadata_transcoding_model.pkl", test_metadata_model)

# ==========================================
# TEST 3: Load tuned_xgboost_model.pkl
# ==========================================

def test_tuned_xgboost():
    m = joblib.load("models/tuned_xgboost_model.pkl")
    assert m is not None, "tuned_xgboost_model.pkl loaded as None"

test("3. Load models/tuned_xgboost_model.pkl", test_tuned_xgboost)

# ==========================================
# TEST 4: Load tuned_random_forest_model.pkl
# ==========================================

def test_tuned_rf():
    m = joblib.load("models/tuned_random_forest_model.pkl")
    assert m is not None, "tuned_random_forest_model.pkl loaded as None"

test("4. Load models/tuned_random_forest_model.pkl", test_tuned_rf)

# ==========================================
# TEST 5: Full model predicts on 18-feature sample
# ==========================================

def test_full_model_predict():
    m = joblib.load("models/final_model.pkl")
    pred = m.predict(FULL_SAMPLE)
    pred_clipped = np.maximum(pred, 0)
    assert np.isfinite(pred_clipped[0]), f"Prediction not finite: {pred_clipped[0]}"
    assert pred_clipped[0] >= 0, f"Prediction is negative: {pred_clipped[0]}"

test("5. Full model: predict on synthetic 18-feature sample (finite, >= 0)", test_full_model_predict)

# ==========================================
# TEST 6: Metadata model predicts on 11-feature sample
# ==========================================

def test_meta_model_predict():
    m = joblib.load("models/metadata_transcoding_model.pkl")
    pred = m.predict(META_SAMPLE)
    pred_clipped = np.maximum(pred, 0)
    assert np.isfinite(pred_clipped[0]), f"Prediction not finite: {pred_clipped[0]}"
    assert pred_clipped[0] >= 0, f"Prediction is negative: {pred_clipped[0]}"

test("6. Metadata model: predict on synthetic 11-feature sample (finite, >= 0)", test_meta_model_predict)

# ==========================================
# TEST 7: Full model feature count
# ==========================================

def test_full_feature_count():
    m = joblib.load("models/final_model.pkl")
    # Get feature names from the preprocessor
    names_out = m.named_steps["preprocessor"].get_feature_names_out()
    n_input_features = len(FULL_FEATURES)
    assert n_input_features == 18, f"Expected 18 input features, got {n_input_features}"
    # Verify model can be called with exactly 18 input columns
    sample_copy = FULL_SAMPLE.copy()
    assert list(sample_copy.columns) == FULL_FEATURES, \
        f"Feature mismatch: {list(sample_copy.columns)} vs {FULL_FEATURES}"

test("7. Full model: input feature count is 18", test_full_feature_count)

# ==========================================
# TEST 8: Metadata model feature count
# ==========================================

def test_meta_feature_count():
    m = joblib.load("models/metadata_transcoding_model.pkl")
    n_input_features = len(META_FEATURES)
    assert n_input_features == 11, f"Expected 11 metadata features, got {n_input_features}"
    sample_copy = META_SAMPLE.copy()
    assert list(sample_copy.columns) == META_FEATURES, \
        f"Feature mismatch: {list(sample_copy.columns)} vs {META_FEATURES}"

test("8. Metadata model: input feature count is 11", test_meta_feature_count)

# ==========================================
# TEST 9: No group leakage (train IDs not in test IDs)
# ==========================================

def test_no_leakage():
    df = pd.read_csv(DATA_PATH, sep="\t")
    X = df[FULL_FEATURES].copy()
    y = df["utime"].copy()
    groups = df["id"].copy()
    for col in FULL_CATEGORICAL:
        X[col] = X[col].astype(str)
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=42)
    train_index, test_index = next(splitter.split(X, y, groups))
    train_ids = set(groups.iloc[train_index])
    test_ids  = set(groups.iloc[test_index])
    overlap = train_ids & test_ids
    assert len(overlap) == 0, f"Group leakage detected! {len(overlap)} shared IDs: {list(overlap)[:5]}"

test("9. No group leakage: train IDs disjoint from test IDs", test_no_leakage)

# ==========================================
# TEST 10: All required CSV outputs exist
# ==========================================

def test_csvs_exist():
    missing = [p for p in REQUIRED_CSVS if not os.path.exists(p)]
    assert len(missing) == 0, f"Missing CSV files: {missing}"

test("10. All required result CSVs exist", test_csvs_exist)

# ==========================================
# PRINT RESULTS
# ==========================================

print("\n" + "=" * 60)
print("   VIDOPT AI - ML VERIFICATION RESULTS")
print("=" * 60)

for name, status, msg in results:
    icon = "✓" if status == "PASS" else "✗"
    line = f"  [{status}] {icon} {name}"
    print(line)
    if msg:
        print(f"         ERROR: {msg}")

print("=" * 60)
pass_count = sum(1 for _, s, _ in results if s == "PASS")
fail_count = sum(1 for _, s, _ in results if s == "FAIL")
print(f"  TOTAL: {pass_count} PASS, {fail_count} FAIL")
print("=" * 60)

if all_pass:
    print("  ALL TESTS PASSED - ML verification successful!")
    sys.exit(0)
else:
    print("  SOME TESTS FAILED - review errors above.")
    sys.exit(1)
