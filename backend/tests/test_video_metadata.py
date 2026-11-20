"""
Tests for the /video/analyze endpoint.
"""
import io
import json
import subprocess
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


FAKE_FFPROBE_OUTPUT = {
    "streams": [
        {
            "codec_type": "video",
            "codec_name": "h264",
            "width": 1920,
            "height": 1080,
            "r_frame_rate": "30/1",
            "bit_rate": "4000000",
        }
    ],
    "format": {
        "duration": "120.0",
        "bit_rate": "4000000",
        "size": "60000000",
        "format_name": "matroska,webm",
    },
}


@pytest.fixture(scope="module")
def client():
    from app.main import app
    with TestClient(app) as c:
        yield c


def _make_file(name="test_video.mp4", content=b"fake video bytes"):
    return ("file", (name, io.BytesIO(content), "video/mp4"))


# ---------------------------------------------------------------------------
# File type validation (no FFprobe needed)
# ---------------------------------------------------------------------------

def test_unsupported_file_type_returns_400(client):
    # We need FFprobe check to pass first. Patch is_ffprobe_available to True.
    with patch("app.services.video_service.VideoService.is_ffprobe_available", return_value=True):
        files = {"file": ("malware.exe", io.BytesIO(b"bad"), "application/octet-stream")}
        r = client.post("/api/v1/video/analyze", files=files)
    assert r.status_code == 400


def test_txt_file_returns_400(client):
    with patch("app.services.video_service.VideoService.is_ffprobe_available", return_value=True):
        files = {"file": ("document.txt", io.BytesIO(b"text"), "text/plain")}
        r = client.post("/api/v1/video/analyze", files=files)
    assert r.status_code == 400


# ---------------------------------------------------------------------------
# FFprobe not available
# ---------------------------------------------------------------------------

def test_ffprobe_not_available_returns_503_or_handled(client):
    with patch("app.services.video_service.VideoService.is_ffprobe_available", return_value=False):
        files = {"file": ("video.mp4", io.BytesIO(b"fake"), "video/mp4")}
        r = client.post("/api/v1/video/analyze", files=files)
    assert r.status_code == 503


# ---------------------------------------------------------------------------
# Valid extraction (mocked ffprobe subprocess)
# ---------------------------------------------------------------------------

def test_valid_video_extraction(client):
    mock_result = MagicMock()
    mock_result.stdout = json.dumps(FAKE_FFPROBE_OUTPUT).encode()
    mock_result.returncode = 0

    with (
        patch("app.services.video_service.VideoService.is_ffprobe_available", return_value=True),
        patch("subprocess.run", return_value=mock_result),
    ):
        files = {"file": ("clip.mp4", io.BytesIO(b"fake video"), "video/mp4")}
        r = client.post("/api/v1/video/analyze", files=files)

    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["codec"] == "h264"
    assert data["width"] == 1920
    assert data["height"] == 1080
    assert data["framerate"] == pytest.approx(30.0)


# ---------------------------------------------------------------------------
# Corrupted / empty JSON from ffprobe
# ---------------------------------------------------------------------------

def test_corrupted_file_handled(client):
    """FFprobe returns invalid JSON — should raise 422."""
    mock_result = MagicMock()
    mock_result.stdout = b"NOT VALID JSON {"
    mock_result.returncode = 1

    with (
        patch("app.services.video_service.VideoService.is_ffprobe_available", return_value=True),
        patch("subprocess.run", return_value=mock_result),
    ):
        files = {"file": ("bad.mp4", io.BytesIO(b"garbage"), "video/mp4")}
        r = client.post("/api/v1/video/analyze", files=files)

    assert r.status_code == 422


# ---------------------------------------------------------------------------
# FFprobe raises FileNotFoundError (subprocess level)
# ---------------------------------------------------------------------------

def test_ffprobe_subprocess_not_found(client):
    with (
        patch("app.services.video_service.VideoService.is_ffprobe_available", return_value=True),
        patch("subprocess.run", side_effect=FileNotFoundError("ffprobe not found")),
    ):
        files = {"file": ("clip.mkv", io.BytesIO(b"data"), "video/x-matroska")}
        r = client.post("/api/v1/video/analyze", files=files)
    assert r.status_code == 503


# ---------------------------------------------------------------------------
# FFprobe timeout
# ---------------------------------------------------------------------------

def test_ffprobe_timeout_returns_504(client):
    with (
        patch("app.services.video_service.VideoService.is_ffprobe_available", return_value=True),
        patch("subprocess.run", side_effect=subprocess.TimeoutExpired(cmd="ffprobe", timeout=30)),
    ):
        files = {"file": ("slow.mp4", io.BytesIO(b"data"), "video/mp4")}
        r = client.post("/api/v1/video/analyze", files=files)
    assert r.status_code == 504
