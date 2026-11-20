# VidOpt AI — Intelligent Video Transcoding Time Prediction

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19+-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0+-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.0+-EB5424?style=flat&logoColor=white)](https://xgboost.readthedocs.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

VidOpt AI is an end-to-end machine learning system and full-stack analytics platform designed to predict video transcoding duration (`utime`) prior to job execution. By accurately forecasting processing times from container metadata and output configurations, VidOpt AI enables intelligent compute scheduling, queue prioritization, spot instance cost optimization, and transparent user wait estimates.

---

## 📑 Table of Contents

- [Problem Statement](#problem-statement)
- [Main Capabilities](#main-capabilities)
- [System Architecture](#system-architecture)
- [Machine Learning Methodology](#machine-learning-methodology)
- [Empirical Model Evaluation](#empirical-model-evaluation)
- [Production Models](#production-models)
- [Technology Stack](#technology-stack)
- [Project Directory Structure](#project-directory-structure)
- [Installation & Quickstart Guide](#installation--quickstart-guide)
- [API Endpoints Reference](#api-endpoints-reference)
- [Testing & Verification](#testing--verification)
- [Hardware & Scientific Limitations](#hardware--scientific-limitations)
- [Dataset Attribution](#dataset-attribution)
- [Future Improvements](#future-improvements)
- [License](#license)

---

## Problem Statement

Video transcoding is a non-linear, compute-intensive transformation. Real-world processing time varies significantly based on duration, input resolution, framerate, video codecs, content complexity, and target encoding settings. 

In media processing infrastructure, transcoding without duration forecasts causes:
- **Inefficient Cluster Scheduling:** Schedulers cannot balance worker queues when job durations are unknown.
- **Worker Bottlenecks:** Heavy transcoding tasks block high-priority interactive workflows.
- **Cost Inefficiencies:** Cloud instances remain provisioned longer than necessary.
- **Poor User Experience:** Users receive indefinite progress bars without completion estimates.

VidOpt AI solves this by predicting transcoding time with gradient-boosted decision trees trained on empirical multi-codec transcoding measurements.

---

## Main Capabilities

1. **Instant Pre-Transcode Estimation:** The 11-feature metadata model computes duration predictions in ~12 ms with zero video decoding overhead.
2. **Deep Content-Aware Estimation:** The 18-feature full model incorporates frame distribution metrics ($i$, $p$, $b$ frames) for higher precision.
3. **Automated Video Metadata Extraction:** Integrated FFprobe pipeline inspects uploaded media files, validating container formats, frame counts, bitrates, and video streams.
4. **Interactive Dashboard:** Clean web interface with real-time health monitoring, metric comparisons, and configuration selectors.
5. **Prediction History:** Local browser caching allowing users to search, filter, and review past predictions.
6. **Model Insights:** Empirical analysis displaying feature importance, residual distributions, and performance breakdowns across resolutions.

---

## System Architecture

```text
┌────────────────────────────────────────────────────────┐
│             React 19 + TypeScript Frontend             │
│   Dashboard  •  Analyze Video  •  History  •  Insights │
└───────────────────────────┬────────────────────────────┘
                            │ REST API (JSON / FormData)
                            ▼
┌────────────────────────────────────────────────────────┐
│                  FastAPI Backend (v1)                  │
│   • Request Validation (Pydantic v2)                   │
│   • Multi-tier FFprobe Binary Discovery                │
│   • Payload Sanitization & File Size Limits (500 MB)   │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
              ▼                            ▼
┌───────────────────────────┐┌───────────────────────────┐
│     FFprobe Subprocess    ││     Model Service         │
│  Container Stream Parser  ││  Scikit-Learn / XGBoost   │
│  Codec & Framerate Parse  ││  Pipelines (.pkl)         │
└───────────────────────────┘└───────────────────────────┘
```

---

## Machine Learning Methodology

### Dataset & Preprocessing
The training pool comprises **68,784 transcoding runs** across **1,099 unique videos**.
- **Target Variable:** `utime` (CPU user time required for transcoding in seconds).
- **Leakage Prevention:** Cross-validation and evaluation use strict `GroupShuffleSplit` on the source video `id`. Different transcoded variations of the same original video are never split across train and test sets.
- **Excluded Features:** `id` (identifier), `umem` (memory consumption, unknown before runtime), and `b_size` (target-side leakage).
- **Encoding & Scaling:** Categorical variables (`codec`, `o_codec`) are one-hot encoded; numeric attributes are scaled via standard pipelines.

---

## Empirical Model Evaluation

All models were evaluated on the held-out test split of 18,345 records (220 unseen unique videos):

| Model Architecture | MAE (s) | RMSE (s) | $R^2$ Score | Latency (1k preds) | Model File Size |
|---|---:|---:|---:|---:|---:|
| Random Forest Baseline | 1.7438 | 4.5048 | 0.9177 | ~82.6 s | 863.6 MB |
| Tuned Random Forest | 1.6212 | 4.3490 | 0.9233 | ~107.0 s | 524.9 MB |
| XGBoost Baseline | 1.8307 | 4.0727 | 0.9327 | ~7.8 s | 2.5 MB |
| **Tuned XGBoost (Selected Final)** | **1.6048** | **3.9863** | **0.9356** | **~7.7 s** | **6.0 MB** |
| *Metadata-Only XGBoost* | *1.7978* | *4.4050* | *0.9213* | *~7.5 s* | *6.7 MB* |

### Metrics Interpretation:
- **MAE (Mean Absolute Error):** Average absolute deviation from actual transcoding time. The final model deviates by only ~1.60 seconds on average.
- **RMSE (Root Mean Squared Error):** Penalizes larger outlier errors. Tuned XGBoost achieves the lowest RMSE (3.9863 s).
- **$R^2$ Score:** Measures proportion of target variance explained by model features. Tuned XGBoost explains 93.56% of total transcoding variance.

---

## Production Models

1. **`models/final_model.pkl` (Tuned XGBoost — 18 features):**
   - Features: `duration`, `width`, `height`, `bitrate`, `framerate`, `i`, `p`, `b`, `frames`, `i_size`, `p_size`, `size`, `o_bitrate`, `o_framerate`, `o_width`, `o_height`, `codec`, `o_codec`.
   - Tuned parameters: `n_estimators=500`, `max_depth=8`, `learning_rate=0.03`, `subsample=0.9`, `colsample_bytree=0.8`, `reg_lambda=1.5`.

2. **`models/metadata_transcoding_model.pkl` (Metadata XGBoost — 11 features):**
   - Features: `duration`, `width`, `height`, `bitrate`, `framerate`, `o_bitrate`, `o_framerate`, `o_width`, `o_height`, `codec`, `o_codec`.
   - Designed for user upload scenarios where only container headers are parsed without frame extraction.

---

## Technology Stack

- **Machine Learning:** Python 3.11, XGBoost, Scikit-learn, Pandas, NumPy, Matplotlib, Seaborn, Joblib.
- **Backend API:** FastAPI, Uvicorn, Pydantic v2, Python-multipart, Httpx, Pytest.
- **Frontend Client:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Recharts, Axios, Vitest.
- **Media Processing:** FFmpeg and FFprobe (stream inspection and metadata parsing).
- **Storage & Versioning:** Git and Git LFS for large binary models and dataset assets.

---

## Project Directory Structure

```text
video_transcoding/
├── backend/
│   ├── app/
│   │   ├── api/routes.py             # REST API endpoints
│   │   ├── schemas/prediction.py     # Pydantic validation schemas
│   │   ├── services/
│   │   │   ├── model_service.py      # Model loader singleton
│   │   │   ├── prediction_service.py # Inference logic & formatting
│   │   │   └── video_service.py      # FFprobe discovery & extraction
│   │   ├── utils/validators.py       # Input validation helpers
│   │   ├── config.py                 # Paths, limits, and configurations
│   │   └── main.py                   # FastAPI application initialization
│   ├── tests/
│   │   ├── test_e2e_integration.py   # Live model tests
│   │   ├── test_health.py            # Health and metadata tests
│   │   ├── test_prediction.py        # Schema and validation tests
│   │   └── test_video_metadata.py    # FFprobe mock tests
│   ├── README.md
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/               # UI components, layout, cards
│   │   ├── pages/                    # Dashboard, Analyze, History, Insights, About
│   │   ├── services/api.ts           # Axios backend client
│   │   ├── types/index.ts            # TypeScript interfaces
│   │   ├── utils/history.ts          # LocalStorage management
│   │   └── tests/                    # Vitest unit test suite
│   ├── package.json
│   ├── README.md
│   └── vite.config.ts
├── dataset/
│   ├── transcoding_mesurment.tsv     # Primary dataset (68,784 records)
│   ├── youtube_videos.tsv            # Source pool metadata (Git LFS)
│   ├── README.md                     # Dataset documentation
│   └── README.txt
├── models/
│   ├── final_model.pkl               # Selected Tuned XGBoost (18 features)
│   ├── metadata_transcoding_model.pkl# Metadata XGBoost (11 features)
│   ├── tuned_xgboost_model.pkl
│   ├── tuned_random_forest_model.pkl # (Git LFS)
│   └── random_forest_model.pkl       # (Git LFS)
├── results/
│   ├── plots/                        # Generated evaluation charts
│   ├── model_comparison.csv          # Evaluation metrics table
│   └── error_analysis.csv
├── scripts/
│   ├── compare_models.py             # Model benchmark comparison script
│   ├── error_analysis.py             # Residual and error breakdown script
│   ├── metadata_model.py             # 11-feature model training script
│   ├── ml_utils.py                   # Shared ML inference utilities
│   ├── ml_verification.py            # 10-point ML test suite
│   ├── setup_ffmpeg.py               # Windows FFmpeg installation utility
│   ├── tune_xgboost.py               # XGBoost hyperparameter search
│   └── verify_video_pipeline.py      # Real video extraction verification
├── .gitattributes                    # Git LFS configuration
├── .gitignore
├── LICENSE                           # MIT License
└── README.md                         # Master documentation
```

---

## Installation & Quickstart Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm 9+
- *(Optional for video uploads)* FFmpeg and FFprobe

### 1. Windows FFmpeg Setup
FFmpeg enables automated metadata extraction from uploaded video files:
```powershell
# Using Windows Package Manager
winget install Gyan.FFmpeg

# Or run the included automated setup script
python scripts/setup_ffmpeg.py
```
Verify the installation:
```powershell
ffmpeg -version
ffprobe -version
```

### 2. Backend Setup
```powershell
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API runs at `http://127.0.0.1:8000`. Interactive documentation: `http://127.0.0.1:8000/docs`.

### 3. Frontend Setup
```powershell
# In a separate terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
Client runs at `http://localhost:3000`.

---

## API Endpoints Reference

Base URL: `http://127.0.0.1:8000/api/v1`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | API readiness, model availability, and FFprobe status |
| `GET` | `/model/info` | Feature requirements, parameter ranges, and limitations |
| `GET` | `/options` | Supported container extensions, codecs, and upload limits |
| `POST` | `/predict` | Predict transcoding duration from 11 metadata features |
| `POST` | `/predict/full` | Predict transcoding duration from 18 full features |
| `POST` | `/video/analyze` | Upload media file and extract container metadata via FFprobe |
| `POST` | `/transcoding/configure` | Validate input and output parameter compatibility |

### Example Prediction Request (`POST /api/v1/predict`)
```json
{
  "duration": 60.0,
  "width": 1920,
  "height": 1080,
  "bitrate": 4000000,
  "framerate": 30.0,
  "codec": "h264",
  "o_codec": "libx264",
  "o_width": 1280,
  "o_height": 720,
  "o_bitrate": 2000000,
  "o_framerate": 30.0
}
```

### Example Prediction Response
```json
{
  "success": true,
  "prediction": {
    "estimated_time_seconds": 13.17,
    "estimated_time_formatted": "13.17 seconds",
    "model_name": "metadata_transcoding_model",
    "prediction_type": "metadata_only"
  },
  "message": "Prediction successful.",
  "warnings": []
}
```

---

## Testing & Verification

The repository contains automated test suites for every layer:

1. **Machine Learning Verification (10 Tests):**
   ```powershell
   python scripts/ml_verification.py
   ```
   *Result:* 10 passed, 0 failed (verifies model loading, non-negative predictions, feature shapes, and disjoint train/test group splitting).

2. **Backend Test Suite (28 Tests):**
   ```powershell
   python -m pytest backend/tests -v
   ```
   *Result:* 28 passed, 0 failed (covers health endpoints, schema validation, live predictions, FFprobe error handling, and file size limits).

3. **Frontend Test Suite (8 Tests):**
   ```powershell
   cd frontend
   npm test -- --run
   ```
   *Result:* 8 passed, 0 failed (validates formatting helpers, history persistence, and metric card rendering).

4. **Frontend Production Build:**
   ```powershell
   cd frontend
   npm run build
   ```
   *Result:* Successful build with zero TypeScript compilation errors.

5. **Live Video Pipeline Verification:**
   ```powershell
   python scripts/verify_video_pipeline.py
   ```
   *Result:* Generates a sample MP4, analyzes metadata via FFprobe, verifies edge cases, and completes prediction.

---

## Hardware & Scientific Limitations

1. **Standardized Reference Environment:** The ground truth measurements in the dataset were recorded using single-threaded software transcoding with FFmpeg 4 on an **Intel Core i7-3720QM CPU**. Predicted durations reflect this reference processing speed.
2. **Hardware Acceleration:** Systems utilizing hardware ASIC encoders (NVIDIA NVENC, Intel QuickSync, Apple VideoToolbox) will transcode significantly faster than the reference CPU predictions.
3. **Scope:** VidOpt AI estimates execution duration prior to transcoding; it does not execute the transcoding process itself.

---

## Dataset Attribution

The model training data was obtained from the UCI Machine Learning Repository:
- **Dataset:** Video Transcoding Dataset
- **Authors:** D. Deneke et al.
- **Repository:** [UCI Machine Learning Repository](https://archive.ics.uci.edu/ml/datasets/video+transcoding+dataset)

---

## Future Improvements

- Hardware calibration coefficients allowing runtime scaling based on host CPU/GPU benchmarks.
- Multi-threaded encoding scaling prediction.
- Quantile regression for probabilistic upper and lower duration intervals.
- Docker containerization for one-command deployment across platforms.

---

## License

This project is open-source and available under the [MIT License](LICENSE).
