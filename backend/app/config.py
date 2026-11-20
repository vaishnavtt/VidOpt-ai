"""
Configuration settings for VidOpt AI backend.
"""
from pathlib import Path

# Base paths derived relative to this file — works on any machine
_THIS_FILE = Path(__file__).resolve()
_BACKEND_DIR = _THIS_FILE.parent.parent       # backend/
_PROJECT_ROOT = _BACKEND_DIR.parent           # video_transcoding/

# Model paths
MODEL_PATH = _PROJECT_ROOT / "models" / "final_model.pkl"
METADATA_MODEL_PATH = _PROJECT_ROOT / "models" / "metadata_transcoding_model.pkl"

# Results / info paths
MODEL_INFO_PATH = _PROJECT_ROOT / "results" / "tuned_xgboost_metrics.csv"
TRAINING_RANGES_PATH = _PROJECT_ROOT / "results" / "metadata_training_ranges.csv"

# Upload limits
MAX_UPLOAD_SIZE = 500 * 1024 * 1024  # 500 MB

# Supported formats
SUPPORTED_INPUT_EXTENSIONS = [".mp4", ".mkv", ".avi", ".mov", ".webm", ".flv", ".ts", ".m4v"]
SUPPORTED_CODECS = [
    "h264", "h265", "hevc", "vp8", "vp9",
    "mpeg4", "mpeg2video", "theora", "av1", "flv1",
]

# API settings
API_VERSION = "v1"

# FFprobe timeout in seconds
FFPROBE_TIMEOUT = 30
