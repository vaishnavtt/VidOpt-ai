import React, { useEffect, useState } from 'react';
import { Menu, Activity, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { checkHealth } from '../../services/api';
import type { HealthResponse } from '../../types';

interface HeaderProps {
  title: string;
  subtitle: string;
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onMenuClick }) => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await checkHealth();
      setHealth(data);
    } catch (err) {
      setError(true);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-18 bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
            {title}
          </h1>
          <p className="text-xs text-slate-500 font-normal hidden sm:block">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Backend Status indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium bg-slate-50">
          {loading && !health ? (
            <div className="flex items-center gap-2 text-slate-500">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
              <span className="hidden sm:inline">Checking API...</span>
            </div>
          ) : error || !health ? (
            <div className="flex items-center gap-1.5 text-rose-600">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Backend Offline</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-700 font-semibold">
                API Online
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 font-normal hidden md:inline">
                {health.model_metadata_ready ? 'ML Models Ready' : 'Models Loading'}
              </span>
            </div>
          )}
        </div>

        {health && (
          <div
            className={`hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border ${
              health.ffprobe_available
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
            title={
              health.ffprobe_available
                ? 'FFprobe binary detected and available for video file metadata extraction'
                : 'FFprobe binary not in system PATH. Manual input and predictions remain 100% functional.'
            }
          >
            <Activity className="w-3 h-3" />
            <span>FFprobe: {health.ffprobe_available ? 'Available' : 'Not in PATH'}</span>
          </div>
        )}
      </div>
    </header>
  );
};
