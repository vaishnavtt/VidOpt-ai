"""
VidOpt AI — FastAPI application entry point.
"""
import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router, get_model_service
from app.config import API_VERSION

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan — model loading on startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Load models when the server starts; log status."""
    logger.info("VidOpt AI starting — loading ML models …")
    ms = get_model_service()
    logger.info(
        "Model status: full_model=%s, metadata_model=%s",
        "ready" if ms.is_full_model_ready() else "NOT AVAILABLE",
        "ready" if ms.is_metadata_model_ready() else "NOT AVAILABLE",
    )
    if not ms.is_full_model_ready() or not ms.is_metadata_model_ready():
        logger.warning(
            "One or more models are missing. Prediction endpoints will return 503 "
            "until models are placed in the models/ directory."
        )
    yield
    logger.info("VidOpt AI shutting down.")


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="VidOpt AI",
    description=(
        "AI-powered video transcoding time prediction API. "
        "Provide video metadata and output settings to get an estimated "
        "transcoding duration from our XGBoost regression model."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ---------------------------------------------------------------------------
# CORS — allow all origins in development
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request-logging middleware
# ---------------------------------------------------------------------------

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s → %s (%.1f ms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


# ---------------------------------------------------------------------------
# Global exception handlers
# ---------------------------------------------------------------------------

def _sanitize_for_json(obj):
    """Recursively replace non-JSON-compliant floats (NaN/Inf) with None."""
    import math
    if isinstance(obj, float):
        return None if not math.isfinite(obj) else obj
    if isinstance(obj, dict):
        return {k: _sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_for_json(i) for i in obj]
    return obj


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return a 422 with structured validation details."""
    safe_errors = _sanitize_for_json(exc.errors())
    return JSONResponse(
        status_code=422,
        content={
            "detail": safe_errors,
            "message": "Request validation failed. Check the 'detail' field for specifics.",
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Return a safe 500 without leaking stack traces to the client."""
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected internal error occurred. Please try again later."},
    )


# ---------------------------------------------------------------------------
# Include routers
# ---------------------------------------------------------------------------

app.include_router(router)


# ---------------------------------------------------------------------------
# Root redirect
# ---------------------------------------------------------------------------

@app.get("/", include_in_schema=False)
async def root():
    return JSONResponse(
        content={
            "name": "VidOpt AI",
            "version": "1.0.0",
            "docs": "/docs",
            "health": f"/api/{API_VERSION}/health",
        }
    )
