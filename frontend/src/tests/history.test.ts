import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPredictionHistory,
  savePredictionToHistory,
  removePredictionFromHistory,
  clearPredictionHistory,
} from '../utils/history';

describe('Prediction History Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when no history exists', () => {
    const history = getPredictionHistory();
    expect(history).toEqual([]);
  });

  it('saves an item and retrieves it', () => {
    const item = {
      videoName: 'test.mp4',
      sourceResolution: '1920x1080',
      outputResolution: '1280x720',
      sourceCodec: 'H264',
      outputCodec: 'H264',
      durationSeconds: 120,
      estimatedTimeSeconds: 58.67,
      estimatedTimeFormatted: '58.67 seconds',
      modelName: 'Metadata XGBoost',
      predictionType: 'metadata_only',
      realtimeFactor: 0.49,
    };

    const saved = savePredictionToHistory(item);
    expect(saved.id).toBeDefined();
    expect(saved.timestamp).toBeDefined();

    const history = getPredictionHistory();
    expect(history.length).toBe(1);
    expect(history[0].videoName).toBe('test.mp4');
  });

  it('removes an individual item from history', () => {
    const saved = savePredictionToHistory({
      videoName: 'to_delete.mp4',
      sourceResolution: '1920x1080',
      outputResolution: '1280x720',
      sourceCodec: 'H264',
      outputCodec: 'H264',
      durationSeconds: 60,
      estimatedTimeSeconds: 30.5,
      estimatedTimeFormatted: '30.50 seconds',
      modelName: 'Metadata XGBoost',
      predictionType: 'metadata_only',
      realtimeFactor: 0.51,
    });

    expect(getPredictionHistory().length).toBe(1);
    removePredictionFromHistory(saved.id);
    expect(getPredictionHistory().length).toBe(0);
  });

  it('clears all history items', () => {
    savePredictionToHistory({
      videoName: 'item1.mp4',
      sourceResolution: '1920x1080',
      outputResolution: '1280x720',
      sourceCodec: 'H264',
      outputCodec: 'H264',
      durationSeconds: 60,
      estimatedTimeSeconds: 30,
      estimatedTimeFormatted: '30s',
      modelName: 'Metadata XGBoost',
      predictionType: 'metadata_only',
      realtimeFactor: 0.5,
    });

    expect(getPredictionHistory().length).toBe(1);
    clearPredictionHistory();
    expect(getPredictionHistory().length).toBe(0);
  });
});
