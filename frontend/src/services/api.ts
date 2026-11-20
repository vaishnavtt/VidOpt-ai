import axios from 'axios';
import type {
  HealthResponse,
  ModelInfoResponse,
  OptionsResponse,
  MetadataPredictionRequest,
  FullPredictionRequest,
  PredictionResponse,
  VideoMetadataResponse,
  TranscodingConfigRequest,
  TranscodingConfigResponse,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const checkHealth = async (): Promise<HealthResponse> => {
  const response = await api.get<HealthResponse>('/health');
  return response.data;
};

export const getModelInfo = async (): Promise<ModelInfoResponse> => {
  const response = await api.get<ModelInfoResponse>('/model/info');
  return response.data;
};

export const getOptions = async (): Promise<OptionsResponse> => {
  const response = await api.get<OptionsResponse>('/options');
  return response.data;
};

export const predictMetadata = async (
  payload: MetadataPredictionRequest
): Promise<PredictionResponse> => {
  const response = await api.post<PredictionResponse>('/predict', payload);
  return response.data;
};

export const predictFull = async (
  payload: FullPredictionRequest
): Promise<PredictionResponse> => {
  const response = await api.post<PredictionResponse>('/predict/full', payload);
  return response.data;
};

export const configureTranscoding = async (
  payload: TranscodingConfigRequest
): Promise<TranscodingConfigResponse> => {
  const response = await api.post<TranscodingConfigResponse>(
    '/transcoding/configure',
    payload
  );
  return response.data;
};

export const analyzeVideo = async (
  file: File,
  onUploadProgress?: (progressEvent: any) => void
): Promise<VideoMetadataResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<VideoMetadataResponse>('/video/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });

  return response.data;
};

export default api;
