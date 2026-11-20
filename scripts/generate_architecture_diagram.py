"""
Generate a professional, high-resolution architecture diagram for VidOpt AI.
Saves to screenshots/architecture.png
"""
import os
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch

# Set up canvas
fig, ax = plt.subplots(figsize=(16, 10), dpi=200)
ax.set_facecolor('#0f172a')  # Dark slate background
fig.patch.set_facecolor('#0f172a')

# Hide axes
ax.set_xlim(0, 16)
ax.set_ylim(0, 10)
ax.axis('off')

# Title & Subtitle
ax.text(8, 9.4, "VidOpt AI — System Architecture & Machine Learning Pipeline", 
        fontsize=20, fontweight='bold', color='#ffffff', ha='center', va='center', fontfamily='sans-serif')
ax.text(8, 9.0, "End-to-End Workflow: Video Analysis, Preprocessing, XGBoost Inference & Cluster Scheduling", 
        fontsize=12, color='#94a3b8', ha='center', va='center', fontfamily='sans-serif')

def draw_card(ax, x, y, w, h, bg_color, border_color, title, subtitle="", items=None, icon=""):
    # Bounding box
    box = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.1,rounding_size=0.25",
                         facecolor=bg_color, edgecolor=border_color, linewidth=1.5, zorder=2)
    ax.add_patch(box)
    
    # Header
    title_text = f"{icon} {title}".strip() if icon else title
    ax.text(x + 0.25, y + h - 0.35, title_text, fontsize=11, fontweight='bold', color='#f8fafc', va='center', zorder=3)
    if subtitle:
        ax.text(x + 0.25, y + h - 0.65, subtitle, fontsize=8.5, color='#94a3b8', va='center', zorder=3)
    
    # Items
    if items:
        start_y = y + h - 0.95 if subtitle else y + h - 0.75
        for i, item in enumerate(items):
            ax.text(x + 0.35, start_y - (i * 0.3), f"•  {item}", fontsize=8, color='#cbd5e1', va='center', zorder=3)

def draw_arrow(ax, x1, y1, x2, y2, label="", color="#38bdf8", style="->", rad=0.0):
    connectionstyle = f"arc3,rad={rad}" if rad else "arc3"
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle=style, color=color, lw=1.8,
                                connectionstyle=connectionstyle, mutation_scale=15),
                zorder=4)
    if label:
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        ax.text(mx, my + 0.15, label, fontsize=8, color=color, fontweight='bold',
                ha='center', va='bottom', zorder=5,
                bbox=dict(boxstyle="round,pad=0.2", facecolor='#0f172a', edgecolor='none', alpha=0.85))

# ==========================================
# SECTION 1: TOP (OFFLINE ML TRAINING PIPELINE)
# ==========================================
sec1_bg = FancyBboxPatch((0.5, 5.7), 15.0, 2.9, boxstyle="round,pad=0.15,rounding_size=0.3",
                         facecolor='#1e293b', edgecolor='#334155', linewidth=1.2, linestyle='--', zorder=1)
ax.add_patch(sec1_bg)
ax.text(0.8, 8.35, "OFFLINE MACHINE LEARNING & EVALUATION PIPELINE", fontsize=10, fontweight='bold', color='#38bdf8', va='center', zorder=2)

draw_card(ax, 0.8, 6.0, 3.0, 2.1, '#0f172a', '#475569', "1. UCI Transcoding Dataset", "68,784 records, 1,099 videos",
          ["Raw Video Transcoding Data", "22 Container & Frame Features", "Target: CPU User Time (utime)"])

draw_card(ax, 4.4, 6.0, 3.2, 2.1, '#0f172a', '#475569', "2. Preprocessing & Splitting", "Zero-Leakage Group Protocol",
          ["GroupShuffleSplit on Video ID", "Train: 50,439 | Test: 18,345", "Leakage Exclusion: umem, b_size"])

draw_card(ax, 8.2, 6.0, 3.4, 2.1, '#0f172a', '#6366f1', "3. Model Tuning & Training", "5-Fold Group Cross-Validation",
          ["Random Forest (Baseline & Tuned)", "XGBoost Regressor Search (n=500)", "Metadata-Only Model (11 features)"])

draw_card(ax, 12.2, 6.0, 3.0, 2.1, '#0f172a', '#10b981', "4. Production Artifacts", "Serialized Joblib Pipelines",
          ["final_model.pkl (18-feat, R²=0.936)", "metadata_transcoding_model.pkl", "training_ranges & metrics.csv"])

