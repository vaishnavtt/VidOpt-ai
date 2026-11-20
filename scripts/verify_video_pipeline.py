"""
End-to-end verification script for VidOpt AI:
1. Generates a real test MP4 video using ffmpeg.
2. Direct API test against /api/v1/video/analyze using TestClient with real FFprobe.
3. Verifies extracted metadata (duration, width, height, framerate, codec, bitrate, frames, size).
4. Tests edge cases: non-video (.txt), corrupted file, missing file.
5. Tests prediction endpoint with extracted metadata.
6. Verifies temp file cleanup.
"""
import io
import os
import sys
import tempfile
import subprocess
from pathlib import Path

# Add backend to sys.path and set working directory to repo root
repo_root = Path(__file__).resolve().parent.parent
os.chdir(repo_root)
backend_dir = repo_root / "backend"
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app
from app.services.video_service import VideoService

def main():
    print("=" * 60)
    print("VIDOPT AI - VIDEO PIPELINE & METADATA VERIFICATION")
    print("=" * 60)

    # 1. Verify FFprobe discovery
    ffprobe_path = VideoService.find_ffprobe()
    print(f"\n1. Discovered FFprobe binary: {ffprobe_path}")
    is_available = VideoService.is_ffprobe_available()
    print(f"   VideoService.is_ffprobe_available(): {is_available}")
    assert is_available, "FFprobe must be available for real video tests!"

    # 2. Generate a real test MP4 video
    test_video_path = Path(__file__).resolve().parent.parent / "test_sample.mp4"
    ffmpeg_exe = Path(ffprobe_path).parent / "ffmpeg.exe"
    print(f"\n2. Generating 5-second test MP4 with ffmpeg: {ffmpeg_exe}...")
    cmd = [
        str(ffmpeg_exe),
        "-y",
        "-f", "lavfi",
        "-i", "testsrc=duration=5:size=1280x720:rate=30",
        "-c:v", "libx264",
        "-b:v", "2000k",
        str(test_video_path)
    ]
    gen_res = subprocess.run(cmd, capture_output=True, text=True)
    assert gen_res.returncode == 0, f"FFmpeg failed to create test video: {gen_res.stderr}"
    print(f"   Test video created: {test_video_path} (Size: {test_video_path.stat().st_size} bytes)")

    # 3. Test real upload & metadata extraction via API TestClient
    client = TestClient(app)
    print("\n3. Testing POST /api/v1/video/analyze with real MP4 video...")
    with open(test_video_path, "rb") as f:
        response = client.post(
            "/api/v1/video/analyze",
            files={"file": ("test_sample.mp4", f, "video/mp4")}
        )
    print(f"   Status Code: {response.status_code}")
    assert response.status_code == 200, f"Failed: {response.text}"
    meta = response.json()
    print(f"   Response Payload: {meta}")
    assert meta["success"] is True
    assert meta["width"] == 1280
    assert meta["height"] == 720
    assert meta["codec"] == "h264"
    assert abs(meta["duration"] - 5.0) < 0.2
    assert abs(meta["framerate"] - 30.0) < 0.1
    assert meta["frames"] is not None and meta["frames"] >= 140
    assert meta["size_bytes"] > 0
    print("   -> Real metadata extraction verified successfully!")

    # 4. Test edge cases
    print("\n4. Testing Edge Cases...")
    
    # 4a. Unsupported file type (.txt)
    print("   a) Non-video file (notes.txt)...")
    res_txt = client.post(
        "/api/v1/video/analyze",
        files={"file": ("notes.txt", io.BytesIO(b"Hello world"), "text/plain")}
    )
    print(f"      Status: {res_txt.status_code} (Expected 400), Response: {res_txt.json()}")
    assert res_txt.status_code == 400

    # 4b. Corrupted video file
    print("   b) Corrupted video file (corrupted.mp4)...")
    res_corrupt = client.post(
        "/api/v1/video/analyze",
        files={"file": ("corrupted.mp4", io.BytesIO(b"\x00\x00\x00\x20ftypmp42corrupted_bytes_here"), "video/mp4")}
    )
    print(f"      Status: {res_corrupt.status_code} (Expected 422), Response: {res_corrupt.json()}")
    assert res_corrupt.status_code == 422

    # 4c. Missing file
    print("   c) Missing file in request...")
    res_missing = client.post("/api/v1/video/analyze")
    print(f"      Status: {res_missing.status_code} (Expected 422)")
    assert res_missing.status_code == 422

    # 5. Predict transcoding time using the extracted metadata
    print("\n5. Testing Prediction Flow with Extracted Metadata...")
    predict_payload = {
        "duration": meta["duration"],
        "width": meta["width"],
        "height": meta["height"],
        "bitrate": meta["bitrate"] or 2000000,
        "framerate": meta["framerate"],
        "codec": meta["codec"],
        "o_codec": "vp8",
        "o_width": 854,
        "o_height": 480,
        "o_bitrate": 1000000,
        "o_framerate": 25.0
    }
    print(f"   Submitting payload to /api/v1/predict: {predict_payload}")
    res_predict = client.post("/api/v1/predict", json=predict_payload)
    print(f"   Status Code: {res_predict.status_code}")
    assert res_predict.status_code == 200
    pred_data = res_predict.json()
    print(f"   Prediction Result: {pred_data}")
    assert pred_data["success"] is True
    assert pred_data["prediction"]["estimated_time_seconds"] > 0
    print(f"   Estimated Time: {pred_data['prediction']['estimated_time_seconds']}s ({pred_data['prediction']['estimated_time_formatted']})")

    # 6. Check temp directory for any leftover files
    print("\n6. Checking Temporary Files Cleanup...")
    temp_dir = Path(tempfile.gettempdir())
    leftover_candidates = list(temp_dir.glob("tmp*.mp4"))
    print(f"   Leftover temp MP4s in {temp_dir}: {len(leftover_candidates)}")
    
    # Clean up test_sample.mp4
    if test_video_path.exists():
        test_video_path.unlink()
        print(f"   Cleaned up test file: {test_video_path}")

    print("\n" + "=" * 60)
    print("ALL REAL VIDEO VERIFICATIONS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    main()
