import React, { useState, useEffect, useRef } from 'react';
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
  Check,
  RefreshCw,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {
  analyzeVideo,
  configureTranscoding,
  predictMetadata,
  getOptions,
  checkHealth,
} from '../services/api';
import { savePredictionToHistory } from '../utils/history';
import { StaggeredText } from '../components/common/StaggeredText';
import type {
  MetadataPredictionRequest,
  PredictionResponse,
  VideoMetadataResponse,
} from '../types';

// Preset configurations for instant testing and exploration
const SOURCE_PRESETS = [
  {
    name: '1080p FHD (2 min, H.264)',
    duration: 120,
    width: 1920,
    height: 1080,
    bitrate: 5000000,
    framerate: 29.97,
    codec: 'h264',
    frames: 3596,
    size_bytes: 75000000,
  },
  {
    name: '720p HD (1 min, H.264)',
    duration: 60,
    width: 1280,
    height: 720,
    bitrate: 2500000,
    framerate: 30,
    codec: 'h264',
    frames: 1800,
    size_bytes: 18750000,
  },
  {
    name: '4K UHD (30 sec, H.264)',
    duration: 30,
    width: 3840,
    height: 2160,
    bitrate: 15000000,
    framerate: 60,
    codec: 'h264',
    frames: 1800,
    size_bytes: 56250000,
  },
  {
    name: '480p SD (3 min, MPEG-4)',
    duration: 180,
    width: 854,
    height: 480,
    bitrate: 1000000,
    framerate: 25,
    codec: 'mpeg4',
    frames: 4500,
    size_bytes: 22500000,
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
  const [mounted, setMounted] = useState(false);

  // File input ref for Browse button
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Source metadata state
  const [sourceData, setSourceData] = useState<{
    videoName: string;
    duration: number;
    width: number;
    height: number;
    bitrate: number;
    framerate: number;
    codec: string;
    frames?: number;
    size_bytes?: number;
    format_name?: string;
  }>({
    videoName: 'sample_video.mp4',
    duration: 120,
    width: 1920,
    height: 1080,
    bitrate: 5000000,
    framerate: 29.97,
    codec: 'h264',
    frames: 3596,
    size_bytes: 75000000,
    format_name: 'mov,mp4,m4a,3gp,3g2,mj2',
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
  const [checkingHealth, setCheckingHealth] = useState<boolean>(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [savedToHistory, setSavedToHistory] = useState<boolean>(false);

  // Prediction result state
  const [predictionResult, setPredictionResult] = useState<PredictionResponse | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(timer);
  }, []);

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

  // Re-check server health to clear missing notice if FFprobe is installed
  const handleCheckHealth = async () => {
    setCheckingHealth(true);
    try {
      const health = await checkHealth();
      if (health.ffprobe_available) {
        setFfprobeMissingNotice(false);
        setErrorMessage(null);
      }
    } catch {
      // Ignore
    } finally {
      setCheckingHealth(false);
    }
  };

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
          frames: data.frames,
          size_bytes: data.size_bytes || file.size,
          format_name: data.format_name,
        });
        setStep(2);
      }
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 503) {
        setFfprobeMissingNotice(true);
        setSourceData((prev) => ({ ...prev, videoName: file.name }));
      } else {
        setErrorMessage(
          typeof detail === 'string'
            ? detail
            : 'Failed to upload and analyze video file. Please check file format.'
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

  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes <= 0) return 'Unknown';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto">
      {/* Central Hero Header */}
      <div className="space-y-4 mb-8 sm:mb-12">
        {/* Badge: delay 320ms, translateY(1.25rem) to 0, opacity 0 to 1 */}
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(1.25rem)',
            transition: 'opacity 700ms cubic-bezier(0.2, 0, 0, 1) 320ms, transform 700ms cubic-bezier(0.2, 0, 0, 1) 320ms',
          }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.16)] backdrop-blur-md shadow-lg"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px] font-semibold tracking-widest uppercase text-cyan-300">
            AI-POWERED TRANSCODING INTELLIGENCE
          </span>
        </div>

        {/* Main Heading: word-by-word reveal starting at 480ms */}
        <div className="pt-2">
          <StaggeredText
            as="h1"
            type="heading"
            baseDelayMs={480}
            text="Predict Video Transcoding Time with AI"
            className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-[#eef0f6] leading-[1.12]"
          />
        </div>

        {/* Supporting text: word-by-word reveal starting at 1150ms */}
        <div>
          <StaggeredText
            as="p"
            type="supporting"
            baseDelayMs={1150}
            text="Analyze your video, configure output settings, and estimate transcoding duration using machine learning."
            className="text-sm sm:text-base text-[#b9becf] max-w-2xl mx-auto font-normal leading-relaxed"
          />
        </div>
      </div>

      {/* Main Interaction Glass Interface: delay 1450ms */}
      <div
        className="w-full"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(1.25rem)',
          transition: 'opacity 700ms cubic-bezier(0.2, 0, 0, 1) 1450ms, transform 700ms cubic-bezier(0.2, 0, 0, 1) 1450ms',
        }}
      >
        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/30 backdrop-blur-md flex items-start justify-between gap-3 text-rose-200 text-xs sm:text-sm text-left">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-100">Upload Issue</p>
                <p className="text-xs text-rose-300/90 mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                fileInputRef.current?.click();
              }}
              className="px-3 py-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-medium border border-rose-500/30 shrink-0 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: SOURCE VIDEO UPLOAD & PRESETS                                     */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Notice if FFprobe not detected */}
            {ffprobeMissingNotice && (
              <div className="p-5 rounded-2xl bg-amber-950/50 border border-amber-500/30 backdrop-blur-md text-amber-200 text-xs sm:text-sm space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-amber-300">
                    <Info className="w-4 h-4 text-amber-400 shrink-0" />
                    FFprobe binary not detected in server PATH
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckHealth}
                    disabled={checkingHealth}
                    className="px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium text-xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${checkingHealth ? 'animate-spin' : ''}`} />
                    Check Again
                  </button>
                </div>
                <p className="text-amber-200/80 leading-relaxed text-xs">
                  Direct header extraction requires FFmpeg/FFprobe. You can continue by selecting a preset below to run predictions immediately!
                </p>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-full bg-amber-400 text-black font-semibold text-xs transition-transform hover:scale-[1.02] cursor-pointer"
                >
                  Configure Output Target &rarr;
                </button>
              </div>
            )}

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`rounded-3xl border-2 border-dashed p-8 sm:p-14 text-center transition-all backdrop-blur-2xl ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-500/10 shadow-2xl shadow-cyan-500/20 scale-[1.01]'
                  : 'border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.05)] hover:border-cyan-400/60 hover:bg-[rgba(255,255,255,0.07)]'
              }`}
            >
              <input
                ref={fileInputRef}
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
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.18)] text-cyan-300 flex items-center justify-center shadow-xl">
                  <Upload className="w-7 h-7 stroke-[1.8]" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-medium text-[#eef0f6]">
                    {uploading
                      ? `Uploading & Inspecting Video... ${uploadProgress}%`
                      : 'Drop your video here or browse'}
                  </p>
                  <p className="text-xs text-[#b9becf]">
                    Supports MP4, MKV, AVI, MOV, WEBM, FLV (up to 500 MB)
                  </p>
                </div>

                {uploading && (
                  <div className="w-full max-w-xs mx-auto space-y-1.5 pt-1">
                    <div className="w-full bg-[rgba(255,255,255,0.1)] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-400 to-violet-500 h-2 rounded-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#b9becf] font-medium">
                      {uploadProgress}% processed
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-6 py-3 rounded-full bg-white text-[#2f2f33] hover:bg-[#eef0f6] font-medium text-xs tracking-tight shadow-lg shadow-white/10 hover:shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  Browse Video Files
                </button>
              </div>
            </div>

            {/* Benchmark Preset Selector */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] backdrop-blur-xl space-y-4 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#b9becf]">
                    Or Test Instantly with Benchmark Presets
                  </h3>
                  <p className="text-xs text-[#b9becf]/70 mt-0.5">
                    Standard video resolution and duration profiles from our 68,784 training samples
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
                        frames: preset.frames,
                        size_bytes: preset.size_bytes,
                        format_name: 'mp4',
                      });
                      setStep(2);
                    }}
                    className="p-4 rounded-2xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] hover:border-cyan-400/50 hover:bg-[rgba(255,255,255,0.08)] text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <FileVideo className="w-4 h-4 text-cyan-400" />
                      <span className="text-[11px] font-medium text-[#b9becf] group-hover:text-cyan-300 transition-colors">
                        Use &rarr;
                      </span>
                    </div>
                    <div className="font-medium text-[#eef0f6] text-sm mt-2">
                      {preset.name}
                    </div>
                    <div className="text-xs text-[#b9becf]/70 mt-1">
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
          <div className="space-y-6 text-left">
            {/* Source Video Metadata Review Card */}
            <div className="rounded-3xl p-6 sm:p-8 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.14)] backdrop-blur-2xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <FileVideo className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-[#eef0f6]">
                      Extracted Video Characteristics
                    </h3>
                    <p className="text-xs text-[#b9becf] font-mono">{sourceData.videoName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-cyan-300 hover:text-white px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.14)] transition-colors cursor-pointer"
                >
                  Change Source &rarr;
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
                <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-3">
                  <span className="text-[10px] uppercase tracking-wider text-[#b9becf] block">
                    Resolution
                  </span>
                  <span className="text-sm font-bold text-[#eef0f6]">
                    {sourceData.width} × {sourceData.height}
                  </span>
                </div>
                <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-3">
                  <span className="text-[10px] uppercase tracking-wider text-[#b9becf] block">
                    Duration
                  </span>
                  <span className="text-sm font-bold text-[#eef0f6]">
                    {sourceData.duration} s
                  </span>
                </div>
                <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-3">
                  <span className="text-[10px] uppercase tracking-wider text-[#b9becf] block">
                    Bitrate
                  </span>
                  <span className="text-sm font-bold text-[#eef0f6]">
                    {(sourceData.bitrate / 1000000).toFixed(2)} Mbps
                  </span>
                </div>
                <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-3">
                  <span className="text-[10px] uppercase tracking-wider text-[#b9becf] block">
                    Codec / FPS
                  </span>
                  <span className="text-sm font-bold text-[#eef0f6]">
                    {sourceData.codec.toUpperCase()} @ {sourceData.framerate} fps
                  </span>
                </div>
                <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-3">
                  <span className="text-[10px] uppercase tracking-wider text-[#b9becf] block">
                    Total Frames
                  </span>
                  <span className="text-sm font-bold text-[#eef0f6]">
                    {sourceData.frames ? sourceData.frames.toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-3">
                  <span className="text-[10px] uppercase tracking-wider text-[#b9becf] block">
                    File Size
                  </span>
                  <span className="text-sm font-bold text-[#eef0f6]">
                    {formatFileSize(sourceData.size_bytes)}
                  </span>
                </div>
              </div>
            </div>

            {/* Target Transcoding Settings Form */}
            <div className="rounded-3xl p-6 sm:p-8 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.14)] backdrop-blur-2xl shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[#eef0f6] flex items-center gap-2">
                  <Settings className="w-5 h-5 text-cyan-400" />
                  Target Transcoding Configuration
                </h3>
                <p className="text-xs text-[#b9becf] mt-0.5">
                  Configure output encoding settings to compute model prediction.
                </p>
              </div>

              {/* Quick Target Presets */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#b9becf] uppercase tracking-wider">
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
                      className={`p-3 rounded-2xl border text-left text-xs transition-all cursor-pointer ${
                        targetData.o_width === preset.width &&
                        targetData.o_height === preset.height &&
                        targetData.o_codec === preset.codec
                          ? 'border-cyan-400 bg-cyan-500/15 text-[#eef0f6] font-bold shadow-md shadow-cyan-500/10'
                          : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-[#b9becf] hover:bg-[rgba(255,255,255,0.08)]'
                      }`}
                    >
                      <div>{preset.name}</div>
                      <div className="text-[11px] text-[#b9becf]/70 font-normal mt-0.5">
                        {(preset.bitrate / 1000000).toFixed(1)} Mbps
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
                {/* Output Codec */}
                <div>
                  <label className="block text-xs font-semibold text-[#b9becf] uppercase tracking-wider mb-1.5">
                    Target Codec
                  </label>
                  <select
                    value={targetData.o_codec}
                    onChange={(e) =>
                      setTargetData({ ...targetData, o_codec: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)] text-[#eef0f6] text-sm focus:ring-2 focus:ring-cyan-400 focus:outline-hidden"
                  >
                    {supportedCodecs.map((codec) => (
                      <option key={codec} value={codec} className="bg-[#04050c] text-white">
                        {codec.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Output Width */}
                <div>
                  <label className="block text-xs font-semibold text-[#b9becf] uppercase tracking-wider mb-1.5">
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
                    className="w-full px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)] text-[#eef0f6] text-sm focus:ring-2 focus:ring-cyan-400 focus:outline-hidden"
                  />
                </div>

                {/* Output Height */}
                <div>
                  <label className="block text-xs font-semibold text-[#b9becf] uppercase tracking-wider mb-1.5">
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
                    className="w-full px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)] text-[#eef0f6] text-sm focus:ring-2 focus:ring-cyan-400 focus:outline-hidden"
                  />
                </div>

                {/* Output Bitrate */}
                <div>
                  <label className="block text-xs font-semibold text-[#b9becf] uppercase tracking-wider mb-1.5">
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
                    className="w-full px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)] text-[#eef0f6] text-sm focus:ring-2 focus:ring-cyan-400 focus:outline-hidden"
                  />
                  <span className="text-[11px] text-[#b9becf]/70 mt-1 block">
                    = {(targetData.o_bitrate / 1000000).toFixed(2)} Mbps
                  </span>
                </div>

                {/* Output Framerate */}
                <div>
                  <label className="block text-xs font-semibold text-[#b9becf] uppercase tracking-wider mb-1.5">
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
                    className="w-full px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.08)] text-[#eef0f6] text-sm focus:ring-2 focus:ring-cyan-400 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Validation Warnings */}
              {validationWarnings.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 space-y-1">
                  <span className="font-semibold block text-amber-300">Configuration Notices:</span>
                  {validationWarnings.map((warn, i) => (
                    <p key={i}>&bull; {warn}</p>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.1)]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-full border border-[rgba(255,255,255,0.16)] text-[#b9becf] font-medium text-xs hover:bg-[rgba(255,255,255,0.08)] hover:text-white transition-colors cursor-pointer"
                >
                  &larr; Back to Source
                </button>

                <button
                  type="button"
                  onClick={handlePredict}
                  disabled={predicting}
                  className="px-7 py-3 rounded-full bg-white text-[#2f2f33] hover:bg-[#eef0f6] font-medium text-xs tracking-tight shadow-xl shadow-white/10 hover:shadow-cyan-400/20 inline-flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {predicting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#2f2f33] border-t-transparent rounded-full animate-spin" />
                      Computing Prediction...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
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
            <div className="rounded-3xl p-8 sm:p-12 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.14)] backdrop-blur-2xl shadow-2xl space-y-8 text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Machine Learning Prediction Complete
              </div>

              {/* Time Highlight */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#b9becf]">
                  Estimated Transcoding Duration
                </div>
                <div className="text-5xl sm:text-7xl font-light tracking-tight text-[#eef0f6]">
                  {predictionResult.prediction.estimated_time_seconds.toFixed(2)}{' '}
                  <span className="text-2xl sm:text-3xl font-light text-[#b9becf]">
                    seconds
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#b9becf] font-normal">
                  Formatted:{' '}
                  <strong className="text-white font-medium">
                    {predictionResult.prediction.estimated_time_formatted}
                  </strong>{' '}
                  &bull; Model: {predictionResult.prediction.model_name}
                </p>
              </div>

              {/* Performance Context Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto pt-2">
                <div className="p-4 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-left">
                  <span className="text-xs text-[#b9becf] block font-medium">
                    Source Duration
                  </span>
                  <span className="text-lg font-bold text-[#eef0f6]">
                    {sourceData.duration} s
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-left">
                  <span className="text-xs text-[#b9becf] block font-medium">
                    Realtime Factor
                  </span>
                  <span className="text-lg font-bold text-cyan-300">
                    {(
                      predictionResult.prediction.estimated_time_seconds /
                      Math.max(sourceData.duration, 1)
                    ).toFixed(2)}
                    ×
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-left">
                  <span className="text-xs text-[#b9becf] block font-medium">
                    Model MAE
                  </span>
                  <span className="text-lg font-bold text-[#eef0f6]">
                    &plusmn; 1.80 s
                  </span>
                </div>
              </div>

              {/* Job Summary */}
              <div className="p-6 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-left max-w-2xl mx-auto space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#b9becf]">
                  Transcoding Job Summary
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#b9becf]/70 block">Source Format:</span>
                    <span className="font-medium text-[#eef0f6]">
                      {sourceData.width}×{sourceData.height} &bull;{' '}
                      {sourceData.codec.toUpperCase()} &bull;{' '}
                      {(sourceData.bitrate / 1000000).toFixed(1)} Mbps
                    </span>
                  </div>
                  <div>
                    <span className="text-[#b9becf]/70 block">Target Format:</span>
                    <span className="font-medium text-[#eef0f6]">
                      {targetData.o_width}×{targetData.o_height} &bull;{' '}
                      {targetData.o_codec.toUpperCase()} &bull;{' '}
                      {(targetData.o_bitrate / 1000000).toFixed(1)} Mbps
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-3 rounded-full bg-white text-[#2f2f33] hover:bg-[#eef0f6] font-medium text-xs tracking-tight shadow-lg shadow-white/10 hover:shadow-cyan-400/20 inline-flex items-center gap-2 cursor-pointer transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Analyze Another Video
                </button>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-3 rounded-full border border-[rgba(255,255,255,0.18)] text-[#eef0f6] font-medium text-xs hover:bg-[rgba(255,255,255,0.08)] transition-colors cursor-pointer"
                >
                  Adjust Target Settings
                </button>

                {savedToHistory && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-medium border border-emerald-500/30">
                    <Check className="w-3.5 h-3.5" />
                    Saved to History
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer: delay 1650ms */}
      <footer
        className="mt-12 text-center text-xs text-[#b9becf]/60"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(1.25rem)',
          transition: 'opacity 700ms cubic-bezier(0.2, 0, 0, 1) 1650ms, transform 700ms cubic-bezier(0.2, 0, 0, 1) 1650ms',
        }}
      >
        <p>
          Tuned XGBoost Ensemble &bull; 68,784 Measurements &bull; MAE 1.60s &bull; R² 0.9356 &bull; UC Irvine Benchmark Dataset
        </p>
      </footer>
    </div>
  );
};