draw_arrow(ax, 3.8, 7.05, 4.4, 7.05, "")
draw_arrow(ax, 7.6, 7.05, 8.2, 7.05, "")
draw_arrow(ax, 11.6, 7.05, 12.2, 7.05, "")

# ==========================================
# SECTION 2: BOTTOM (ONLINE SYSTEM WORKFLOW)
# ==========================================
sec2_bg = FancyBboxPatch((0.5, 0.6), 15.0, 4.7, boxstyle="round,pad=0.15,rounding_size=0.3",
                         facecolor='#1e293b', edgecolor='#334155', linewidth=1.2, zorder=1)
ax.add_patch(sec2_bg)
ax.text(0.8, 5.05, "ONLINE INFERENCE PLATFORM & RUNTIME WORKFLOW", fontsize=10, fontweight='bold', color='#10b981', va='center', zorder=2)

# User / Client Box
draw_card(ax, 0.8, 1.0, 3.2, 3.7, '#0f172a', '#3b82f6', "User Client & Dashboard", "React 19 + TypeScript + Vite",
          ["Drag-and-Drop Video Upload",
           "Benchmark Preset Selector",
           "Target Codec & Bitrate Config",
           "Interactive Recharts Analytics",
           "Prediction History (LocalStorage)",
           "Realtime Factor & Speedup Readout"])

# FastAPI Backend
draw_card(ax, 4.6, 2.0, 3.2, 2.7, '#0f172a', '#06b6d4', "FastAPI Backend Service", "Python 3.11 • REST API (v1)",
          ["Pydantic v2 Schema Validation",
           "500 MB Max Upload Enforcer",
           "CORS & Health Probes",
           "Temporary Storage Auto-Cleanup",
           "Model Singleton Service"])

# FFprobe Subprocess
draw_card(ax, 4.6, 0.8, 3.2, 1.0, '#0f172a', '#eab308', "FFprobe Inspector", "Multi-Tier Discovery",
          ["Stream extraction (width, height, fps, codec)"])

# Feature Processing & Prediction Engine
draw_card(ax, 8.4, 1.0, 3.4, 3.7, '#0f172a', '#8b5cf6', "ML Inference Engine", "Scikit-Learn & XGBoost Runtime",
          ["Dynamic One-Hot Encoding",
           "Numeric Scaling Pipeline",
           "Zero-Decode Mode (11 features)",
           "Full Content Mode (18 features)",
           "Non-negative Bounds Enforcer",
           "Prediction Latency < 15ms"])

# Response & Visualization
draw_card(ax, 12.4, 1.0, 2.8, 3.7, '#0f172a', '#10b981', "Results & Action", "Transcoding Time Predictions",
          ["Estimated Duration (seconds)",
           "Formatted Time (e.g. 13.17s)",
           "Realtime Factor (RTF)",
           "Cluster Spot-Instance Sizing",
           "Queue Prioritization",
           "Transparent User Feedback"])

# Connecting arrows in Section 2
draw_arrow(ax, 4.0, 3.3, 4.6, 3.3, "POST /video/analyze")
draw_arrow(ax, 4.0, 2.5, 4.6, 2.5, "POST /predict")

draw_arrow(ax, 6.2, 2.0, 6.2, 1.8, "Subprocess")
draw_arrow(ax, 6.2, 1.8, 6.2, 2.0, "JSON metadata")

draw_arrow(ax, 7.8, 2.85, 8.4, 2.85, "Features dict")

# Model artifact integration into Inference Engine
draw_arrow(ax, 13.7, 6.0, 10.1, 4.7, "Load .pkl Pipelines", color='#a855f7', rad=0.15)

draw_arrow(ax, 11.8, 2.85, 12.4, 2.85, "JSON Forecast")

# Feedback to UI
draw_arrow(ax, 13.8, 1.0, 2.4, 1.0, "Forecast Display & Cache Update", color='#38bdf8', rad=0.12)

# Save figure
output_path = Path(__file__).resolve().parent.parent / "screenshots" / "architecture.png"
output_path.parent.mkdir(parents=True, exist_ok=True)
plt.savefig(output_path, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor(), edgecolor='none')
plt.close()
print(f"Architecture diagram generated successfully at: {output_path}")
