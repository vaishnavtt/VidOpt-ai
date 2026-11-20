"""
test_e2e_integration.py - Live End-to-End Integration Test for VidOpt AI
Tests live model loading, real predictions, config validation, and health checks.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.model_service import ModelService
from app.api.routes import get_model_service

client = TestClient(app)

def test_e2e_health_check_live_models():
    """Verify health endpoint shows live models loaded and ready."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model_full_ready"] is True, "Full model failed to load"
    assert data["model_metadata_ready"] is True, "Metadata model failed to load"
    assert "VidOpt AI" in data["model_name"]

def test_e2e_model_info():
    """Verify model/info endpoint returns structured metadata without exposing paths."""
    response = client.get("/api/v1/model/info")
    assert response.status_code == 200
    data = response.json()
    assert data["full_model_ready"] is True
    assert data["metadata_model_ready"] is True
    assert data["full_model_features"]["total"] == 18
    assert data["metadata_model_features"]["total"] == 11
    assert len(data["limitations"]) > 0

def test_e2e_options():
    """Verify options endpoint returns valid codec and format choices."""
    response = client.get("/api/v1/options")
    assert response.status_code == 200
    data = response.json()
    assert "h264" in data["supported_codecs"]
    assert ".mp4" in data["supported_input_extensions"]
    assert data["max_upload_size_bytes"] > 0

def test_e2e_predict_metadata_live():
    """Verify real metadata prediction returns positive, finite transcoding time."""
    payload = {
        "duration": 120.0,
        "width": 1920,
        "height": 1080,
        "bitrate": 5000000,
        "framerate": 29.97,
        "codec": "h264",
        "o_codec": "h264",
        "o_width": 1280,
        "o_height": 720,
        "o_bitrate": 2500000,
        "o_framerate": 29.97
    }
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    pred = data["prediction"]
    assert pred["prediction_type"] == "metadata_only"
    assert pred["estimated_time_seconds"] > 0
    assert "seconds" in pred["estimated_time_formatted"]
    print(f"\n[LIVE TEST] Metadata Prediction for 1080p->720p 120s video: {pred['estimated_time_seconds']}s")

def test_e2e_predict_full_features_live():
    """Verify real full-feature prediction returns positive, finite transcoding time."""
    payload = {
        "duration": 120.0,
        "width": 1920,
        "height": 1080,
        "bitrate": 5000000,
        "framerate": 29.97,
        "codec": "h264",
        "o_codec": "h264",
        "o_width": 1280,
        "o_height": 720,
        "o_bitrate": 2500000,
        "o_framerate": 29.97,
        "i": 120,
        "p": 1200,
        "b": 2280,
        "frames": 3600,
        "i_size": 2500000.0,
        "p_size": 15000000.0,
        "size": 75000000.0
    }
    response = client.post("/api/v1/predict/full", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    pred = data["prediction"]
    assert pred["prediction_type"] == "full_features"
    assert pred["estimated_time_seconds"] > 0
    print(f"\n[LIVE TEST] Full Prediction for 1080p->720p 120s video: {pred['estimated_time_seconds']}s")

def test_e2e_transcoding_configure():
    """Verify transcoding configure endpoint validates and returns structured config."""
    payload = {
        "duration": 60.0,
        "width": 1920,
        "height": 1080,
        "bitrate": 4000000,
        "framerate": 30.0,
        "codec": "h264",
        "o_codec": "vp8",
        "o_width": 1280,
        "o_height": 720,
        "o_bitrate": 2000000,
        "o_framerate": 30.0
    }
    response = client.post("/api/v1/transcoding/configure", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "source" in data["config"]
    assert "output" in data["config"]
    assert data["config"]["output"]["codec"] == "vp8"

def test_e2e_reject_invalid_numerical_input():
    """Verify that negative duration or non-finite inputs are rejected with 422."""
    payload = {
        "duration": -50.0,
        "width": 1920,
        "height": 1080,
        "bitrate": 5000000,
        "framerate": 30.0,
        "codec": "h264",
        "o_codec": "h264",
        "o_width": 1280,
        "o_height": 720,
        "o_bitrate": 2500000,
        "o_framerate": 30.0
    }
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 422
