import React, { useState, useEffect } from 'react';
import {
  Upload,
  Video,
  Settings,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
  Sliders,
  FileVideo,
  Info,
  Save,
  Check,
  ChevronDown,
} from 'lucide-react';
import {
  analyzeVideo,
  configureTranscoding,
  predictMetadata,
  getOptions,
} from '../services/api';
import { savePredictionToHistory } from '../utils/history';
import type {
  MetadataPredictionRequest,
  PredictionResponse,
  VideoMetadataResponse,
} from '../types';

// Preset configurations for fast testing and manual exploration
const SOURCE_PRESETS = [
  {
    name: '1080p FHD (2 min, H.264)',
    duration: 120,
    width: 1920,
    height: 1080,
    bitrate: 5000000,
    framerate: 29.97,
    codec: 'h264',
  },
  {
    name: '720p HD (1 min, H.264)',
    duration: 60,
    width: 1280,
    height: 720,
    bitrate: 2500000,
    framerate: 30,
    codec: 'h264',
  },
  {
    name: '4K UHD (30 sec, H.264)',
    duration: 30,
    width: 3840,
    height: 2160,
    bitrate: 15000000,
    framerate: 60,
    codec: 'h264',
  },
  {
    name: '480p SD (3 min, MPEG-4)',
    duration: 180,
    width: 854,
    height: 480,
    bitrate: 1000000,
    framerate: 25,
    codec: 'mpeg4',
  },
];

const TARGET_PRESETS = [
  { name: '720p HD (H.264)', width: 1280, height: 720, bitrate: 2000000, framerate: 30, codec: 'h264' },
  { name: '1080p FHD (H.264)', width: 1920, height: 1080, bitrate: 4500000, framerate: 30, codec: 'h264' },
  { name: '480p SD (VP8 / WebM)', width: 854, height: 480, bitrate: 800000, framerate: 25, codec: 'vp8' },
  { name: '360p Low (MPEG-4)', width: 640, height: 360, bitrate: 500000, framerate: 24, codec: 'mpeg4' },
];

