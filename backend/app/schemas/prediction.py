"""
Pydantic schemas for prediction requests and responses.
"""
import math
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, field_validator, model_validator, Field


def _reject_non_finite(v: float, field_name: str = "value") -> float:
    """Reject NaN and infinite float values."""
    if not math.isfinite(v):
        raise ValueError(f"{field_name} must be a finite number (got {v})")
    return v


class MetadataPredictionRequest(BaseModel):
    """Request schema for metadata-only transcoding time prediction."""

    duration: float = Field(..., gt=0, description="Video duration in seconds")
    width: int = Field(..., gt=0, description="Source video width in pixels")
    height: int = Field(..., gt=0, description="Source video height in pixels")
    bitrate: int = Field(..., gt=0, description="Source bitrate in bps")
    framerate: float = Field(..., gt=0, le=240, description="Source framerate in fps")
    codec: str = Field(..., min_length=1, description="Source codec name")
    o_codec: str = Field(..., min_length=1, description="Output codec name")
    o_width: int = Field(..., gt=0, description="Output width in pixels")
    o_height: int = Field(..., gt=0, description="Output height in pixels")
    o_bitrate: int = Field(..., gt=0, description="Output bitrate in bps")
    o_framerate: float = Field(..., gt=0, le=240, description="Output framerate in fps")

    @field_validator("duration", "framerate", "o_framerate")
    @classmethod
    def reject_non_finite_floats(cls, v: float) -> float:
        if not math.isfinite(v):
            raise ValueError(f"Value must be a finite number (got {v})")
        return v

    @field_validator("codec", "o_codec")
    @classmethod
    def reject_empty_strings(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Codec name must not be empty or whitespace")
        return v.strip().lower()


class FullPredictionRequest(MetadataPredictionRequest):
    """Request schema for full-feature transcoding time prediction."""

    i: int = Field(..., ge=0, description="Number of I-frames")
    p: int = Field(..., ge=0, description="Number of P-frames")
    b: int = Field(..., ge=0, description="Number of B-frames")
    frames: int = Field(..., gt=0, description="Total number of frames")
    i_size: float = Field(..., ge=0, description="Total size of I-frames in bytes")
    p_size: float = Field(..., ge=0, description="Total size of P-frames in bytes")
    size: float = Field(..., ge=0, description="Total file size in bytes")

    @field_validator("i_size", "p_size", "size")
    @classmethod
    def reject_non_finite_frame_sizes(cls, v: float) -> float:
        if not math.isfinite(v):
            raise ValueError(f"Value must be a finite number (got {v})")
        return v


class PredictionDetail(BaseModel):
    """Detailed prediction result."""

    estimated_time_seconds: float
    estimated_time_formatted: str
    model_name: str
    prediction_type: str  # "metadata_only" or "full_features"


class PredictionResponse(BaseModel):
    """Response schema for transcoding time prediction."""

    success: bool
    prediction: Optional[PredictionDetail] = None
    message: str
    warnings: List[str] = Field(default_factory=list)


class HealthResponse(BaseModel):
    """Health-check response."""

    status: str
    api_version: str
    model_full_ready: bool
    model_metadata_ready: bool
    ffprobe_available: bool
    model_name: str


class VideoStream(BaseModel):
    """Extracted video stream information."""

    codec_name: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    r_frame_rate: Optional[str] = None
    framerate: Optional[float] = None
    bit_rate: Optional[int] = None


class VideoMetadataResponse(BaseModel):
    """Response schema for video metadata extraction."""

    success: bool
    filename: str
    duration: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    codec: Optional[str] = None
    bitrate: Optional[int] = None
    framerate: Optional[float] = None
    size_bytes: Optional[int] = None
    format_name: Optional[str] = None
    message: str


class ModelInfoResponse(BaseModel):
    """Response schema for model information."""

    full_model_ready: bool
    metadata_model_ready: bool
    full_model_features: Dict[str, Any]
    metadata_model_features: Dict[str, Any]
    limitations: List[str]


class OptionsResponse(BaseModel):
    """Response schema for supported options."""

    supported_codecs: List[str]
    supported_input_extensions: List[str]
    max_upload_size_bytes: int
    max_upload_size_mb: float


class TranscodingConfigRequest(BaseModel):
    """Request schema for transcoding configuration validation."""

    # Source metadata
    duration: float = Field(..., gt=0)
    width: int = Field(..., gt=0)
    height: int = Field(..., gt=0)
    bitrate: int = Field(..., gt=0)
    framerate: float = Field(..., gt=0, le=240)
    codec: str = Field(..., min_length=1)

    # Output settings
    o_codec: str = Field(..., min_length=1)
    o_width: int = Field(..., gt=0)
    o_height: int = Field(..., gt=0)
    o_bitrate: int = Field(..., gt=0)
    o_framerate: float = Field(..., gt=0, le=240)

    @field_validator("duration", "framerate", "o_framerate")
    @classmethod
    def validate_finite(cls, v: float) -> float:
        if not math.isfinite(v):
            raise ValueError(f"Value must be finite (got {v})")
        return v

    @field_validator("codec", "o_codec")
    @classmethod
    def normalize_codec(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Codec name must not be empty")
        return v.strip().lower()


class TranscodingConfigResponse(BaseModel):
    """Response schema for validated transcoding configuration."""

    success: bool
    config: Optional[Dict[str, Any]] = None
    message: str
    warnings: List[str] = Field(default_factory=list)
