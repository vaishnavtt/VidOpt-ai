import React, { useState } from 'react';
import {
  BrainCircuit,
  TrendingDown,
  Gauge,
  Layers,
  Zap,
  HardDrive,
  Info,
  CheckCircle,
  BarChart3,
  Sliders,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const METRICS_TABLE = [
  {
    model: 'Random Forest Baseline',
    mae: '1.7438 s',
    rmse: '4.5048 s',
    r2: '0.9177',
    speed: '85.4 ms',
    size: '863.6 MB',
    features: 18,
    status: 'Baseline',
  },
  {
    model: 'Tuned Random Forest',
    mae: '1.6212 s',
    rmse: '4.3490 s',
    r2: '0.9233',
    speed: '109.5 ms',
    size: '524.9 MB',
    features: 18,
    status: 'Tuned',
  },
  {
    model: 'XGBoost Baseline',
    mae: '1.8307 s',
    rmse: '4.0727 s',
    r2: '0.9327',
    speed: '13.0 ms',
    size: '2.5 MB',
    features: 18,
    status: 'Baseline',
  },
  {
    model: 'Tuned XGBoost (Selected Final)',
    mae: '1.6048 s',
    rmse: '3.9863 s',
    r2: '0.9356',
    speed: '12.2 ms',
    size: '6.0 MB',
    features: 18,
    status: 'Selected Final',
    highlight: true,
  },
  {
    model: 'Metadata-Only XGBoost',
    mae: '1.7978 s',
    rmse: '4.4050 s',
    r2: '0.9213',
    speed: '11.5 ms',
    size: '4.2 MB',
    features: 11,
    status: 'Active API',
    highlightSub: true,
  },
];

const FEATURE_IMPORTANCE_DATA = [
  { feature: 'duration', importance: 0.384 },
  { feature: 'o_width', importance: 0.178 },
  { feature: 'o_height', importance: 0.142 },
  { feature: 'o_bitrate', importance: 0.086 },
  { feature: 'width', importance: 0.052 },
  { feature: 'height', importance: 0.041 },
  { feature: 'bitrate', importance: 0.038 },
  { feature: 'frames', importance: 0.029 },
  { feature: 'framerate', importance: 0.018 },
  { feature: 'codec_h264', importance: 0.015 },
];

const RESOLUTION_ERROR_DATA = [
  { group: 'SD (<720p)', mae: 0.81, count: 12240 },
  { group: 'HD (720p)', mae: 2.61, count: 3053 },
  { group: 'FHD (1080p)', mae: 3.78, count: 3052 },
];

export const ModelInsights: React.FC = () => {
  const [activeMetricTab, setActiveMetricTab] = useState<'mae' | 'rmse' | 'r2'>('mae');

  const chartData = [
    { name: 'RF Baseline', value: activeMetricTab === 'mae' ? 1.74 : activeMetricTab === 'rmse' ? 4.50 : 0.918 },
    { name: 'Tuned RF', value: activeMetricTab === 'mae' ? 1.62 : activeMetricTab === 'rmse' ? 4.35 : 0.923 },
    { name: 'XGB Baseline', value: activeMetricTab === 'mae' ? 1.83 : activeMetricTab === 'rmse' ? 4.07 : 0.933 },
    { name: 'Tuned XGB (Final)', value: activeMetricTab === 'mae' ? 1.60 : activeMetricTab === 'rmse' ? 3.99 : 0.936 },
    { name: 'Metadata XGB', value: activeMetricTab === 'mae' ? 1.80 : activeMetricTab === 'rmse' ? 4.41 : 0.921 },
  ];

  return (
    <div className="relative min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.14)] backdrop-blur-2xl shadow-xl space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold">
          <BrainCircuit className="w-3.5 h-3.5" />
          Empirical Model Benchmarking
        </div>
        <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-[#eef0f6]">
          Machine Learning Architecture & Results
        </h2>
        <p className="text-xs sm:text-sm text-[#b9becf] max-w-3xl leading-relaxed">
          Rigorous 5-fold video-level group cross-validation evaluated across Random Forest and XGBoost architectures on 68,784 UCI transcoding records.
        </p>
      </div>

      {/* Model Benchmark Table */}
      <div className="rounded-3xl border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] backdrop-blur-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-[rgba(255,255,255,0.1)] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base text-[#eef0f6]">
              Complete Model Comparison Matrix
            </h3>
            <p className="text-xs text-[#b9becf]/70 mt-0.5">
              Held-out test set evaluation (18,345 records, 220 unique video IDs).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[rgba(255,255,255,0.04)] text-[#b9becf] uppercase tracking-wider font-semibold border-b border-[rgba(255,255,255,0.1)]">
              <tr>
                <th className="px-6 py-4">Model Architecture</th>
                <th className="px-6 py-4">MAE (seconds)</th>
                <th className="px-6 py-4">RMSE (seconds)</th>
                <th className="px-6 py-4">Explained Variance (R²)</th>
                <th className="px-6 py-4">Inference Latency</th>
                <th className="px-6 py-4">Model Size</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.08)]">
              {METRICS_TABLE.map((row) => (
                <tr
                  key={row.model}
                  className={
                    row.highlight
                      ? 'bg-cyan-500/10 font-semibold text-white'
                      : row.highlightSub
                      ? 'bg-amber-500/10 text-[#eef0f6]'
                      : 'hover:bg-[rgba(255,255,255,0.04)] text-[#b9becf]'
                  }
                >
                  <td className="px-6 py-4 font-medium flex items-center gap-2">
                    {row.highlight && (
                      <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                    )}
                    {row.model}
                  </td>
                  <td className="px-6 py-4 font-semibold text-[#eef0f6]">{row.mae}</td>
                  <td className="px-6 py-4">{row.rmse}</td>
                  <td className="px-6 py-4">{row.r2}</td>
                  <td className="px-6 py-4 text-[#b9becf]/70">{row.speed}</td>
                  <td className="px-6 py-4 text-[#b9becf]/70">{row.size}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                        row.highlight
                          ? 'bg-cyan-400 text-[#04050c] font-bold'
                          : row.highlightSub
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                          : 'bg-white/10 text-[#b9becf]'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Metric Comparison Chart */}
      <div className="rounded-3xl border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] backdrop-blur-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.1)] pb-5">
          <div>
            <h3 className="text-base font-semibold text-[#eef0f6]">
              Interactive Metric Visualization
            </h3>
            <p className="text-xs text-[#b9becf] mt-0.5">
              Select metric to view comparative performance across architectures.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-[rgba(255,255,255,0.08)] rounded-full border border-[rgba(255,255,255,0.12)]">
            <button
              type="button"
              onClick={() => setActiveMetricTab('mae')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeMetricTab === 'mae'
                  ? 'bg-white text-[#2f2f33] shadow-md font-semibold'
                  : 'text-[#b9becf] hover:text-white'
              }`}
            >
              MAE (Lower is Better)
            </button>
            <button
              type="button"
              onClick={() => setActiveMetricTab('rmse')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeMetricTab === 'rmse'
                  ? 'bg-white text-[#2f2f33] shadow-md font-semibold'
                  : 'text-[#b9becf] hover:text-white'
              }`}
            >
              RMSE (Lower is Better)
            </button>
            <button
              type="button"
              onClick={() => setActiveMetricTab('r2')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeMetricTab === 'r2'
                  ? 'bg-white text-[#2f2f33] shadow-md font-semibold'
                  : 'text-[#b9becf] hover:text-white'
              }`}
            >
              R² (Higher is Better)
            </button>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#b9becf', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
              <YAxis tick={{ fill: '#b9becf', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(4, 5, 12, 0.95)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  fontSize: '12px',
                  color: '#eef0f6',
                }}
              />
              <Bar dataKey="value" fill="#22d3ee" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feature Importance & Resolution Error Dual Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Importance */}
        <div className="rounded-3xl border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] backdrop-blur-2xl p-6 sm:p-8 shadow-xl space-y-4">
          <h3 className="font-semibold text-[#eef0f6] text-sm">
            Top Feature Importance (Tuned XGBoost)
          </h3>
          <p className="text-xs text-[#b9becf]">
            Relative gain score contribution for transcoding time prediction.
          </p>

          <div className="space-y-3 pt-2">
            {FEATURE_IMPORTANCE_DATA.map((item) => (
              <div key={item.feature} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-[#eef0f6] font-mono">{item.feature}</span>
                  <span className="text-cyan-300">{(item.importance * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 rounded-full"
                    style={{ width: `${item.importance * 100 * 2.5}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resolution Error Breakdown */}
        <div className="rounded-3xl border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] backdrop-blur-2xl p-6 sm:p-8 shadow-xl space-y-4">
          <h3 className="font-semibold text-[#eef0f6] text-sm">
            Error Distribution by Resolution Group
          </h3>
          <p className="text-xs text-[#b9becf]">
            Empirical MAE observed across target resolutions in error analysis.
          </p>

          <div className="space-y-3 pt-2">
            {RESOLUTION_ERROR_DATA.map((item) => (
              <div key={item.group} className="p-4 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] flex items-center justify-between">
                <div>
                  <div className="font-medium text-[#eef0f6] text-sm">{item.group}</div>
                  <div className="text-[11px] text-[#b9becf]/70 mt-0.5">{item.count.toLocaleString()} test evaluations</div>
                </div>
                <div className="text-right">
                  <span className="text-base font-semibold text-cyan-300">
                    &plusmn; {item.mae.toFixed(2)} s
                  </span>
                  <span className="text-[10px] text-[#b9becf]/70 block">Mean Error</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-[#b9becf]/70 leading-relaxed pt-2">
            *Observation: Lower resolutions (&lt;720p) achieve sub-second average prediction error (&plusmn;0.81 s),
            whereas 1080p transcodes exhibit higher error (&plusmn;3.78 s) due to pixel volume variance.
          </p>
        </div>
      </div>
    </div>
  );
};
