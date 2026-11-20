import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  History,
  Trash2,
  Clock,
  Video,
  Search,
  ArrowRight,
  Sparkles,
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
    <div className="relative min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.14)] backdrop-blur-2xl shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold mb-2">
            <History className="w-3.5 h-3.5" />
            Transcoding Records
          </div>
          <h2 className="text-2xl font-medium tracking-tight text-[#eef0f6]">
            Prediction History
          </h2>
          <p className="text-xs text-[#b9becf] mt-0.5">
            Locally stored previous transcoding calculations ({history.length} records).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#b9becf] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by name, resolution, codec..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded-full border border-[rgba(255,255,255,0.15)] text-xs font-medium focus:ring-2 focus:ring-cyan-400 focus:outline-hidden w-64 bg-[rgba(255,255,255,0.06)] text-[#eef0f6] placeholder-[#b9becf]/60"
            />
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 font-medium text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* History Table / Empty State */}
      {filteredHistory.length === 0 ? (
        <div className="rounded-3xl p-12 sm:p-16 text-center space-y-4 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.14)] backdrop-blur-2xl shadow-xl">
          <div className="w-16 h-16 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.16)] text-cyan-300 flex items-center justify-center mx-auto shadow-xl">
            <Clock className="w-7 h-7 stroke-[1.8]" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="font-medium text-[#eef0f6] text-lg">
              {searchQuery ? 'No matching predictions found' : 'No predictions yet'}
            </h3>
            <p className="text-xs text-[#b9becf] leading-relaxed">
              {searchQuery
                ? 'Try a different filter term or reset the search input.'
                : 'Upload a video or select a preset to generate your first ML transcoding time prediction.'}
            </p>
          </div>
          {!searchQuery && (
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#2f2f33] hover:bg-[#eef0f6] font-medium text-xs shadow-lg transition-all cursor-pointer"
            >
              <Video className="w-4 h-4" />
              Analyze Video Now &rarr;
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] backdrop-blur-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[rgba(255,255,255,0.04)] text-[#b9becf] uppercase tracking-wider font-semibold border-b border-[rgba(255,255,255,0.1)]">
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
              <tbody className="divide-y divide-[rgba(255,255,255,0.08)]">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                    <td className="px-6 py-4 font-medium text-[#eef0f6]">
                      <div className="truncate max-w-xs">{item.videoName}</div>
                      <div className="text-[11px] text-[#b9becf]/70 font-normal">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-[#b9becf]">
                      {item.sourceResolution} &rarr;{' '}
                      <span className="font-semibold text-[#eef0f6]">
                        {item.outputResolution}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-[#b9becf]">
                      {item.sourceCodec} &rarr; {item.outputCodec}
                    </td>
                    <td className="px-6 py-4 font-medium text-[#eef0f6]">
                      {item.durationSeconds} s
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-cyan-300 text-sm">
                        {item.estimatedTimeSeconds.toFixed(2)} s
                      </span>
                      <span className="block text-[11px] text-[#b9becf]/70">
                        {item.modelName}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-[#eef0f6]">
                      {item.realtimeFactor}×
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-[#b9becf] hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
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
