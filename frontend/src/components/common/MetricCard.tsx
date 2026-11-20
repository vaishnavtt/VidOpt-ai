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
    iconBg: 'bg-indigo-50 text-indigo-600',
    border: 'border-indigo-100',
  },
  emerald: {
    iconBg: 'bg-emerald-50 text-emerald-600',
    border: 'border-emerald-100',
  },
  amber: {
    iconBg: 'bg-amber-50 text-amber-600',
    border: 'border-amber-100',
  },
  violet: {
    iconBg: 'bg-violet-50 text-violet-600',
    border: 'border-violet-100',
  },
  slate: {
    iconBg: 'bg-slate-100 text-slate-600',
    border: 'border-slate-200',
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
    <div className={`p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between`}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <div className={`p-2.5 rounded-xl ${style.iconBg}`}>
          <Icon className="w-4 h-4 stroke-[2.2]" />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </span>
          {unit && (
            <span className="text-sm font-medium text-slate-500">
              {unit}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {badge && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <span className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
            {badge}
          </span>
        </div>
      )}
    </div>
  );
};
