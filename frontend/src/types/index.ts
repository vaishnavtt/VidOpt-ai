export interface MetadataPredictionRequest {
  duration: number;
  width: number;
  height: number;
  bitrate: number;
  framerate: number;
  codec: string;
  o_codec: string;
  o_width: number;
  o_height: number;
  o_bitrate: number;
  o_framerate: number;
}

export interface FullPredictionRequest extends MetadataPredictionRequest {
  i: number;
  p: number;
  b: number;
  frames: number;
  i_size: number;
  p_size: number;
  size: number;
}

export interface PredictionDetail {
  estimated_time_seconds: number;
  estimated_time_formatted: string;
  model_name: string;
  prediction_type: string;
}

export interface PredictionResponse {
  success: boolean;
  prediction: PredictionDetail;
  message: string;
  warnings: string[];
}

export interface HealthResponse {
  status: string;
  api_version: string;
  model_full_ready: boolean;
  model_metadata_ready: boolean;
  ffprobe_available: boolean;
  model_name: string;
}

export interface ModelInfoResponse {
  full_model_ready: boolean;
  metadata_model_ready: boolean;
  full_model_features: {
    numeric: string[];
    categorical: string[];
    total: number;
  };
  metadata_model_features: {
    numeric: string[];
    categorical: string[];
    total: number;
  };
  limitations: string[];
}

export interface OptionsResponse {
  supported_codecs: string[];
  supported_input_extensions: string[];
  max_upload_size_bytes: number;
  max_upload_size_mb: number;
}

export interface VideoMetadataResponse {
  success: boolean;
  filename: string;
  duration?: number;
  width?: number;
  height?: number;
  codec?: string;
  bitrate?: number;
  framerate?: number;
  size_bytes?: number;
  format_name?: string;
  message: string;
}

export interface TranscodingConfigRequest {
  duration: number;
  width: number;
  height: number;
  bitrate: number;
  framerate: number;
  codec: string;
  o_codec: string;
  o_width: number;
  o_height: number;
  o_bitrate: number;
  o_framerate: number;
}

export interface TranscodingConfigResponse {
  success: boolean;
  config?: {
    source: Record<string, any>;
    output: Record<string, any>;
  };
  message: string;
  warnings: string[];
}

export interface PredictionHistoryItem {
  id: string;
  timestamp: string;
  videoName: string;
  sourceResolution: string;
  outputResolution: string;
  sourceCodec: string;
  outputCodec: string;
  durationSeconds: number;
  estimatedTimeSeconds: number;
  estimatedTimeFormatted: string;
  modelName: string;
  predictionType: string;
  realtimeFactor: number;
}
