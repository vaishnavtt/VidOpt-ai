import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  description?: string;
  icon: LucideIcon;
  variant?: 'indigo' | 'emerald' | 'amber' | 'violet' | 'slate';
  badge?: string;
}

const variantStyles = {
  indigo: {
    iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  },
  emerald: {
    iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  },
  amber: {
    iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  },
  violet: {
    iconBg: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
  },
  slate: {
    iconBg: 'bg-white/10 text-slate-300 border border-white/15',
  },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  description,
  icon: Icon,
  variant = 'indigo',
  badge,
}) => {
  const style = variantStyles[variant];

  return (
    <div className="p-6 rounded-3xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] backdrop-blur-xl shadow-xl hover:border-cyan-500/30 transition-all flex flex-col justify-between group">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#b9becf]">
          {label}
        </span>
        <div className={`p-2.5 rounded-2xl ${style.iconBg} backdrop-blur-md`}>
          <Icon className="w-4 h-4 stroke-[2]" />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-[#eef0f6] group-hover:text-white transition-colors">
            {value}
          </span>
          {unit && (
            <span className="text-sm font-medium text-[#b9becf]">
              {unit}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-[#b9becf]/80 mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {badge && (
        <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.08)]">
          <span className="text-[11px] font-medium text-[#eef0f6] bg-[rgba(255,255,255,0.08)] px-2.5 py-1 rounded-full border border-[rgba(255,255,255,0.14)]">
            {badge}
          </span>
        </div>
      )}
    </div>
  );
};
