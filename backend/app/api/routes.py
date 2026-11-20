"""
API routes for VidOpt AI — prefix /api/v1
"""
import logging
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse

from app.config import (
    API_VERSION,
    MAX_UPLOAD_SIZE,
    SUPPORTED_CODECS,
    SUPPORTED_INPUT_EXTENSIONS,
)
from app.schemas.prediction import (
    FullPredictionRequest,
    HealthResponse,
    MetadataPredictionRequest,
    ModelInfoResponse,
    OptionsResponse,
    PredictionResponse,
    TranscodingConfigRequest,
    TranscodingConfigResponse,
    VideoMetadataResponse,
)
from app.services.model_service import ModelService
from app.services.prediction_service import PredictionService
from app.services.video_service import VideoService

logger = logging.getLogger(__name__)

router = APIRouter(prefix=f"/api/{API_VERSION}")

# Service singletons (instantiated once at import time, models loaded lazily
# by ModelService.__init__).  Routes access them via module globals so they
# can be monkey-patched easily in tests.
_model_service: ModelService | None = None
_prediction_service = PredictionService()
_video_service = VideoService()


def get_model_service() -> ModelService:
    """FastAPI dependency that returns the shared ModelService instance."""
    global _model_service
    if _model_service is None:
        _model_service = ModelService()
    return _model_service


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------

@router.get("/health", response_model=HealthResponse, tags=["System"])
def health_check(ms: ModelService = Depends(get_model_service)) -> HealthResponse:
    """Return current API and model readiness status."""
    return HealthResponse(
        status="ok",
        api_version=API_VERSION,
        model_full_ready=ms.is_full_model_ready(),
        model_metadata_ready=ms.is_metadata_model_ready(),
        ffprobe_available=VideoService.is_ffprobe_available(),
        model_name="VidOpt AI XGBoost Ensemble",
    )


# ---------------------------------------------------------------------------
# GET /model/info
# ---------------------------------------------------------------------------

@router.get("/model/info", response_model=ModelInfoResponse, tags=["Model"])
def model_info(ms: ModelService = Depends(get_model_service)) -> ModelInfoResponse:
    """Return public model information (no file paths exposed)."""
    info = ms.get_model_info()
    return ModelInfoResponse(
        full_model_ready=info["full_model_ready"],
        metadata_model_ready=info["metadata_model_ready"],
        full_model_features=info["full_model_features"],
        metadata_model_features=info["metadata_model_features"],
        limitations=info["limitations"],
    )


# ---------------------------------------------------------------------------
# GET /options
# ---------------------------------------------------------------------------

@router.get("/options", response_model=OptionsResponse, tags=["System"])
def options() -> OptionsResponse:
    """Return supported codecs, file extensions, and upload limits."""
    return OptionsResponse(
        supported_codecs=SUPPORTED_CODECS,
        supported_input_extensions=SUPPORTED_INPUT_EXTENSIONS,
        max_upload_size_bytes=MAX_UPLOAD_SIZE,
        max_upload_size_mb=MAX_UPLOAD_SIZE / (1024 * 1024),
    )


# ---------------------------------------------------------------------------
# POST /predict  (metadata-only)
# ---------------------------------------------------------------------------

@router.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
def predict_metadata(
    request: MetadataPredictionRequest,
    ms: ModelService = Depends(get_model_service),
) -> PredictionResponse:
    """Predict transcoding time using metadata-only features."""
    if not ms.is_metadata_model_ready():
        raise HTTPException(
            status_code=503,
            detail="Metadata prediction model is not available. Please try again later.",
        )
    try:
        return _prediction_service.predict_metadata(request, ms)
    except Exception as exc:  # noqa: BLE001
        logger.error("Unexpected error in /predict: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred during prediction.")


# ---------------------------------------------------------------------------
# POST /predict/full  (all features)
# ---------------------------------------------------------------------------

@router.post("/predict/full", response_model=PredictionResponse, tags=["Prediction"])
def predict_full(
    request: FullPredictionRequest,
    ms: ModelService = Depends(get_model_service),
) -> PredictionResponse:
    """Predict transcoding time using all 18 features."""
    if not ms.is_full_model_ready():
        raise HTTPException(
            status_code=503,
            detail="Full-feature prediction model is not available. Please try again later.",
        )
    try:
        return _prediction_service.predict_full(request, ms)
    except Exception as exc:  # noqa: BLE001
        logger.error("Unexpected error in /predict/full: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="An internal error occurred during prediction.")


# ---------------------------------------------------------------------------
# POST /video/analyze
# ---------------------------------------------------------------------------

@router.post("/video/analyze", response_model=VideoMetadataResponse, tags=["Video"])
async def analyze_video(file: UploadFile = File(...)) -> VideoMetadataResponse:
    """
    Upload a video file and extract its metadata using FFprobe.

    FFprobe must be installed on the server for this endpoint to work.
    """
    # 1. Check FFprobe availability first
    if not VideoService.is_ffprobe_available():
        raise HTTPException(
            status_code=503,
            detail=(
                "FFprobe is not available on this server. "
                "Install FFmpeg/FFprobe to enable video analysis."
            ),
        )

    # 2. Validate file type
    filename = file.filename or "upload"
    if not VideoService.validate_file_type(filename):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type. Supported extensions: "
                f"{', '.join(SUPPORTED_INPUT_EXTENSIONS)}"
            ),
        )

    # 3. Save to a temp file, extract metadata, clean up
    suffix = Path(filename).suffix
    tmp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp_path = Path(tmp.name)
            content = await file.read()
            tmp.write(content)

        metadata = VideoService.extract_metadata(tmp_path)
    finally:
        if tmp_path and tmp_path.exists():
            try:
                tmp_path.unlink()
            except OSError:
                pass

    return VideoMetadataResponse(
        success=True,
        filename=filename,
        message="Metadata extracted successfully.",
        **{k: v for k, v in metadata.items()},
    )


# ---------------------------------------------------------------------------
# POST /transcoding/configure
# ---------------------------------------------------------------------------

@router.post("/transcoding/configure", response_model=TranscodingConfigResponse, tags=["Prediction"])
def configure_transcoding(request: TranscodingConfigRequest) -> TranscodingConfigResponse:
    """
    Validate a transcoding configuration (source + output settings).

    Does NOT actually transcode — returns validated config ready for prediction.
    """
    warnings = []
    if request.o_width > request.width or request.o_height > request.height:
        warnings.append(
            "Output resolution is larger than source resolution — upscaling detected."
        )
    if request.o_framerate > request.framerate:
        warnings.append(
            "Output framerate is higher than source framerate — frame duplication may occur."
        )

    config = {
        "source": {
            "duration":  request.duration,
            "width":     request.width,
            "height":    request.height,
            "bitrate":   request.bitrate,
            "framerate": request.framerate,
            "codec":     request.codec,
        },
        "output": {
            "codec":      request.o_codec,
            "width":      request.o_width,
            "height":     request.o_height,
            "bitrate":    request.o_bitrate,
            "framerate":  request.o_framerate,
        },
    }

    return TranscodingConfigResponse(
        success=True,
        config=config,
        message="Configuration is valid and ready for prediction.",
        warnings=warnings,
    )
