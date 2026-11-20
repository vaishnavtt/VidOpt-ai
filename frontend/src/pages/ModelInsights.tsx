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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Title Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
          <BrainCircuit className="w-3.5 h-3.5" />
          Empirical Model Benchmarking
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Machine Learning Architecture & Evaluation Results
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
          Detailed metrics across Random Forest and XGBoost architectures evaluated
          using 5-fold video-level group cross-validation on 68,784 records.
        </p>
      </div>

      {/* Model Benchmark Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Complete Model Comparison Matrix
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Held-out test set evaluation (18,345 records, 220 unique video IDs).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
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
            <tbody className="divide-y divide-slate-100">
              {METRICS_TABLE.map((row) => (
                <tr
                  key={row.model}
                  className={
                    row.highlight
                      ? 'bg-indigo-50/40 font-semibold text-indigo-950'
                      : row.highlightSub
                      ? 'bg-amber-50/30'
                      : 'hover:bg-slate-50/70 text-slate-700'
                  }
                >
                  <td className="px-6 py-4 font-bold flex items-center gap-2">
                    {row.highlight && (
                      <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                    )}
                    {row.model}
                  </td>
                  <td className="px-6 py-4 font-bold">{row.mae}</td>
                  <td className="px-6 py-4">{row.rmse}</td>
                  <td className="px-6 py-4">{row.r2}</td>
                  <td className="px-6 py-4 text-slate-500">{row.speed}</td>
                  <td className="px-6 py-4 text-slate-500">{row.size}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.highlight
                          ? 'bg-indigo-600 text-white'
                          : row.highlightSub
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
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
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Interactive Metric Visualization
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select metric to view comparative performance across architectures.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveMetricTab('mae')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeMetricTab === 'mae'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              MAE (Lower is Better)
            </button>
            <button
              type="button"
              onClick={() => setActiveMetricTab('rmse')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeMetricTab === 'rmse'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              RMSE (Lower is Better)
            </button>
            <button
              type="button"
              onClick={() => setActiveMetricTab('r2')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeMetricTab === 'r2'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              R² (Higher is Better)
            </button>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={{ stroke: '#e2e8f0' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feature Importance & Resolution Error Dual Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Importance */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">
            Top Feature Importance (Tuned XGBoost)
          </h3>
          <p className="text-xs text-slate-400">
            Relative gain score contribution for transcoding time prediction.
          </p>

          <div className="space-y-2.5 pt-2">
            {FEATURE_IMPORTANCE_DATA.map((item) => (
              <div key={item.feature} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-700 font-mono">{item.feature}</span>
                  <span className="text-slate-500">{(item.importance * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${item.importance * 100 * 2.5}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resolution Error Breakdown */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">
            Error Distribution by Resolution Group
          </h3>
          <p className="text-xs text-slate-400">
            Empirical MAE observed across target resolutions in error analysis.
          </p>

          <div className="space-y-4 pt-2">
            {RESOLUTION_ERROR_DATA.map((item) => (
              <div key={item.group} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 text-sm">{item.group}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{item.count.toLocaleString()} test evaluations</div>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-indigo-600">
                    &plusmn; {item.mae.toFixed(2)} s
                  </span>
                  <span className="text-[10px] text-slate-400 block">Mean Error</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed pt-2">
            *Observation: Lower resolutions (&lt;720p) achieve sub-second average prediction error (&plusmn;0.81 s),
            whereas 1080p transcodes exhibit higher error (&plusmn;3.78 s) due to pixel volume variance.
          </p>
        </div>
      </div>
    </div>
  );
};
