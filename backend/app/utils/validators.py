"""
Utility validators for VidOpt AI backend.
"""
import math
from pathlib import Path
from typing import Any

from app.config import SUPPORTED_INPUT_EXTENSIONS, SUPPORTED_CODECS


def is_finite_float(value: Any) -> bool:
    """Return True if value is a finite float."""
    try:
        return math.isfinite(float(value))
    except (TypeError, ValueError):
        return False


def validate_extension(filename: str) -> bool:
    """Return True if the file extension is supported."""
    ext = Path(filename).suffix.lower()
    return ext in SUPPORTED_INPUT_EXTENSIONS


def validate_codec(codec: str) -> bool:
    """Return True if codec is in the supported list."""
    return codec.lower() in SUPPORTED_CODECS


def clip_to_zero(value: float) -> float:
    """Clip negative predictions to 0."""
    return max(0.0, value)
