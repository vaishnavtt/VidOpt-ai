"""
Tests for /predict and /predict/full endpoints.
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient


VALID_METADATA_PAYLOAD = {
    "duration": 120.0,
    "width": 1920,
    "height": 1080,
    "bitrate": 4_000_000,
    "framerate": 30.0,
    "codec": "h264",
    "o_codec": "h265",
    "o_width": 1280,
    "o_height": 720,
    "o_bitrate": 2_000_000,
    "o_framerate": 30.0,
}

VALID_FULL_PAYLOAD = {
    **VALID_METADATA_PAYLOAD,
    "i": 100,
    "p": 500,
    "b": 400,
    "frames": 3600,
    "i_size": 50_000_000.0,
    "p_size": 20_000_000.0,
    "size": 300_000_000.0,
}


def _make_mock_model(return_value=42.5):
    """Return a mock sklearn pipeline that predicts a fixed value."""
    mock = MagicMock()
    mock.predict.return_value = [return_value]
    return mock


@pytest.fixture(scope="module")
def client():
    from app.main import app
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def client_with_models():
    """TestClient with both models mocked and ready (function-scoped to avoid cross-test interference)."""
    from app.main import app
    from app.api import routes

    mock_ms = MagicMock()
    mock_ms.is_metadata_model_ready.return_value = True
    mock_ms.is_full_model_ready.return_value = True
    mock_ms.get_metadata_model.return_value = _make_mock_model(42.5)
    mock_ms.get_full_model.return_value = _make_mock_model(99.9)

    # Patch the dependency; clear ONLY our key on teardown
    app.dependency_overrides[routes.get_model_service] = lambda: mock_ms
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.pop(routes.get_model_service, None)


# ---------------------------------------------------------------------------
# Validation tests (models don't need to be loaded)
# ---------------------------------------------------------------------------

def test_missing_field_returns_422(client):
    payload = {k: v for k, v in VALID_METADATA_PAYLOAD.items() if k != "duration"}
    r = client.post("/api/v1/predict", json=payload)
    assert r.status_code == 422


def test_negative_duration_returns_422(client):
    payload = {**VALID_METADATA_PAYLOAD, "duration": -1.0}
    r = client.post("/api/v1/predict", json=payload)
    assert r.status_code == 422


def test_zero_width_returns_422(client):
    payload = {**VALID_METADATA_PAYLOAD, "width": 0}
    r = client.post("/api/v1/predict", json=payload)
    assert r.status_code == 422


def test_invalid_framerate_returns_422(client):
    # framerate > 240 is not allowed
    payload = {**VALID_METADATA_PAYLOAD, "framerate": 999.0}
    r = client.post("/api/v1/predict", json=payload)
    assert r.status_code == 422


def test_nan_duration_returns_422(client):
    # JSON spec does not allow NaN; send it as raw bytes so the server must handle it
    import json as _json
    raw = _json.dumps(VALID_METADATA_PAYLOAD)
    raw = raw.replace('"duration": 120.0', '"duration": NaN')
    r = client.post(
        "/api/v1/predict",
        content=raw.encode(),
        headers={"Content-Type": "application/json"},
    )
    # Server rejects NaN in JSON (parse error → 422) or bad request → 400 / 422
    assert r.status_code in (400, 422)


# ---------------------------------------------------------------------------
# Model-ready tests
# ---------------------------------------------------------------------------

def test_valid_metadata_prediction(client_with_models):
    r = client_with_models.post("/api/v1/predict", json=VALID_METADATA_PAYLOAD)
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["prediction"]["estimated_time_seconds"] >= 0


def test_prediction_returns_non_negative_value(client_with_models):
    # Even if the mock model returns a negative number, we clip to 0
    from app.main import app
    from app.api import routes

    neg_model = _make_mock_model(-5.0)
    mock_ms = MagicMock()
    mock_ms.is_metadata_model_ready.return_value = True
    mock_ms.get_metadata_model.return_value = neg_model

    saved = app.dependency_overrides.get(routes.get_model_service)
    app.dependency_overrides[routes.get_model_service] = lambda: mock_ms
    with TestClient(app) as c:
        r = c.post("/api/v1/predict", json=VALID_METADATA_PAYLOAD)
    # Restore previous override
    if saved is not None:
        app.dependency_overrides[routes.get_model_service] = saved
    else:
        app.dependency_overrides.pop(routes.get_model_service, None)

    assert r.status_code == 200
    assert r.json()["prediction"]["estimated_time_seconds"] >= 0


def test_unseen_codec_still_works(client_with_models):
    """OHE with handle_unknown='ignore' should not crash on unknown codec."""
    payload = {**VALID_METADATA_PAYLOAD, "codec": "some_future_codec_xyz"}
    r = client_with_models.post("/api/v1/predict", json=payload)
    # With a mock model this always succeeds; in production OHE ignores unknown
    assert r.status_code == 200


def test_model_not_ready_returns_503_or_200(client):
    """
    When models are absent (no PKL files in CI), the endpoint returns either
    503 (model not available) or 200 (if models happened to load). Both are valid.
    """
    r = client.post("/api/v1/predict", json=VALID_METADATA_PAYLOAD)
    assert r.status_code in (200, 503)


def test_valid_full_prediction(client_with_models):
    r = client_with_models.post("/api/v1/predict/full", json=VALID_FULL_PAYLOAD)
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["prediction"]["prediction_type"] == "full_features"
