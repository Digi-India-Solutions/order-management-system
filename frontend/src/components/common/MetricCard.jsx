import React from 'react';

export function MetricCard({ title, value, change, icon: Icon, color = 'blue', subtitle }) {
  const numberColors = {
    blue: 'text-brand-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    purple: 'text-purple-600',
    pink: 'text-pink-600',
    cyan: 'text-cyan-600',
    rose: 'text-rose-600'
  }[color] || 'text-slate-900';

  const iconStyles = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    pink: 'bg-pink-50 text-pink-600 border-pink-100',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100'
  }[color] || 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs transition hover:border-slate-300 hover:shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${iconStyles}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <div className={`text-3xl font-extrabold tracking-tight ${numberColors}`}>{value}</div>
        {change && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {change}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-2 text-xs text-slate-400 font-medium">{subtitle}</p>}
    </div>
  );
}
