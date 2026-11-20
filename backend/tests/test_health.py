"""
Tests for the /health endpoint.
"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    from app.main import app
    with TestClient(app) as c:
        yield c


def test_health_endpoint_returns_200(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200


def test_health_response_has_required_fields(client):
    response = client.get("/api/v1/health")
    data = response.json()
    required = {
        "status",
        "api_version",
        "model_full_ready",
        "model_metadata_ready",
        "ffprobe_available",
        "model_name",
    }
    assert required.issubset(data.keys()), f"Missing fields: {required - data.keys()}"


def test_health_status_is_ok(client):
    response = client.get("/api/v1/health")
    assert response.json()["status"] == "ok"


def test_health_api_version(client):
    response = client.get("/api/v1/health")
    assert response.json()["api_version"] == "v1"
