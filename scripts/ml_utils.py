"""
ml_utils.py - VidOpt AI ML Utilities
Shared utilities for model loading, input validation, prediction, and
approximate prediction intervals.
"""

import os
import numpy as np
import pandas as pd
import joblib
import warnings

# ==========================================
# MODEL METADATA REGISTRY
# ==========================================

MODEL_INFO = {
    "tuned_xgboost": {
        "name": "Tuned XGBoost Regressor (Full Features)",
        "path": "models/tuned_xgboost_model.pkl",
        "features": {
            "numeric": [
                "duration", "width", "height", "bitrate", "framerate",
                "i", "p", "b", "frames", "i_size", "p_size", "size",
                "o_bitrate", "o_framerate", "o_width", "o_height"
            ],
            "categorical": ["codec", "o_codec"]
        },
        "n_features": 18,
        "metrics": {
            "MAE": None,   # Filled at runtime from CSV if needed
            "RMSE": None,
            "R2": None,
        },
        "limitations": [
            "Requires content-analysis features (i, p, b, frames, i_size, p_size, size) "
            "which are only available after partial decode.",
            "May underperform on video codecs or resolutions unseen during training.",
            "Prediction intervals are approximate (residual-based), not probabilistic.",
        ]
    },
    "metadata_model": {
        "name": "Metadata XGBoost Regressor (Pre-Transcode Features Only)",
        "path": "models/metadata_transcoding_model.pkl",
        "features": {
            "numeric": [
                "duration", "width", "height", "bitrate", "framerate",
                "o_bitrate", "o_framerate", "o_width", "o_height"
            ],
            "categorical": ["codec", "o_codec"]
        },
        "n_features": 11,
        "metrics": {
            "MAE": None,
            "RMSE": None,
            "R2": None,
        },
        "limitations": [
            "Uses only 11 metadata features - no content-based features.",
            "Higher MAE than full-feature model; use for pre-transcode estimation only.",
            "Prediction intervals are approximate (residual-based), not probabilistic.",
        ]
    },
    "final_model": {
        "name": "Final Model (best-performing, alias)",
        "path": "models/final_model.pkl",
        "features": "same as tuned_xgboost (full feature set)",
        "n_features": 18,
        "metrics": {
            "MAE": None,
            "RMSE": None,
            "R2": None,
        },
        "limitations": [
            "See tuned_xgboost limitations.",
        ]
    }
}

# Known codecs from EDA
KNOWN_CODECS = ["h264", "mpeg4", "vp8", "flv", "h265", "wmv3", "mpeg2video",
                "rv30", "rv40", "theora", "wmv2", "wmv1"]
KNOWN_O_CODECS = ["libx264", "mpeg4", "libvpx", "flv", "libx265", "wmv3",
                  "mpeg2video", "libvpx-vp9"]


# ==========================================
# FUNCTION: load_model
# ==========================================

def load_model(path: str):
    """
    Load a joblib-serialized sklearn/XGBoost pipeline from disk.

    Parameters
    ----------
    path : str
        Path to the .pkl model file.

    Returns
    -------
    model : fitted sklearn Pipeline

    Raises
    ------
    FileNotFoundError if the file does not exist.
    """
    if not os.path.exists(path):
        # Also check relative to repository root if invoked from scripts/ or subdirectories
        from pathlib import Path
        repo_root = Path(__file__).resolve().parent.parent
        alt_path = repo_root / path
        if alt_path.exists():
            path = str(alt_path)
        else:
            raise FileNotFoundError(
                f"Model file not found: '{path}'. "
                f"Run the appropriate training script to generate it."
            )
    model = joblib.load(path)
    if model is None:
        raise ValueError(f"Model loaded as None from '{path}'. File may be corrupt.")
    return model


# ==========================================
# FUNCTION: validate_input
# ==========================================

def validate_input(
    data_dict: dict,
    feature_ranges: dict,
    known_codecs: dict = None
) -> list:
    """
    Validate a single input sample and return a list of warning strings.
    Does NOT reject OOD inputs - only warns.

    Parameters
    ----------
    data_dict : dict
        Feature values keyed by feature name, e.g. {"duration": 60.0, "codec": "h264", ...}
    feature_ranges : dict
        Dict mapping feature name -> {"min": float, "max": float}.
        Typically loaded from results/tuned_xgboost_training_ranges.csv or
        results/metadata_training_ranges.csv.
    known_codecs : dict, optional
        Dict with keys "codec" and "o_codec", each a list of known codec strings.
        Defaults to KNOWN_CODECS / KNOWN_O_CODECS from this module.

    Returns
    -------
    warnings_list : list of str
        Empty list if all checks pass.
    """
    if known_codecs is None:
        known_codecs = {
            "codec":   KNOWN_CODECS,
            "o_codec": KNOWN_O_CODECS,
        }

    warnings_list = []

    # Check for zero or missing duration
    duration = data_dict.get("duration")
    if duration is not None:
        if duration <= 0:
            warnings_list.append(
                f"[OOD] 'duration' is {duration} - must be > 0 for valid transcoding prediction."
            )

    # Check numeric features for negative values and out-of-range
    for feat, val in data_dict.items():
        if isinstance(val, (int, float)):
            if np.isnan(val):
                warnings_list.append(f"[MISSING] '{feat}' is NaN.")
                continue
            if val < 0:
                warnings_list.append(f"[INVALID] '{feat}' is negative ({val}). Expected >= 0.")
            if feat in feature_ranges:
                lo = feature_ranges[feat]["min"]
                hi = feature_ranges[feat]["max"]
                if val < lo or val > hi:
                    warnings_list.append(
                        f"[OOD] '{feat}'={val} is outside training range [{lo:.4g}, {hi:.4g}]."
                    )

    # Check categorical codec values
    for codec_feat, codec_list in known_codecs.items():
        val = data_dict.get(codec_feat)
        if val is not None and str(val) not in codec_list:
            warnings_list.append(
                f"[OOD] '{codec_feat}'='{val}' was not seen during training. "
                f"Known values: {codec_list}"
            )

    return warnings_list


