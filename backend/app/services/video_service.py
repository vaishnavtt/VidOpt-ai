"""
Video service — extracts metadata from uploaded video files via FFprobe.
"""
import json
import logging
import subprocess
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import HTTPException

from app.config import FFPROBE_TIMEOUT, SUPPORTED_INPUT_EXTENSIONS

logger = logging.getLogger(__name__)


def _parse_framerate(rate_str: str) -> Optional[float]:
    """
    Parse a fraction string like '30000/1001' into a decimal float.
    Returns None on failure.
    """
    try:
        if "/" in rate_str:
            num, den = rate_str.split("/")
            den = int(den)
            if den == 0:
                return None
            return int(num) / den
        return float(rate_str)
    except (ValueError, ZeroDivisionError):
        return None


class VideoService:
    """Handles video file inspection using FFprobe."""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @staticmethod
    def is_ffprobe_available() -> bool:
        """Return True if FFprobe is accessible on the system PATH."""
        try:
            subprocess.run(
                ["ffprobe", "-version"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=5,
                check=False,
            )
            return True
        except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
            return False

    @staticmethod
    def validate_file_type(filename: str) -> bool:
        """Return True if the file extension is in the supported list."""
        ext = Path(filename).suffix.lower()
        return ext in SUPPORTED_INPUT_EXTENSIONS

    @staticmethod
    def extract_metadata(file_path: Path) -> Dict[str, Any]:
        """
        Run FFprobe on *file_path* and return a metadata dictionary.

        Raises:
            HTTPException(503) — FFprobe not installed.
            HTTPException(504) — FFprobe timed out.
            HTTPException(422) — FFprobe output could not be parsed.
        """
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_streams",
            "-show_format",
            str(file_path),
        ]
        try:
            result = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=FFPROBE_TIMEOUT,
                check=False,
            )
        except FileNotFoundError:
            logger.warning("FFprobe is not installed or not found in PATH.")
            raise HTTPException(
                status_code=503,
                detail=(
                    "FFprobe is not available on this server. "
                    "Video analysis requires FFprobe to be installed."
                ),
            )
        except subprocess.TimeoutExpired:
            logger.warning("FFprobe timed out after %s seconds.", FFPROBE_TIMEOUT)
            raise HTTPException(
                status_code=504,
                detail="FFprobe timed out while analysing the video file.",
            )

        # Parse JSON output
        try:
            probe = json.loads(result.stdout)
        except json.JSONDecodeError as exc:
            logger.error("Failed to parse FFprobe JSON output: %s", exc)
            raise HTTPException(
                status_code=422,
                detail="Could not parse FFprobe output — the file may be corrupted.",
            )

        return VideoService._extract_fields(probe, file_path)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_fields(probe: Dict[str, Any], file_path: Path) -> Dict[str, Any]:
        """Pull the relevant fields from the FFprobe JSON structure."""
        streams = probe.get("streams", [])
        fmt = probe.get("format", {})

        # Find the first video stream
        video_stream: Dict[str, Any] = {}
        for stream in streams:
            if stream.get("codec_type") == "video":
                video_stream = stream
                break

        # Duration — prefer format-level, fall back to stream-level
        duration: Optional[float] = None
        for src in (fmt, video_stream):
            raw_dur = src.get("duration")
            if raw_dur is not None:
                try:
                    duration = float(raw_dur)
                    break
                except (ValueError, TypeError):
                    pass

        # Bitrate
        bitrate: Optional[int] = None
        for src in (fmt, video_stream):
            raw_br = src.get("bit_rate")
            if raw_br is not None:
                try:
                    bitrate = int(raw_br)
                    break
                except (ValueError, TypeError):
                    pass

        # Framerate
        framerate: Optional[float] = None
        raw_fr = video_stream.get("r_frame_rate") or video_stream.get("avg_frame_rate")
        if raw_fr:
            framerate = _parse_framerate(raw_fr)

        # File size
        size: Optional[int] = None
        raw_size = fmt.get("size")
        if raw_size is not None:
            try:
                size = int(raw_size)
            except (ValueError, TypeError):
                pass
        if size is None:
            try:
                size = file_path.stat().st_size
            except OSError:
                pass

        return {
            "duration":    duration,
            "width":       video_stream.get("width"),
            "height":      video_stream.get("height"),
            "codec":       video_stream.get("codec_name"),
            "bitrate":     bitrate,
            "framerate":   framerate,
            "size_bytes":  size,
            "format_name": fmt.get("format_name"),
        }
