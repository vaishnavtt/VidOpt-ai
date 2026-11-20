"""
Prediction service — builds DataFrames and calls the ML models.
"""
import logging
from typing import List, Optional

import pandas as pd

from app.schemas.prediction import (
    FullPredictionRequest,
    MetadataPredictionRequest,
    PredictionDetail,
    PredictionResponse,
)
from app.services.model_service import ModelService

logger = logging.getLogger(__name__)

# Reasonable input ranges for out-of-distribution warnings
_METADATA_RANGES = {
    "duration":    (0.1, 7200),
    "width":       (16, 7680),
    "height":      (16, 4320),
    "bitrate":     (10_000, 100_000_000),
    "framerate":   (1, 120),
    "o_bitrate":   (10_000, 100_000_000),
    "o_framerate": (1, 120),
    "o_width":     (16, 7680),
    "o_height":    (16, 4320),
}


def _format_time(seconds: float) -> str:
    """Format seconds into a human-readable string."""
    if seconds < 60:
        return f"{seconds:.2f} seconds"
    if seconds < 3600:
        m = int(seconds // 60)
        s = int(seconds % 60)
        return f"{m}m {s}s"
    h = int(seconds // 3600)
    remainder = seconds % 3600
    m = int(remainder // 60)
    s = int(remainder % 60)
    return f"{h}h {m}m {s}s"


def _check_ranges(data: dict, ranges: dict) -> List[str]:
    """Return warnings for fields outside expected ranges."""
    warnings: List[str] = []
    for field, (lo, hi) in ranges.items():
        val = data.get(field)
        if val is not None and not (lo <= val <= hi):
            warnings.append(
                f"'{field}' value {val} is outside the typical training range "
                f"[{lo}, {hi}]; prediction may be less accurate."
            )
    return warnings


class PredictionService:
    """Handles prediction logic for both metadata-only and full-feature models."""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def predict_metadata(
        self,
        request: MetadataPredictionRequest,
        model_service: ModelService,
    ) -> PredictionResponse:
        """Predict transcoding time using metadata-only features."""
        model = model_service.get_metadata_model()
        if model is None:
            return PredictionResponse(
                success=False,
                message="Metadata model is not available. Please try again later.",
            )

        data = {
            "duration":    request.duration,
            "width":       request.width,
            "height":      request.height,
            "bitrate":     request.bitrate,
            "framerate":   request.framerate,
            "o_bitrate":   request.o_bitrate,
            "o_framerate": request.o_framerate,
            "o_width":     request.o_width,
            "o_height":    request.o_height,
            "codec":       request.codec,
            "o_codec":     request.o_codec,
        }

        warnings = _check_ranges(data, _METADATA_RANGES)
        feature_order = ModelService.METADATA_NUMERIC_FEATURES + ModelService.METADATA_CATEGORICAL_FEATURES
        df = pd.DataFrame([data])[feature_order]

        try:
            raw = float(model.predict(df)[0])
        except Exception as exc:  # noqa: BLE001
            logger.error("Metadata prediction failed: %s", exc, exc_info=True)
            return PredictionResponse(
                success=False,
                message="Prediction failed due to an internal error.",
            )

        predicted = max(0.0, raw)
        return PredictionResponse(
            success=True,
            prediction=PredictionDetail(
                estimated_time_seconds=predicted,
                estimated_time_formatted=_format_time(predicted),
                model_name="metadata_transcoding_model",
                prediction_type="metadata_only",
            ),
            message="Prediction successful.",
            warnings=warnings,
        )

    def predict_full(
        self,
        request: FullPredictionRequest,
        model_service: ModelService,
    ) -> PredictionResponse:
        """Predict transcoding time using all 18 features."""
        model = model_service.get_full_model()
        if model is None:
            return PredictionResponse(
                success=False,
                message="Full-feature model is not available. Please try again later.",
            )

        data = {
            "duration":    request.duration,
            "width":       request.width,
            "height":      request.height,
            "bitrate":     request.bitrate,
            "framerate":   request.framerate,
            "i":           request.i,
            "p":           request.p,
            "b":           request.b,
            "frames":      request.frames,
            "i_size":      request.i_size,
            "p_size":      request.p_size,
            "size":        request.size,
            "o_bitrate":   request.o_bitrate,
            "o_framerate": request.o_framerate,
            "o_width":     request.o_width,
            "o_height":    request.o_height,
            "codec":       request.codec,
            "o_codec":     request.o_codec,
        }

        # Reuse metadata range checks for the overlapping fields
        warnings = _check_ranges(data, _METADATA_RANGES)
        feature_order = ModelService.FULL_NUMERIC_FEATURES + ModelService.FULL_CATEGORICAL_FEATURES
        df = pd.DataFrame([data])[feature_order]

        try:
            raw = float(model.predict(df)[0])
        except Exception as exc:  # noqa: BLE001
            logger.error("Full prediction failed: %s", exc, exc_info=True)
            return PredictionResponse(
                success=False,
                message="Prediction failed due to an internal error.",
            )

        predicted = max(0.0, raw)
        return PredictionResponse(
            success=True,
            prediction=PredictionDetail(
                estimated_time_seconds=predicted,
                estimated_time_formatted=_format_time(predicted),
                model_name="final_model",
                prediction_type="full_features",
            ),
            message="Prediction successful.",
            warnings=warnings,
        )

    @staticmethod
    def format_time(seconds: float) -> str:
        """Public alias for the module-level _format_time helper."""
        return _format_time(seconds)
