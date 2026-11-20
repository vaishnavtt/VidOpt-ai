import React from 'react';
import { Link } from 'react-router-dom';
import {
  Video,
  Brain,
  Gauge,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Clock,
  Layers,
  Database,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { MetricCard } from '../components/common/MetricCard';

// Verified experiment metrics from the actual saved model comparison
const modelComparisonData = [
  { name: 'RF Baseline', mae: 1.74, rmse: 4.5, r2: 0.918, latency: 85.4 },
  { name: 'Tuned RF', mae: 1.62, rmse: 4.35, r2: 0.923, latency: 109.5 },
  { name: 'XGBoost Baseline', mae: 1.83, rmse: 4.07, r2: 0.933, latency: 13.0 },
  { name: 'Tuned XGBoost (Final)', mae: 1.6, rmse: 3.99, r2: 0.936, latency: 12.2 },
  { name: 'Metadata XGBoost', mae: 1.8, rmse: 4.41, r2: 0.921, latency: 11.5 },
];

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-8 sm:p-10 shadow-lg shadow-indigo-900/10">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-indigo-200 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Machine Learning Transcoding Forecaster
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Understand Your Video Transcoding Time Before You Start.
          </h2>
          <p className="text-slate-200 text-sm sm:text-base leading-relaxed max-w-2xl font-light">
            Analyze video characteristics and estimate transcoding time with
            statistical precision using XGBoost models trained on 68,784 video
            transcoding measurements.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Link
              to="/analyze"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-indigo-950 font-semibold text-sm hover:bg-indigo-50 transition-colors shadow-sm"
            >
              <Video className="w-4 h-4 text-indigo-600" />
              Analyze a Video
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/insights"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm backdrop-blur-xs transition-colors border border-white/20"
            >
              <Brain className="w-4 h-4 text-indigo-300" />
              Explore ML Insights
            </Link>
          </div>
        </div>

        {/* Subtle decorative background blur */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      </div>

      {/* Primary KPI Grid (Actual Verified Model Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          label="Tuned XGBoost MAE"
          value="1.60"
          unit="seconds"
          description="Mean Absolute Error on 18,345 unseen test records"
          icon={TrendingDown}
          variant="indigo"
          badge="Top Performer"
        />
        <MetricCard
          label="Tuned XGBoost RMSE"
          value="3.99"
          unit="seconds"
          description="Root Mean Squared Error (penalizes large errors)"
          icon={Gauge}
          variant="emerald"
          badge="Lowest Outliers"
        />
        <MetricCard
          label="Explained Variance (R²)"
          value="0.9356"
          unit=""
          description="Proportion of target variance explained by model"
          icon={Layers}
          variant="violet"
          badge="93.6% Variance"
        />
        <MetricCard
          label="Metadata-Only Model"
          value="1.80"
          unit="s MAE"
          description="Zero-decode model using only 11 metadata features"
          icon={Clock}
          variant="amber"
          badge="Live User API"
        />
      </div>

      {/* Model Benchmark Comparison Chart */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Model Performance Comparison
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict group-aware test split evaluation (879 train videos / 220 test videos).
              Lower MAE & RMSE represent better accuracy.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-indigo-600 inline-block" />
              <span>MAE (seconds)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-slate-300 inline-block" />
              <span>RMSE (seconds)</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={modelComparisonData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 12 }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="mae" name="MAE (s)" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              <Bar dataKey="rmse" name="RMSE (s)" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3 text-xs text-slate-600">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-800">Scientific Note:</strong> The
            selected production model is <strong>Tuned XGBoost</strong> (MAE = 1.60 s,
            RMSE = 3.99 s). For user convenience, the <strong>Metadata-Only XGBoost</strong> model
            (MAE = 1.80 s) is deployed in the prediction endpoint because it requires
            no frame-level decoding while maintaining high predictive accuracy ($R^2 = 0.9213$).
          </p>
        </div>
      </div>

      {/* Workflow Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            1
          </div>
          <h4 className="font-bold text-slate-900 text-base">Video Analysis</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Upload your source video or choose common presets. The system inspects
            resolution, duration, framerate, and codec.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            2
          </div>
          <h4 className="font-bold text-slate-900 text-base">Target Configuration</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Select output resolution (1080p, 720p, 480p), target codec (H.264, VP8, MPEG-4),
            and desired target bitrate.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            3
          </div>
          <h4 className="font-bold text-slate-900 text-base">Instant Prediction</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Our trained XGBoost model computes the expected transcoding duration
            in seconds, along with real-time conversion ratios.
          </p>
        </div>
      </div>
    </div>
  );
};
