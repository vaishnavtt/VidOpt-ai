"""
Model service — loads and manages the ML models at startup.
"""
import logging
from pathlib import Path
from typing import Any, Dict, Optional

import joblib

from app.config import (
    MODEL_PATH,
    METADATA_MODEL_PATH,
    MODEL_INFO_PATH,
)

logger = logging.getLogger(__name__)


class ModelService:
    """Manages loading and access to the trained ML models."""

    # Feature definitions (must match training pipeline)
    FULL_NUMERIC_FEATURES = [
        "duration", "width", "height", "bitrate", "framerate",
        "i", "p", "b", "frames", "i_size", "p_size", "size",
        "o_bitrate", "o_framerate", "o_width", "o_height",
    ]
    FULL_CATEGORICAL_FEATURES = ["codec", "o_codec"]
    FULL_FEATURES = FULL_NUMERIC_FEATURES + FULL_CATEGORICAL_FEATURES

    METADATA_NUMERIC_FEATURES = [
        "duration", "width", "height", "bitrate", "framerate",
        "o_bitrate", "o_framerate", "o_width", "o_height",
    ]
    METADATA_CATEGORICAL_FEATURES = ["codec", "o_codec"]
    METADATA_FEATURES = METADATA_NUMERIC_FEATURES + METADATA_CATEGORICAL_FEATURES

    LIMITATIONS = [
        "Predictions are based on the training distribution; highly unusual "
        "codec/resolution combinations may be less accurate.",
        "FFprobe is required only for video upload analysis; metadata prediction "
        "works without it.",
        "Model does not account for hardware-specific transcoding acceleration (GPU/NVENC).",
        "Very short clips (< 1 s) or extremely high bitrates may fall outside "
        "the training range.",
    ]

    def __init__(self) -> None:
        self.full_model: Optional[Any] = None
        self.metadata_model: Optional[Any] = None
        self._load_models()

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _load_models(self) -> None:
        self.full_model = self.load_model(MODEL_PATH, "full_model")
        self.metadata_model = self.load_model(METADATA_MODEL_PATH, "metadata_model")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @staticmethod
    def load_model(path: Path, model_name: str) -> Optional[Any]:
        """
        Load a joblib model from *path*.

        Returns the loaded pipeline on success, or None on failure (with logging).
        """
        try:
            model = joblib.load(path)
            logger.info("Loaded %s from %s", model_name, path)
            return model
        except FileNotFoundError:
            logger.warning(
                "Model file not found for '%s': %s — model will be unavailable.",
                model_name,
                path,
            )
            return None
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Failed to load model '%s' from %s: %s",
                model_name,
                path,
                exc,
            )
            return None

    def get_full_model(self) -> Optional[Any]:
        """Return the full-feature model (or None if not loaded)."""
        return self.full_model

    def get_metadata_model(self) -> Optional[Any]:
        """Return the metadata-only model (or None if not loaded)."""
        return self.metadata_model

    def is_full_model_ready(self) -> bool:
        """True if the full-feature model is loaded and ready."""
        return self.full_model is not None

    def is_metadata_model_ready(self) -> bool:
        """True if the metadata-only model is loaded and ready."""
        return self.metadata_model is not None

    def get_model_info(self) -> Dict[str, Any]:
        """Return public model metadata (no file paths exposed)."""
        return {
            "full_model_ready": self.is_full_model_ready(),
            "metadata_model_ready": self.is_metadata_model_ready(),
            "full_model_features": {
                "numeric": self.FULL_NUMERIC_FEATURES,
                "categorical": self.FULL_CATEGORICAL_FEATURES,
                "total": len(self.FULL_FEATURES),
            },
            "metadata_model_features": {
                "numeric": self.METADATA_NUMERIC_FEATURES,
                "categorical": self.METADATA_CATEGORICAL_FEATURES,
                "total": len(self.METADATA_FEATURES),
            },
            "limitations": self.LIMITATIONS,
        }
