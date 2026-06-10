import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

const tickFormatter = (v) =>
  v >= 1000000 ? `${v / 1000000}M` : v >= 1000 ? `${Math.round(v / 1000)}K` : v;

export default function DailyBarChart({
  data = [],
  height = 240,
  bars = [{ dataKey: 'omzet', fill: '#0d9488', name: 'Omzet', maxBarSize: 14 }],
  tooltip = null,
  showLegend = false,
}) {
  const dayCount = data.length;

  if (dayCount === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-400 text-xs font-bold"
        style={{ height }}
      >
        Tidak ada data untuk rentang ini
      </div>
    );
  }

  const scrollMinWidth = Math.max(dayCount * 18, 300);

  return (
    <div
      className="w-full min-w-0 overflow-x-auto"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div style={{ width: '100%', minWidth: scrollMinWidth, height }}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
            barCategoryGap={dayCount > 20 ? '20%' : '28%'}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }}
              interval={0}
              minTickGap={0}
            />
            <YAxis
              width={48}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 9 }}
              tickFormatter={tickFormatter}
            />
            {tooltip ? <Tooltip content={tooltip} cursor={{ fill: '#f8fafc' }} /> : null}
            {showLegend && (
              <Legend
                wrapperStyle={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  paddingTop: 6,
                }}
              />
            )}
            {bars.map((b) => (
              <Bar
                key={b.dataKey}
                dataKey={b.dataKey}
                name={b.name}
                fill={b.fill}
                radius={[4, 4, 0, 0]}
                maxBarSize={b.maxBarSize ?? 12}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
