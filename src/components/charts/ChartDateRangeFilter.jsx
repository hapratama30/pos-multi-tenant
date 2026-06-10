import React from 'react';

export default function ChartDateRangeFilter({
  dateFrom,
  dateTo,
  onFromChange,
  onToChange,
  onBulanIni,
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 mb-4">
      <label className="flex-1 min-w-[130px]">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dari</span>
        <input
          type="date"
          value={dateFrom}
          max={dateTo || undefined}
          onChange={(e) => onFromChange(e.target.value)}
          className="mt-1 w-full text-sm font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-teal-400"
        />
      </label>
      <label className="flex-1 min-w-[130px]">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sampai</span>
        <input
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={(e) => onToChange(e.target.value)}
          className="mt-1 w-full text-sm font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-teal-400"
        />
      </label>
      {onBulanIni && (
        <button
          type="button"
          onClick={onBulanIni}
          className="shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-100 hover:bg-teal-100 transition-colors"
        >
          Bulan ini
        </button>
      )}
    </div>
  );
}

export function formatShortDateRange(from, to) {
  if (!from || !to) return '';
  const fmt = (key, opts) =>
    new Date(`${key}T12:00:00`).toLocaleDateString('id-ID', opts);
  if (from === to) {
    return fmt(from, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  if (sameMonth) {
    const d1 = parseInt(from.slice(8, 10), 10);
    const d2 = parseInt(to.slice(8, 10), 10);
    return `${d1}–${d2} ${fmt(to, { month: 'short', year: 'numeric' })}`;
  }
  return `${fmt(from, { day: 'numeric', month: 'short' })} – ${fmt(to, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}
