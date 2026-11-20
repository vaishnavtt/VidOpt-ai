"""
Video service — extracts metadata from uploaded video files via FFprobe.
"""
import json
import logging
import os
import shutil
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

    _cached_ffprobe_path: Optional[str] = None

    # ------------------------------------------------------------------
    # Discovery API
    # ------------------------------------------------------------------

    @classmethod
    def find_ffprobe(cls) -> Optional[str]:
        """
        Locate ffprobe binary through:
        1. Explicit FFPROBE_PATH environment variable
        2. System PATH (shutil.which)
        3. Standard Windows installation paths
        """
        if cls._cached_ffprobe_path and Path(cls._cached_ffprobe_path).is_file():
            return cls._cached_ffprobe_path

        # 1. Environment variable override
        env_path = os.environ.get("FFPROBE_PATH")
        if env_path and Path(env_path).is_file():
            cls._cached_ffprobe_path = env_path
            return env_path

        # 2. System PATH
        which_path = shutil.which("ffprobe")
        if which_path and Path(which_path).is_file():
            cls._cached_ffprobe_path = which_path
            return which_path

        # 3. Known Windows locations
        user_home = Path.home()
        appdata_local = os.environ.get("LOCALAPPDATA") or str(user_home / "AppData" / "Local")
        program_files = os.environ.get("ProgramFiles", r"C:\Program Files")
        program_files_x86 = os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")

        candidate_dirs = [
            Path(appdata_local) / "ffmpeg" / "bin",
            Path(appdata_local) / "ffmpeg",
            Path(r"C:\ffmpeg\bin"),
            Path(program_files) / "ffmpeg" / "bin",
            Path(program_files_x86) / "ffmpeg" / "bin",
            Path(r"C:\ProgramData\chocolatey\bin"),
            user_home / "scoop" / "shims",
            Path(appdata_local) / "Microsoft" / "WinGet" / "Links",
        ]

        for c_dir in candidate_dirs:
            if not c_dir.exists():
                continue
            direct_exe = c_dir / "ffprobe.exe"
            if direct_exe.is_file():
                cls._cached_ffprobe_path = str(direct_exe)
                return cls._cached_ffprobe_path
            # Check recursive inside directory
            try:
                for sub_exe in c_dir.glob("**/ffprobe.exe"):
                    if sub_exe.is_file():
                        cls._cached_ffprobe_path = str(sub_exe)
                        return cls._cached_ffprobe_path
            except OSError:
                pass

        return None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @classmethod
    def is_ffprobe_available(cls) -> bool:
        """Return True if FFprobe is accessible."""
        bin_path = cls.find_ffprobe()
        if not bin_path:
            return False
        try:
            subprocess.run(
                [bin_path, "-version"],
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

    @classmethod
    def extract_metadata(cls, file_path: Path) -> Dict[str, Any]:
        """
        Run FFprobe on *file_path* and return a metadata dictionary.

        Raises:
            HTTPException(503) — FFprobe not installed.
            HTTPException(504) — FFprobe timed out.
            HTTPException(422) — FFprobe output could not be parsed.
        """
        bin_path = cls.find_ffprobe()
        if not bin_path:
            logger.warning("FFprobe binary could not be found.")
            raise HTTPException(
                status_code=503,
                detail=(
                    "FFprobe is not available on this server. "
                    "Video analysis requires FFprobe to be installed."
                ),
            )

        cmd = [
            bin_path,
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
            logger.warning("FFprobe binary %s not found.", bin_path)
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

        # Validate that a video stream exists
        streams = probe.get("streams", [])
        has_video_stream = any(s.get("codec_type") == "video" for s in streams)
        if not has_video_stream:
            logger.warning("No video stream found in %s", file_path)
            raise HTTPException(
                status_code=422,
                detail="No valid video stream found in the file — the file may be corrupted.",
            )

        return cls._extract_fields(probe, file_path)

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

        # Frames
        frames: Optional[int] = None
        raw_frames = video_stream.get("nb_frames")
        if raw_frames is not None and str(raw_frames).isdigit():
            frames = int(raw_frames)
        else:
            tags = video_stream.get("tags", {})
            tag_frames = tags.get("NUMBER_OF_FRAMES") or tags.get("NUMBER_OF_FRAMES-eng")
            if tag_frames is not None and str(tag_frames).isdigit():
                frames = int(tag_frames)
            elif duration is not None and framerate is not None and framerate > 0:
                frames = int(round(duration * framerate))

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

        codec = video_stream.get("codec_name")
        if codec:
            codec = str(codec).strip().lower()

        return {
            "duration":    duration,
            "width":       video_stream.get("width"),
            "height":      video_stream.get("height"),
            "codec":       codec,
            "bitrate":     bitrate,
            "framerate":   framerate,
            "frames":      frames,
            "size_bytes":  size,
            "format_name": fmt.get("format_name"),
        }
