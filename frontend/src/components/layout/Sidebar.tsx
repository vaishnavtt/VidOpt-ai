import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  History,
  BrainCircuit,
  Info,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Overview & key metrics',
    },
    {
      to: '/analyze',
      label: 'Analyze Video',
      icon: Video,
      description: 'Upload & predict time',
      badge: 'Core',
    },
    {
      to: '/history',
      label: 'Prediction History',
      icon: History,
      description: 'Recent estimates',
    },
    {
      to: '/insights',
      label: 'Model Insights',
      icon: BrainCircuit,
      description: 'ML benchmarks & curves',
    },
    {
      to: '/about',
      label: 'About Project',
      icon: Info,
      description: 'Architecture & methodology',
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-18 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 flex items-center justify-center shadow-xs shadow-indigo-500/20 text-white">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-slate-900">
                  VidOpt<span className="text-indigo-600"> AI</span>
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Transcoding Intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Platform Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50/80 text-indigo-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-1.5 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="truncate text-left">
                        <div className="truncate">{item.label}</div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    {item.badge ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight
                        className={`w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity ${
                          isActive ? 'opacity-100 text-indigo-400' : ''
                        }`}
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer info box */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 m-3 rounded-2xl border">
          <div className="flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0 animate-pulse" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-slate-800">Engine: XGBoost</p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                GroupKFold trained on 68,784 transcoding measurements.
              </p>
              <a
                href="http://127.0.0.1:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 pt-1"
              >
                FastAPI Swagger <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
