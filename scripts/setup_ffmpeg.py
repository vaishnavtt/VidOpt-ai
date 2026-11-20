"""
Setup FFmpeg and FFprobe on Windows:
Downloads static build, extracts ffmpeg.exe and ffprobe.exe to AppData/Local/ffmpeg/bin,
adds to Windows User PATH, and verifies execution.
"""
import os
import sys
import shutil
import zipfile
import subprocess
import urllib.request
from pathlib import Path
import winreg

def main():
    target_dir = Path.home() / "AppData" / "Local" / "ffmpeg"
    target_bin = target_dir / "bin"
    target_bin.mkdir(parents=True, exist_ok=True)
    
    zip_path = Path.home() / "AppData" / "Local" / "Temp" / "ffmpeg_latest.zip"
    url = "https://github.com/FFmpeg-Builds/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
    
    ffmpeg_exe = target_bin / "ffmpeg.exe"
    ffprobe_exe = target_bin / "ffprobe.exe"
    
    if not (ffmpeg_exe.exists() and ffprobe_exe.exists()):
        print(f"Downloading FFmpeg from {url}...")
        # Use curl for reliable downloading with progress
        res = subprocess.run(["curl.exe", "-L", "-o", str(zip_path), url], check=False)
        if res.returncode != 0:
            print("curl failed, trying urllib...")
            urllib.request.urlretrieve(url, str(zip_path))
            
        print(f"Extracting binaries from {zip_path}...")
        with zipfile.ZipFile(zip_path, "r") as z:
            for member in z.namelist():
                if member.endswith("ffmpeg.exe") or member.endswith("ffprobe.exe"):
                    filename = Path(member).name
                    dest = target_bin / filename
                    print(f"Extracting {filename} to {dest}...")
                    with z.open(member) as src, open(dest, "wb") as dst:
                        shutil.copyfileobj(src, dst)
                        
        print("Binaries extracted successfully.")
        if zip_path.exists():
            zip_path.unlink()
    else:
        print(f"Binaries already exist in {target_bin}.")

    # Add to Windows User PATH via registry
    bin_str = str(target_bin)
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment", 0, winreg.KEY_READ | winreg.KEY_WRITE) as key:
            try:
                user_path, _ = winreg.QueryValueEx(key, "Path")
            except FileNotFoundError:
                user_path = ""
            if bin_str.lower() not in user_path.lower():
                new_path = f"{user_path};{bin_str}" if user_path else bin_str
                winreg.SetValueEx(key, "Path", 0, winreg.REG_EXPAND_SZ, new_path)
                print(f"Successfully added {bin_str} to User PATH registry.")
            else:
                print(f"{bin_str} already in User PATH registry.")
    except Exception as e:
        print(f"Warning: Could not update registry PATH: {e}")

    # Add to current process PATH
    os.environ["PATH"] = f"{bin_str};" + os.environ.get("PATH", "")
    os.environ["FFPROBE_PATH"] = str(ffprobe_exe)
    
    # Verify execution
    print("\n--- VERIFICATION ---")
    res_ffmpeg = subprocess.run([str(ffmpeg_exe), "-version"], capture_output=True, text=True)
    print("ffmpeg -version:")
    print(res_ffmpeg.stdout.splitlines()[0] if res_ffmpeg.stdout else "FAILED")
    
    res_ffprobe = subprocess.run([str(ffprobe_exe), "-version"], capture_output=True, text=True)
    print("ffprobe -version:")
    print(res_ffprobe.stdout.splitlines()[0] if res_ffprobe.stdout else "FAILED")
    
    print("\nFile locations:")
    print("ffmpeg.exe exists:", ffmpeg_exe.is_file(), str(ffmpeg_exe))
    print("ffprobe.exe exists:", ffprobe_exe.is_file(), str(ffprobe_exe))

if __name__ == "__main__":
    main()
