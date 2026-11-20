import type { PredictionHistoryItem } from '../types';

const HISTORY_KEY = 'vidopt_prediction_history_v1';
const MAX_HISTORY_ITEMS = 50;

export const getPredictionHistory = (): PredictionHistoryItem[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to read prediction history from localStorage:', error);
    return [];
  }
};

export const savePredictionToHistory = (
  item: Omit<PredictionHistoryItem, 'id' | 'timestamp'>
): PredictionHistoryItem => {
  try {
    const history = getPredictionHistory();
    const newItem: PredictionHistoryItem = {
      ...item,
      id: `pred_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    const updated = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return newItem;
  } catch (error) {
    console.error('Failed to save prediction to history:', error);
    return {
      ...item,
      id: `pred_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
  }
};

export const removePredictionFromHistory = (id: string): PredictionHistoryItem[] => {
  try {
    const history = getPredictionHistory();
    const updated = history.filter((item) => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Failed to remove history item:', error);
    return [];
  }
};

export const clearPredictionHistory = (): void => {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear prediction history:', error);
  }
};
