import React from 'react';
import {
  Layers,
  Cpu,
  Database,
  ShieldAlert,
  Code,
  BookOpen,
  GitBranch,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="relative min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Hero Section */}
      <div className="rounded-3xl p-8 sm:p-10 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.14)] backdrop-blur-2xl shadow-xl space-y-3 text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold">
          <Layers className="w-3.5 h-3.5" />
          About VidOpt AI
        </div>
        <h2 className="text-3xl font-medium tracking-tight text-[#eef0f6] leading-tight">
          Intelligent Video Transcoding Time Forecasting
        </h2>
        <p className="text-[#b9becf] text-sm sm:text-base leading-relaxed font-light">
          Video transcoding is one of the most resource-intensive operations in cloud
          media streaming and content pipelines. VidOpt AI bridges the gap between video
          metadata and infrastructure planning by accurately estimating transcoding
          durations before encoding begins.
        </p>
      </div>

      {/* Problem & Solution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        <div className="rounded-3xl p-6 sm:p-8 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.14)] backdrop-blur-2xl shadow-xl space-y-2">
          <h3 className="font-semibold text-[#eef0f6] text-base">The Challenge</h3>
          <p className="text-xs text-[#b9becf] leading-relaxed">
            Without execution duration estimates, video processing clusters suffer
            from queue imbalances, unpredictable spot-instance expirations, and inability
            to provide accurate completion estimates to users.
          </p>
        </div>

        <div className="rounded-3xl p-6 sm:p-8 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.14)] backdrop-blur-2xl shadow-xl space-y-2">
          <h3 className="font-semibold text-[#eef0f6] text-base">The VidOpt Solution</h3>
          <p className="text-xs text-[#b9becf] leading-relaxed">
            By leveraging lightweight video container metadata (resolution, bitrate,
            framerate, codecs), our gradient-boosted regression pipeline delivers
            sub-second duration estimates with zero pre-demuxing overhead.
          </p>
        </div>
      </div>

      {/* Architecture Flow */}
      <div className="rounded-3xl p-6 sm:p-8 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.14)] backdrop-blur-2xl shadow-xl space-y-4 text-left">
        <div>
          <h3 className="font-semibold text-base text-[#eef0f6]">System Architecture</h3>
          <p className="text-xs text-[#b9becf] mt-0.5">
            End-to-end dataflow from user upload to prediction inference.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[rgba(4,5,12,0.6)] border border-[rgba(255,255,255,0.1)] font-mono text-xs leading-relaxed text-cyan-300 overflow-x-auto">
          <pre>{`
  [ Client Browser / UI ]
             │
             ▼ (Multipart Upload or Presets)
  [ FastAPI REST API (Python 3.11) ]
             │
      ───────┴───────
      │             │
      ▼             ▼
 [ FFprobe ]   [ Prediction Service ]
  Metadata          │
  Extraction        ▼
      │        [ Preprocessor ColumnTransformer ]
      │             │
      └────────────►▼
               [ XGBoost Regressor Model ]
                    │
                    ▼
               [ Predicted utime (seconds) ]
                    │
                    ▼
          [ JSON Prediction Response ]
`}</pre>
        </div>
      </div>

      {/* Scientific Reference Hardware & Limitations */}
      <div className="rounded-3xl p-6 sm:p-8 bg-amber-950/40 border border-amber-500/30 backdrop-blur-2xl text-amber-200 space-y-3 text-left">
        <div className="flex items-center gap-2 font-semibold text-amber-300 text-sm">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          Benchmark Hardware Reference & Scientific Scope
        </div>
        <p className="text-xs text-amber-200/90 leading-relaxed">
          The underlying ground-truth dataset was recorded under rigorous scientific
          conditions using <strong>FFmpeg 4</strong> executed on an{' '}
          <strong>Intel Core i7-3720QM CPU</strong>.
        </p>
        <ul className="text-xs text-amber-200/80 space-y-1 list-disc list-inside">
          <li>Predictions represent estimates standardized against this benchmark CPU environment.</li>
          <li>Hardware acceleration (NVENC, Intel QuickSync, Apple VideoToolbox) will execute faster than CPU software transcoding.</li>
          <li>Predictions must be interpreted as baseline estimates rather than absolute real-time guarantees.</li>
        </ul>
      </div>

      {/* Technology Stack Grid */}
      <div className="rounded-3xl p-6 sm:p-8 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.14)] backdrop-blur-2xl shadow-xl space-y-4 text-left">
        <h3 className="font-semibold text-base text-[#eef0f6]">Technology Stack</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs">
            <span className="text-[#b9becf] block text-[10px] uppercase font-semibold">Backend</span>
            <span className="font-semibold text-[#eef0f6]">FastAPI & Uvicorn</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs">
            <span className="text-[#b9becf] block text-[10px] uppercase font-semibold">Machine Learning</span>
            <span className="font-semibold text-[#eef0f6]">XGBoost & Scikit-learn</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs">
            <span className="text-[#b9becf] block text-[10px] uppercase font-semibold">Frontend</span>
            <span className="font-semibold text-[#eef0f6]">React & TypeScript</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs">
            <span className="text-[#b9becf] block text-[10px] uppercase font-semibold">Graphics & Motion</span>
            <span className="font-semibold text-[#eef0f6]">WebGL & Tailwind</span>
          </div>
        </div>
      </div>

      {/* Dataset Attribution */}
      <div className="rounded-3xl p-6 sm:p-8 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.14)] backdrop-blur-2xl shadow-xl space-y-3 text-xs text-[#b9becf] text-left">
        <h3 className="font-semibold text-sm text-[#eef0f6]">Dataset Attribution</h3>
        <p className="leading-relaxed">
          The models are trained on the public video transcoding dataset collected
          and published by the University of California, Irvine (UCI) Machine Learning Repository:
        </p>
        <blockquote className="p-4 bg-[rgba(4,5,12,0.5)] rounded-2xl border border-[rgba(255,255,255,0.1)] text-[11px] text-cyan-300 font-mono">
          UCI Machine Learning Repository: Video Transcoding Dataset.
          Available at https://archive.ics.uci.edu/ml/datasets/video+transcoding+dataset
        </blockquote>
      </div>
    </div>
  );
};
