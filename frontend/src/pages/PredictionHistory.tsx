import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  History,
  Trash2,
  ExternalLink,
  Clock,
  Video,
  ArrowRight,
  Search,
  Filter,
} from 'lucide-react';
import {
  getPredictionHistory,
  removePredictionFromHistory,
  clearPredictionHistory,
} from '../utils/history';
import type { PredictionHistoryItem } from '../types';

export const PredictionHistory: React.FC = () => {
  const [history, setHistory] = useState<PredictionHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setHistory(getPredictionHistory());
  }, []);

  const handleDelete = (id: string) => {
    const updated = removePredictionFromHistory(id);
    setHistory(updated);
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all prediction history?')) {
      clearPredictionHistory();
      setHistory([]);
    }
  };

  const filteredHistory = history.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.videoName.toLowerCase().includes(q) ||
      item.sourceResolution.toLowerCase().includes(q) ||
      item.outputResolution.toLowerCase().includes(q) ||
      item.sourceCodec.toLowerCase().includes(q) ||
      item.outputCodec.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Transcoding Prediction History
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Locally stored previous prediction calculations ({history.length} records).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by name, resolution, codec..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden w-64 bg-slate-50"
            />
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs transition-colors inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear History
            </button>
          )}
        </div>
      </div>

      {/* History Table / Empty State */}
      {filteredHistory.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 stroke-[1.8]" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="font-bold text-slate-800 text-base">
              {searchQuery ? 'No matching predictions found' : 'No predictions yet'}
            </h3>
            <p className="text-xs text-slate-500">
              {searchQuery
                ? 'Try a different filter term or reset the search input.'
                : 'Run your first video transcoding prediction to see historical records here.'}
            </p>
          </div>
          {!searchQuery && (
            <Link
              to="/analyze"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Video className="w-4 h-4" />
              Analyze Video Now &rarr;
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Video / Job</th>
                  <th className="px-6 py-4">Source &rarr; Target</th>
                  <th className="px-6 py-4">Codec</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Predicted Time</th>
                  <th className="px-6 py-4">Ratio</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      <div className="truncate max-w-xs">{item.videoName}</div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {item.sourceResolution} &rarr;{' '}
                      <span className="font-bold text-slate-800">
                        {item.outputResolution}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {item.sourceCodec} &rarr; {item.outputCodec}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {item.durationSeconds} s
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-indigo-600 text-sm">
                        {item.estimatedTimeSeconds.toFixed(2)} s
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        {item.modelName}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {item.realtimeFactor}×
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