export const AnalyzeVideo: React.FC = () => {
  // Step indicator: 1 = Source Selection, 2 = Target Config, 3 = Prediction Result
  const [step, setStep] = useState<number>(1);

  // Source metadata state
  const [sourceData, setSourceData] = useState({
    videoName: 'sample_video.mp4',
    duration: 120,
    width: 1920,
    height: 1080,
    bitrate: 5000000,
    framerate: 29.97,
    codec: 'h264',
  });

  // Target metadata state
  const [targetData, setTargetData] = useState({
    o_codec: 'h264',
    o_width: 1280,
    o_height: 720,
    o_bitrate: 2000000,
    o_framerate: 29.97,
  });

  // Supported options from backend
  const [supportedCodecs, setSupportedCodecs] = useState<string[]>(['h264', 'vp8', 'mpeg4', 'flv']);

  // Loading & status states
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [predicting, setPredicting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ffprobeMissingNotice, setFfprobeMissingNotice] = useState<boolean>(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [savedToHistory, setSavedToHistory] = useState<boolean>(false);

  // Prediction result state
  const [predictionResult, setPredictionResult] = useState<PredictionResponse | null>(null);

  // Fetch backend options on load
  useEffect(() => {
    getOptions()
      .then((opts) => {
        if (opts.supported_codecs && opts.supported_codecs.length > 0) {
          setSupportedCodecs(opts.supported_codecs);
        }
      })
      .catch((err) => {
        console.warn('Could not load dynamic options, using defaults.', err);
      });
  }, []);

  // Handle file drop / upload
  const handleFileUpload = async (file: File) => {
    setErrorMessage(null);
    setFfprobeMissingNotice(false);
    setUploading(true);
    setUploadProgress(0);

    try {
      const data: VideoMetadataResponse = await analyzeVideo(file, (progress) => {
        if (progress.total) {
          setUploadProgress(Math.round((progress.loaded * 100) / progress.total));
        }
      });

      if (data.success) {
        setSourceData({
          videoName: file.name,
          duration: data.duration ? Math.round(data.duration) : 60,
          width: data.width || 1920,
          height: data.height || 1080,
          bitrate: data.bitrate || 4000000,
          framerate: data.framerate ? parseFloat(data.framerate.toFixed(2)) : 30,
          codec: (data.codec || 'h264').toLowerCase(),
        });
        setStep(2);
      }
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 503) {
        // FFprobe not installed on server
        setFfprobeMissingNotice(true);
        setSourceData((prev) => ({ ...prev, videoName: file.name }));
      } else {
        setErrorMessage(
          detail || 'Failed to upload and analyze video file. Please check file format.'
        );
      }
    } finally {
      setUploading(false);
    }
  };

  // Run prediction
  const handlePredict = async () => {
    setErrorMessage(null);
    setPredicting(true);

    try {
      // 1. Validate configuration first
      const configPayload = {
        duration: Number(sourceData.duration),
        width: Number(sourceData.width),
        height: Number(sourceData.height),
        bitrate: Number(sourceData.bitrate),
        framerate: Number(sourceData.framerate),
        codec: sourceData.codec,
        o_codec: targetData.o_codec,
        o_width: Number(targetData.o_width),
        o_height: Number(targetData.o_height),
        o_bitrate: Number(targetData.o_bitrate),
        o_framerate: Number(targetData.o_framerate),
      };

      const configRes = await configureTranscoding(configPayload);
      if (configRes.warnings && configRes.warnings.length > 0) {
        setValidationWarnings(configRes.warnings);
      } else {
        setValidationWarnings([]);
      }

      // 2. Request actual model prediction
      const predictPayload: MetadataPredictionRequest = {
        ...configPayload,
      };

      const result = await predictMetadata(predictPayload);
      setPredictionResult(result);
      setSavedToHistory(false);
      setStep(3);

      // Auto-save to history
      if (result.success && result.prediction) {
        const realtimeFactor =
          sourceData.duration > 0
            ? parseFloat(
                (result.prediction.estimated_time_seconds / sourceData.duration).toFixed(2)
              )
            : 1;

        savePredictionToHistory({
          videoName: sourceData.videoName,
          sourceResolution: `${sourceData.width}×${sourceData.height}`,
          outputResolution: `${targetData.o_width}×${targetData.o_height}`,
          sourceCodec: sourceData.codec.toUpperCase(),
          outputCodec: targetData.o_codec.toUpperCase(),
          durationSeconds: sourceData.duration,
          estimatedTimeSeconds: parseFloat(
            result.prediction.estimated_time_seconds.toFixed(2)
          ),
          estimatedTimeFormatted: result.prediction.estimated_time_formatted,
          modelName: result.prediction.model_name,
          predictionType: result.prediction.prediction_type,
          realtimeFactor,
        });
        setSavedToHistory(true);
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setErrorMessage(
        typeof detail === 'string'
          ? detail
          : 'Transcoding time prediction failed. Please review the inputs.'
      );
    } finally {
      setPredicting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setPredictionResult(null);
    setErrorMessage(null);
    setFfprobeMissingNotice(false);
    setValidationWarnings([]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Progress Steps Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div
            className={`flex items-center gap-2.5 ${
              step >= 1 ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              1
            </div>
            <span className="text-sm hidden sm:inline">Source Video</span>
          </div>

          <div
            className={`h-0.5 w-12 sm:w-20 ${
              step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          />

          <div
            className={`flex items-center gap-2.5 ${
              step >= 2 ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              2
            </div>
            <span className="text-sm hidden sm:inline">Output Target</span>
          </div>

          <div
            className={`h-0.5 w-12 sm:w-20 ${
              step >= 3 ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          />

          <div
            className={`flex items-center gap-2.5 ${
              step >= 3 ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              3
            </div>
            <span className="text-sm hidden sm:inline">ML Prediction</span>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Error</p>
            <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: SOURCE VIDEO SELECTION                                            */}
      {/* ========================================================================= */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Notice if FFprobe not in path */}
          {ffprobeMissingNotice && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <Info className="w-4 h-4 text-amber-600" />
                FFprobe binary not detected in server PATH
              </div>
              <p className="text-amber-700 leading-relaxed">
                Direct video file header decoding requires FFmpeg/FFprobe. However,
                the ML prediction engine does not require FFprobe: you can review
                and configure the video metadata below or pick a preset to run predictions immediately!
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shadow-xs"
                >
                  Continue to Output Configuration &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Drag & Drop Upload Zone */}
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8 sm:p-12 text-center hover:border-indigo-400 transition-colors">
            <input
              type="file"
              id="video-upload"
              accept=".mp4,.mkv,.avi,.mov,.webm,.flv,.ts,.m4v"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <label
              htmlFor="video-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                <Upload className="w-8 h-8 stroke-[1.8]" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-slate-800">
                  {uploading
                    ? `Uploading & Inspecting... ${uploadProgress}%`
                    : 'Upload video file to extract metadata'}
                </p>
                <p className="text-xs text-slate-400">
                  Supports MP4, MKV, AVI, MOV, WEBM, FLV (up to 500 MB)
                </p>
              </div>
              <span className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors">
                Browse Video Files
              </span>
            </label>
          </div>

          {/* Fast Preset Selector */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Or Test Instantly with Benchmark Presets
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select a common video resolution and duration profile from our dataset
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {SOURCE_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setSourceData({
                      videoName: preset.name,
                      duration: preset.duration,
                      width: preset.width,
                      height: preset.height,
                      bitrate: preset.bitrate,
                      framerate: preset.framerate,
                      codec: preset.codec,
                    });
                    setStep(2);
                  }}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <FileVideo className="w-4 h-4 text-indigo-600" />
                    <span className="text-[11px] font-semibold text-slate-400 group-hover:text-indigo-600">
                      Use &rarr;
                    </span>
                  </div>
                  <div className="font-bold text-slate-800 text-sm mt-2">
                    {preset.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {preset.width}×{preset.height} &bull; {preset.duration}s &bull; {preset.codec.toUpperCase()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: OUTPUT CONFIGURATION                                              */}
      {/* ========================================================================= */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Source Metadata Review Card */}
          <div className="bg-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileVideo className="w-5 h-5 text-indigo-300" />
                <h3 className="font-bold text-base tracking-tight">Source Video Characteristics</h3>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-indigo-200 hover:text-white flex items-center gap-1 font-medium"
              >
                Change Source &rarr;
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="bg-white/10 rounded-xl p-3">
                <span className="text-[11px] uppercase tracking-wider text-indigo-300 block">
                  Resolution
                </span>
                <span className="text-sm sm:text-base font-bold">
                  {sourceData.width} × {sourceData.height}
                </span>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <span className="text-[11px] uppercase tracking-wider text-indigo-300 block">
                  Duration
                </span>
                <span className="text-sm sm:text-base font-bold">
                  {sourceData.duration} seconds
                </span>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <span className="text-[11px] uppercase tracking-wider text-indigo-300 block">
                  Bitrate
                </span>
                <span className="text-sm sm:text-base font-bold">
                  {(sourceData.bitrate / 1000000).toFixed(2)} Mbps
                </span>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <span className="text-[11px] uppercase tracking-wider text-indigo-300 block">
                  Codec / FPS
                </span>
                <span className="text-sm sm:text-base font-bold">
                  {sourceData.codec.toUpperCase()} @ {sourceData.framerate} fps
                </span>
              </div>
            </div>
          </div>

          {/* Target Transcoding Settings Form */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                Target Transcoding Configuration
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure requested target video settings for output encoding.
              </p>
            </div>

            {/* Target Presets */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Quick Output Presets:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {TARGET_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() =>
                      setTargetData({
                        o_codec: preset.codec,
                        o_width: preset.width,
                        o_height: preset.height,
                        o_bitrate: preset.bitrate,
                        o_framerate: preset.framerate,
                      })
                    }
                    className={`p-3 rounded-xl border text-left text-xs transition-colors ${
                      targetData.o_width === preset.width &&
                      targetData.o_height === preset.height &&
                      targetData.o_codec === preset.codec
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>{preset.name}</div>
                    <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                      {(preset.bitrate / 1000000).toFixed(1)} Mbps
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Input fields grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-3">
              {/* Output Codec */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Codec
                </label>
                <select
                  value={targetData.o_codec}
                  onChange={(e) =>
                    setTargetData({ ...targetData, o_codec: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                >
                  {supportedCodecs.map((codec) => (
                    <option key={codec} value={codec}>
                      {codec.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Output Resolution Width */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Output Width (px)
                </label>
                <input
                  type="number"
                  min="160"
                  max="7680"
                  value={targetData.o_width}
                  onChange={(e) =>
                    setTargetData({
                      ...targetData,
                      o_width: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Output Resolution Height */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Output Height (px)
                </label>
                <input
                  type="number"
                  min="120"
                  max="4320"
                  value={targetData.o_height}
                  onChange={(e) =>
                    setTargetData({
                      ...targetData,
                      o_height: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Output Bitrate */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Output Bitrate (bps)
                </label>
                <input
                  type="number"
                  min="50000"
                  max="100000000"
                  step="100000"
                  value={targetData.o_bitrate}
                  onChange={(e) =>
                    setTargetData({
                      ...targetData,
                      o_bitrate: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  = {(targetData.o_bitrate / 1000000).toFixed(2)} Mbps
                </span>
              </div>

              {/* Output Framerate */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Output Framerate (fps)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  step="0.1"
                  value={targetData.o_framerate}
                  onChange={(e) =>
                    setTargetData({
                      ...targetData,
                      o_framerate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Validation warning alerts */}
            {validationWarnings.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                <span className="font-bold block">Configuration Notices:</span>
                {validationWarnings.map((warn, i) => (
                  <p key={i}>&bull; {warn}</p>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
              >
                &larr; Back to Source
              </button>

              <button
                type="button"
                onClick={handlePredict}
                disabled={predicting}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-xs shadow-indigo-600/20 inline-flex items-center gap-2 disabled:opacity-50"
              >
                {predicting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Computing Prediction...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Predict Transcoding Time &rarr;
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: PREDICTION RESULT DISPLAY                                         */}
      {/* ========================================================================= */}
      {step === 3 && predictionResult && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-10 shadow-xs space-y-8 text-center">
            {/* Header pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Machine Learning Prediction Complete
            </div>

            {/* Primary Time Highlight */}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Estimated Transcoding Duration
              </div>
              <div className="text-5xl sm:text-6xl font-black tracking-tight text-indigo-950">
                {predictionResult.prediction.estimated_time_seconds.toFixed(2)}{' '}
                <span className="text-2xl sm:text-3xl font-semibold text-slate-400">
                  seconds
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium">
                Formatted:{' '}
                <strong className="text-slate-800">
                  {predictionResult.prediction.estimated_time_formatted}
                </strong>{' '}
                &bull; Model: {predictionResult.prediction.model_name}
              </p>
            </div>

            {/* Performance Context Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left">
                <span className="text-xs text-slate-400 block font-medium">
                  Source Duration
                </span>
                <span className="text-lg font-bold text-slate-800">
                  {sourceData.duration} s
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left">
                <span className="text-xs text-slate-400 block font-medium">
                  Realtime Factor
                </span>
                <span className="text-lg font-bold text-indigo-600">
                  {(
                    predictionResult.prediction.estimated_time_seconds /
                    Math.max(sourceData.duration, 1)
                  ).toFixed(2)}
                  ×
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left">
                <span className="text-xs text-slate-400 block font-medium">
                  Model MAE
                </span>
                <span className="text-lg font-bold text-slate-800">
                  &plusmn; 1.80 s
                </span>
              </div>
            </div>

            {/* Comparison Details Summary */}
            <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-100 text-left max-w-2xl mx-auto space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Transcoding Job Summary
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Source Format:</span>
                  <span className="font-semibold text-slate-800">
                    {sourceData.width}×{sourceData.height} &bull;{' '}
                    {sourceData.codec.toUpperCase()} &bull;{' '}
                    {(sourceData.bitrate / 1000000).toFixed(1)} Mbps
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Target Format:</span>
                  <span className="font-semibold text-slate-800">
                    {targetData.o_width}×{targetData.o_height} &bull;{' '}
                    {targetData.o_codec.toUpperCase()} &bull;{' '}
                    {(targetData.o_bitrate / 1000000).toFixed(1)} Mbps
                  </span>
                </div>
              </div>
            </div>

            {/* Warning pills if any */}
            {predictionResult.warnings && predictionResult.warnings.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 max-w-2xl mx-auto text-left">
                <span className="font-bold block mb-1">Observation Warnings:</span>
                {predictionResult.warnings.map((w, i) => (
                  <p key={i}>&bull; {w}</p>
                ))}
              </div>
            )}

            {/* Scientific Disclaimer */}
            <div className="p-4 rounded-2xl bg-slate-50 text-[11px] text-slate-500 max-w-2xl mx-auto text-left border border-slate-100">
              <strong className="text-slate-700">Experimental Notice:</strong> The
              prediction is calculated using an XGBoost model trained on benchmark
              data recorded with FFmpeg 4 on an Intel Core i7-3720QM system. Actual
              processing time will vary based on hardware concurrency, GPU acceleration
              (e.g., NVENC/QuickSync), and encoder presets.
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-xs inline-flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Analyze Another Video
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Adjust Target Settings
              </button>

              {savedToHistory && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold">
                  <Check className="w-4 h-4" />
                  Saved to History
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
