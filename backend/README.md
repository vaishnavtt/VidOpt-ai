# VidOpt AI — Backend

AI-powered video transcoding time estimation API built with FastAPI and XGBoost.

---

## Requirements

- **Python 3.11+**
- **FFmpeg / FFprobe** — only required for the `/video/analyze` upload endpoint.  
  Prediction endpoints (`/predict`, `/predict/full`) work without FFprobe.

---

## Installation

```powershell
# Clone / enter the project
cd C:\Users\<you>\video_transcoding

# Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1

# Install backend dependencies
cd backend
pip install -r requirements.txt
```

---

## Installing FFmpeg / FFprobe (Windows — optional)

FFprobe is part of the FFmpeg distribution.

| Method | Command |
|--------|---------|
| **winget** (recommended) | `winget install Gyan.FFmpeg` |
| **Chocolatey** | `choco install ffmpeg` |
| **Manual** | Download from [https://www.gyan.dev/ffmpeg/builds/](https://www.gyan.dev/ffmpeg/builds/), extract, and add the `bin/` folder to your `PATH`. |

Verify installation:
```powershell
ffprobe -version
```

---

## Starting the Server

```powershell
cd backend
uvicorn app.main:app --reload
```

The server will be available at **http://127.0.0.1:8000**.  
Interactive API docs: **http://127.0.0.1:8000/docs**

To run on a different port:
```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/health` | API and model readiness status |
| `GET` | `/api/v1/model/info` | Model feature lists and limitations |
| `GET` | `/api/v1/options` | Supported codecs, extensions, upload limits |
| `POST` | `/api/v1/predict` | Predict transcoding time (metadata features) |
| `POST` | `/api/v1/predict/full` | Predict transcoding time (all 18 features) |
| `POST` | `/api/v1/video/analyze` | Upload video → extract metadata via FFprobe |
| `POST` | `/api/v1/transcoding/configure` | Validate a transcoding configuration |

### Quick example — metadata prediction

```bash
curl -X POST http://127.0.0.1:8000/api/v1/predict \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 120.0,
    "width": 1920, "height": 1080,
    "bitrate": 4000000, "framerate": 30.0,
    "codec": "h264",
    "o_codec": "h265",
    "o_width": 1280, "o_height": 720,
    "o_bitrate": 2000000, "o_framerate": 30.0
  }'
```

---

## Running Tests

```powershell
cd backend
pytest tests/ -v
```

> **Note:** Tests do **not** require FFprobe or actual video files.  
> All subprocess calls are mocked. Model files are optional — endpoints return
> `503` gracefully when models are absent.

---

## Project Structure

```
backend/
├── app/
│   ├── main.py           # FastAPI app, lifespan, middleware
│   ├── config.py         # Paths and constants
│   ├── api/
│   │   └── routes.py     # All API routes
│   ├── schemas/
│   │   └── prediction.py # Pydantic request/response models
│   ├── services/
│   │   ├── model_service.py      # Model loading and access
│   │   ├── prediction_service.py # Prediction logic
│   │   └── video_service.py      # FFprobe integration
│   └── utils/
│       └── validators.py # Shared validation helpers
└── tests/
    ├── test_health.py
    ├── test_prediction.py
    └── test_video_metadata.py
```