# ==========================================
# FUNCTION: predict_with_pipeline
# ==========================================

def predict_with_pipeline(pipeline, input_df: pd.DataFrame) -> float:
    """
    Run a prediction through a fitted sklearn Pipeline and clip to >= 0.

    Parameters
    ----------
    pipeline : fitted sklearn Pipeline
        Must include a preprocessor and a regressor.
    input_df : pd.DataFrame
        Single-row or multi-row DataFrame with the correct feature columns.

    Returns
    -------
    float
        Predicted transcoding time in seconds (clipped to 0 if negative).
        If input_df has multiple rows, returns a numpy array.
    """
    raw = pipeline.predict(input_df)
    clipped = np.maximum(raw, 0)
    if len(clipped) == 1:
        return float(clipped[0])
    return clipped


# ==========================================
# FUNCTION: get_prediction_interval
# ==========================================

def get_prediction_interval(
    model,
    X: pd.DataFrame,
    y_train: pd.Series,
    percentile: float = 90
) -> tuple:
    """
    Compute an approximate prediction interval based on training residuals.

    This is a residual-based approximation, NOT a probabilistic confidence
    interval. It estimates the range within which a given fraction of
    predictions have fallen historically on the training distribution.

    Strategy:
      1. Predict on X (the provided samples, ideally a held-out training subset).
      2. Compute residuals: predicted - actual.
      3. Return the (lower, upper) offsets at ±percentile/2 of the residual distribution.

    Parameters
    ----------
    model : fitted sklearn Pipeline
    X : pd.DataFrame
        Feature DataFrame (should be a training subset, not the test set).
    y_train : pd.Series
        Actual target values corresponding to X.
    percentile : float
        Coverage percentage (default=90 -> 5th to 95th percentile of residuals).

    Returns
    -------
    (lower_offset, upper_offset) : tuple of float
        Add lower_offset to a prediction for the lower bound,
        add upper_offset for the upper bound.
        IMPORTANT: This is an approximate range based on training residuals,
        not a probabilistic confidence interval.

    Example
    -------
    >>> lower, upper = get_prediction_interval(model, X_sample, y_sample, percentile=90)
    >>> pred = predict_with_pipeline(model, X_new)
    >>> print(f"Approx range: [{pred+lower:.2f}, {pred+upper:.2f}] s (90% training coverage)")
    """
    preds = np.maximum(model.predict(X), 0)
    residuals = preds - np.array(y_train)

    tail = (100 - percentile) / 2
    lower_offset = float(np.percentile(residuals, tail))
    upper_offset = float(np.percentile(residuals, 100 - tail))

    return (lower_offset, upper_offset)


# ==========================================
# HELPER: load_feature_ranges
# ==========================================

def load_feature_ranges(csv_path: str) -> dict:
    """
    Load feature ranges from a training_ranges CSV into a dict.

    Parameters
    ----------
    csv_path : str
        Path to a CSV with columns: feature, min, max.

    Returns
    -------
    dict: {feature_name: {"min": float, "max": float}}
    """
    if not os.path.exists(csv_path):
        warnings.warn(f"Feature ranges file not found: '{csv_path}'. OOD checks disabled.")
        return {}
    df = pd.read_csv(csv_path)
    return {row["feature"]: {"min": row["min"], "max": row["max"]} for _, row in df.iterrows()}


if __name__ == "__main__":
    print("ml_utils.py loaded successfully.")
    print("MODEL_INFO keys:", list(MODEL_INFO.keys()))
    print("KNOWN_CODECS:", KNOWN_CODECS)
    print("KNOWN_O_CODECS:", KNOWN_O_CODECS)

    # Quick smoke-test of validate_input
    sample = {
        "duration": 60.0, "width": 1280, "height": 720,
        "bitrate": 2000, "framerate": 25.0,
        "o_bitrate": 1500, "o_framerate": 25.0, "o_width": 1280, "o_height": 720,
        "codec": "h264", "o_codec": "libx264"
    }
    warns = validate_input(sample, {})
    print("validate_input smoke test warnings:", warns)
    print("\nAll ml_utils functions defined successfully.")
