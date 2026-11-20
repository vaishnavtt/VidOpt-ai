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
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Hero Section */}
      <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
          <Layers className="w-3.5 h-3.5" />
          About VidOpt AI
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Intelligent Video Transcoding Time Forecasting
        </h2>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-light">
          Video transcoding is one of the most resource-intensive operations in cloud
          media streaming and content pipelines. VidOpt AI bridges the gap between video
          metadata and infrastructure planning by accurately estimating transcoding
          durations before encoding begins.
        </p>
      </div>

      {/* Problem & Solution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-base">The Challenge</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Without execution duration estimates, video processing clusters suffer
            from queue imbalances, unpredictable spot-instance expirations, and inability
            to provide accurate completion estimates to users.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-base">The VidOpt Solution</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            By leveraging lightweight video container metadata (resolution, bitrate,
            framerate, codecs), our gradient-boosted regression pipeline delivers
            sub-second duration estimates with zero pre-demuxing overhead.
          </p>
        </div>
      </div>

      {/* Architecture Flow */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
        <div>
          <h3 className="font-bold text-slate-900 text-base">System Architecture</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            End-to-end dataflow from user upload to prediction inference.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-xs leading-relaxed text-slate-700 overflow-x-auto">
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
      <div className="bg-amber-50/70 p-6 sm:p-8 rounded-3xl border border-amber-200 text-amber-950 space-y-3">
        <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          Benchmark Hardware Reference & Scientific Scope
        </div>
        <p className="text-xs text-amber-800 leading-relaxed">
          The underlying ground-truth dataset was recorded under rigorous scientific
          conditions using <strong>FFmpeg 4</strong> executed on an{' '}
          <strong>Intel Core i7-3720QM CPU</strong>.
        </p>
        <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
          <li>Predictions represent estimates standardized against this benchmark environment.</li>
          <li>Hardware acceleration (NVENC, Intel QuickSync, Apple VideoToolbox) will execute faster than CPU software transcoding.</li>
          <li>Predictions must be interpreted as baseline estimates rather than absolute real-time guarantees.</li>
        </ul>
      </div>

      {/* Technology Stack Grid */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-base">Technology Stack</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Backend</span>
            <span className="font-bold text-slate-800">FastAPI & Uvicorn</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Machine Learning</span>
            <span className="font-bold text-slate-800">XGBoost & Scikit-learn</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Frontend</span>
            <span className="font-bold text-slate-800">React & TypeScript</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Styling & Charts</span>
            <span className="font-bold text-slate-800">Tailwind CSS & Recharts</span>
          </div>
        </div>
      </div>

      {/* Dataset Attribution */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 text-xs text-slate-600">
        <h3 className="font-bold text-slate-900 text-sm">Dataset Attribution</h3>
        <p className="leading-relaxed">
          The models are trained on the public video transcoding dataset collected
          and published by the University of California, Irvine (UCI) Machine Learning Repository:
        </p>
        <blockquote className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 font-mono">
          UCI Machine Learning Repository: Video Transcoding Dataset.
          Available at https://archive.ics.uci.edu/ml/datasets/video+transcoding+dataset
        </blockquote>
      </div>
    </div>
  );
};
