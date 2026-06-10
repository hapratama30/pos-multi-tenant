/* eslint-disable */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  toLocalDateKey,
  isInDateRange,
  isSameLocalDay,
  isSameLocalMonth,
  forEachDayInRange,
  firstDayOfMonthKey,
  lastDayOfMonthKey,
  todayLocalKey,
  defaultMonthToTodayRange,
  parseDateInput,
  isActiveSale,
} from '../utils/dateFilters';
import DailyBarChart from './charts/DailyBarChart';
import { formatShortDateRange } from './charts/ChartDateRangeFilter';

import { formatRupiah } from '../utils/platformAdmin';

const THEME = {
  teal: '#0d9488',
  tealDark: '#0f766e',
  tealLight: '#e0f5f1',
  orange: '#F47920',
  orangeLight: '#fff3e8',
  bg: '#F8FAFC',
};

const CATEGORY_LABELS = {
  supplier_bahan: 'Supplier Bahan Baku',
  supplier_produk: 'Supplier Produk Jadi',
  supplier_lain: 'Supplier Lainnya',
  listrik: 'Listrik & Utilitas',
  sewa: 'Sewa Tempat',
  gaji: 'Gaji & Upah',
  transport: 'Transport & BBM',
  atk: 'ATK & Operasional',
  lainnya: 'Lainnya',
};

const PERIODS = [
  { id: 'hari_ini', label: 'Hari Ini' },
  { id: 'bulan_ini', label: 'Bulan Ini' },
  { id: 'rentang', label: 'Rentang' },
  { id: 'semua', label: 'Semua' },
];

const formatRp = (n) => formatRupiah(n);
const formatPct = (n) => `${(Number(n) || 0).toFixed(1)}%`;

const matchesPeriod = (iso, period, rangeFrom, rangeTo) => {
  if (!iso) return period === 'semua';
  if (period === 'semua') return true;
  if (period === 'hari_ini') return isSameLocalDay(iso);
  if (period === 'bulan_ini') return isSameLocalMonth(iso);
  if (period === 'rentang') return isInDateRange(iso, rangeFrom, rangeTo);
  return true;
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="bg-slate-900 shadow-xl p-3 rounded-xl text-xs text-white border border-slate-800">
      <p className="font-medium text-slate-400 mb-1.5">{row?.formattedDate || label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-bold" style={{ color: p.color }}>
          {p.name}: {formatRp(Number(p.value) || 0)}
        </p>
      ))}
      {row?.orderCount != null && (
        <p className="text-[10px] text-slate-400 mt-1">{row.orderCount} transaksi</p>
      )}
    </div>
  );
};

export default function Laporan({ transactions = [], tenantId, defaultOutletId }) {
  const defaultRange = useMemo(() => defaultMonthToTodayRange(), []);
  const [period, setPeriod] = useState('bulan_ini');
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [outlets, setOutlets] = useState([]);
  const [outletFilter, setOutletFilter] = useState(defaultOutletId ? String(defaultOutletId) : 'all');

  useEffect(() => {
    if (defaultOutletId) {
      setOutletFilter(String(defaultOutletId));
    } else {
      setOutletFilter('all');
    }
  }, [defaultOutletId]);

  useEffect(() => {
    if (!tenantId) return;
    supabase.from('outlets').select('id, name, is_main').eq('tenant_id', tenantId).then(({ data }) => setOutlets(data || []));
  }, [tenantId]);

  const filteredByOutlet = useMemo(() => {
    const base = transactions.filter(isActiveSale);
    if (outletFilter === 'all') return base;
    const isMain = outlets.find(o => String(o.id) === String(outletFilter))?.is_main;
    return base.filter((t) => String(t.outlet_id) === String(outletFilter) || (isMain && (!t.outlet_id || String(t.outlet_id) === 'null')));
  }, [transactions, outletFilter, outlets]);

  const exportCsv = useCallback(() => {
    const rows = filteredByOutlet.filter((t) => matchesPeriod(t.created_at, period, dateFrom, dateTo));
    const header = 'Tanggal,Invoice,Total,Metode,Status\n';
    const body = rows.map((t) => {
      const d = t.created_at ? new Date(t.created_at).toISOString() : '';
      return `${d},${t.invoice_number || t.id},${t.total || 0},${t.payment_method || ''},${t.status || 'completed'}`;
    }).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-${tenantId}-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredByOutlet, period, dateFrom, dateTo, tenantId]);

  const fetchExpenses = useCallback(async () => {
    if (!tenantId) {
      setExpenses([]);
      setLoadingExpenses(false);
      return;
    }
    setLoadingExpenses(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setExpenses(data || []);
    } catch {
      setExpenses([]);
    } finally {
      setLoadingExpenses(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const filteredTx = useMemo(
    () => filteredByOutlet.filter((t) => matchesPeriod(t.created_at, period, dateFrom, dateTo)),
    [filteredByOutlet, period, dateFrom, dateTo]
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((e) => matchesPeriod(e.created_at, period, dateFrom, dateTo)),
    [expenses, period, dateFrom, dateTo]
  );

  const omzetStats = useMemo(() => {
    let bruto = 0;
    let lunas = 0;
    let piutang = 0;
    let orderCount = 0;
    const byPayment = {};

    filteredTx.forEach((t) => {
      const total = Number(t.total) || 0;
      bruto += total;
      orderCount += 1;
      const method = t.payment_method || 'Tunai';
      if (method === 'Belum Lunas') {
        piutang += total;
      } else {
        lunas += total;
        byPayment[method] = (byPayment[method] || 0) + total;
      }
    });

    const avgOrder = orderCount > 0 ? bruto / orderCount : 0;
    return { bruto, lunas, piutang, orderCount, avgOrder, byPayment };
  }, [filteredTx]);

  const expenseStats = useMemo(() => {
    let pembelian = 0;
    let operasional = 0;
    let total = 0;
    const byCategory = {};

    filteredExpenses.forEach((e) => {
      const amt = Number(e.total) || 0;
      total += amt;
      if (e.record_type === 'pembelian') pembelian += amt;
      else operasional += amt;

      const catKey = e.category || 'lainnya';
      const catLabel = CATEGORY_LABELS[catKey] || catKey;
      byCategory[catLabel] = (byCategory[catLabel] || 0) + amt;
    });

    const sortedCategories = Object.entries(byCategory)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      total,
      pembelian,
      operasional,
      count: filteredExpenses.length,
      byCategory: sortedCategories,
    };
  }, [filteredExpenses]);

  const profitStats = useMemo(() => {
    const pendapatan = omzetStats.lunas;
    const hpp = expenseStats.pembelian;
    const beban = expenseStats.operasional;
    const totalKeluar = expenseStats.total;
    const labaKotor = pendapatan - hpp;
    const labaOperasional = pendapatan - totalKeluar;
    const marginKotor = pendapatan > 0 ? (labaKotor / pendapatan) * 100 : 0;
    const marginOperasional = pendapatan > 0 ? (labaOperasional / pendapatan) * 100 : 0;

    return {
      pendapatan,
      hpp,
      beban,
      totalKeluar,
      labaKotor,
      labaOperasional,
      marginKotor,
      marginOperasional,
    };
  }, [omzetStats, expenseStats]);

  const topProducts = useMemo(() => {
    const counts = {};
    filteredTx.forEach((tx) => {
      tx.items?.forEach((item) => {
        counts[item.name] = (counts[item.name] || 0) + item.qty;
      });
    });
    return Object.entries(counts)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredTx]);

  const { chartData, periodLabel, showChart } = useMemo(() => {
    const now = new Date();
    let startKey = firstDayOfMonthKey(now);
    let endKey = lastDayOfMonthKey(now);
    let label = formatShortDateRange(startKey, endKey);

    if (period === 'hari_ini') {
      startKey = todayLocalKey();
      endKey = todayLocalKey();
      label = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } else if (period === 'rentang') {
      if (!dateFrom || !dateTo || dateFrom > dateTo) {
        return { chartData: [], periodLabel: 'Rentang tidak valid', showChart: false };
      }
      startKey = dateFrom;
      endKey = dateTo;
      const fmt = (k) =>
        new Date(k + 'T12:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      label = `${fmt(dateFrom)} – ${fmt(dateTo)}`;
    } else if (period === 'semua') {
      const keys = [
        ...filteredTx.map((t) => toLocalDateKey(t.created_at)),
        ...filteredExpenses.map((e) => toLocalDateKey(e.created_at)),
      ].filter(Boolean);
      if (keys.length === 0) {
        return { chartData: [], periodLabel: 'Semua data', showChart: false };
      }
      keys.sort();
      startKey = keys[0];
      endKey = keys[keys.length - 1];
      const daySpan =
        (parseDateInput(endKey) - parseDateInput(startKey)) / (1000 * 60 * 60 * 24) + 1;
      if (daySpan > 62) {
        return { chartData: [], periodLabel: 'Rentang terlalu lebar untuk grafik harian', showChart: false };
      }
      label = 'Semua periode';
    }

    const map = {};
    forEachDayInRange(startKey, endKey, ({ dateKey, dayLabel, formattedDate }) => {
      map[dateKey] = {
        dateStr: dateKey,
        name: dayLabel,
        formattedDate,
        omzet: 0,
        pengeluaran: 0,
        orderCount: 0,
      };
    });

    filteredTx.forEach((t) => {
      const key = toLocalDateKey(t.created_at);
      if (!map[key]) return;
      if (t.payment_method !== 'Belum Lunas') {
        map[key].omzet += Number(t.total) || 0;
      }
      map[key].orderCount += 1;
    });

    filteredExpenses.forEach((e) => {
      const key = toLocalDateKey(e.created_at);
      if (!map[key]) return;
      map[key].pengeluaran += Number(e.total) || 0;
    });

    const rows = Object.values(map).sort((a, b) =>
      String(a.dateStr || '').localeCompare(String(b.dateStr || ''))
    );
    return {
      chartData: rows,
      periodLabel: label,
      showChart: rows.length > 0,
    };
  }, [filteredTx, filteredExpenses, period, dateFrom, dateTo]);

  const periodTitle = useMemo(() => {
    const base = PERIODS.find((p) => p.id === period)?.label || 'Periode';
    if (period === 'rentang' && dateFrom && dateTo) {
      const fmt = (k) =>
        new Date(k + 'T12:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      return `${base}: ${fmt(dateFrom)} – ${fmt(dateTo)}`;
    }
    return base;
  }, [period, dateFrom, dateTo]);

  return (
    <div className="relative min-h-[calc(100vh-140px)] bg-slate-50 pb-28 overflow-x-hidden -mt-4 -mx-4 sm:-mt-6 sm:-mx-6 lg:-mt-8 lg:-mx-8 font-sans">
      {/* BACKGROUND HEADER */}
      <div className="absolute top-0 left-0 right-0 h-64 md:h-76 bg-gradient-to-b from-teal-700 via-teal-600 to-transparent rounded-b-[3rem] z-0 opacity-95">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.12),transparent_50%)]" />
      </div>

      <div className="relative z-10 w-full px-4 sm:px-8 pt-10 md:pt-12 space-y-6">

          <header className="text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-orange-300 text-xs md:text-sm font-black uppercase tracking-widest drop-shadow-sm">
                Sistem POS Multi-Tenant
              </p>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight drop-shadow-sm mt-1 uppercase">
                Laporan Keuangan
              </h1>
              <p className="text-teal-100 text-[10px] md:text-xs font-semibold uppercase tracking-wider mt-1 opacity-80">
                Omzet · Pengeluaran · Laba Operasional
              </p>
            </div>
          </header>

        {/* Filter periode & cabang */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPeriod(p.id);
                  if (p.id === 'rentang') {
                    const r = defaultMonthToTodayRange();
                    setDateFrom(r.from);
                    setDateTo(r.to);
                  }
                }}
                className={`px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-wider border-2 transition-all ${
                  period === p.id
                    ? 'text-white border-transparent shadow-md bg-teal-600'
                    : 'bg-white border-slate-200 text-slate-400 hover:border-teal-200'
                }`}
              >
                {p.label}
              </button>
            ))}
            {outlets.length > 0 && (
              <select value={outletFilter} onChange={(e) => setOutletFilter(e.target.value)} className="ml-auto text-[10px] font-black uppercase border-2 rounded-full px-4 py-2.5 bg-white">
                <option value="all">Semua Cabang</option>
                {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            )}
            <button type="button" onClick={exportCsv} className="px-4 py-2.5 rounded-full font-black text-[10px] uppercase bg-slate-800 text-white">
              Export CSV
            </button>
          </div>

          {period === 'rentang' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dari Tanggal</span>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1 w-full text-sm font-bold border-2 border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50"
                />
              </label>
              <label className="block">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sampai Tanggal</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1 w-full text-sm font-bold border-2 border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50"
                />
              </label>
            </div>
          )}
        </div>

        {/* Hero: Laba Operasional */}
        <div
          className="rounded-[2rem] p-5 sm:p-6 text-white shadow-xl border border-teal-700/20"
          style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 55%, #14b8a6 100%)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-100/90 mb-1">
                Laba Operasional · {periodTitle}
              </p>
              <h3 className="text-2xl sm:text-4xl font-black tracking-tight">
                {formatRp(profitStats.labaOperasional)}
              </h3>
              <p className="text-xs font-bold text-teal-100/80 mt-2">
                Margin {formatPct(profitStats.marginOperasional)} dari pendapatan lunas
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:min-w-[240px]">
              <div className="bg-white/10 backdrop-blur rounded-2xl px-3 py-2.5 border border-white/10">
                <p className="text-[9px] font-black uppercase tracking-wider text-teal-100/70">Omzet Lunas</p>
                <p className="text-sm font-black truncate">{formatRp(profitStats.pendapatan)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-2xl px-3 py-2.5 border border-white/10">
                <p className="text-[9px] font-black uppercase tracking-wider text-teal-100/70">Total Keluar</p>
                <p className="text-sm font-black truncate">{formatRp(profitStats.totalKeluar)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ringkasan Neraca / P&L */}
        <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Ringkasan Laba Rugi
            </h4>
            <span className="text-[9px] font-black bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full uppercase">
              {periodTitle}
            </span>
          </div>

          <div className="p-5 space-y-1 text-sm">
            <p className="text-[9px] font-black text-teal-700 uppercase tracking-widest mb-2">Pendapatan</p>
            <Row label="Penjualan Kasir (Lunas)" value={profitStats.pendapatan} positive />
            {omzetStats.piutang > 0 && (
              <Row label="Piutang (Belum Lunas)" value={omzetStats.piutang} muted note="Belum masuk laba" />
            )}
            <Row label="Omzet Bruto (Semua Nota)" value={omzetStats.bruto} sub />

            <div className="h-px bg-slate-100 my-3" />

            <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-2">Pengeluaran</p>
            <Row label="Pembelian Bahan / Stok (HPP)" value={profitStats.hpp} negative />
            <Row label="Biaya Operasional" value={profitStats.beban} negative />
            <Row label="Total Pengeluaran" value={profitStats.totalKeluar} negative bold />

            <div className="h-px bg-slate-200 my-3" />

            <Row label="Laba Kotor (Omzet − HPP)" value={profitStats.labaKotor} highlight />
            <p className="text-[10px] text-slate-400 font-bold pl-1">
              Margin kotor {formatPct(profitStats.marginKotor)}
            </p>
            <Row label="Laba Operasional (Omzet − Total Keluar)" value={profitStats.labaOperasional} highlight />
            <p className="text-[10px] text-slate-400 font-bold pl-1">
              Margin operasional {formatPct(profitStats.marginOperasional)}
            </p>
          </div>
        </section>

        {/* Grid: Omzet + Pengeluaran */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Laporan Omzet */}
          <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Laporan Omzet</h4>
              <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                {omzetStats.orderCount} nota
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <MiniStat label="Omzet Bruto" value={formatRp(omzetStats.bruto)} color={THEME.teal} />
              <MiniStat label="Rata-rata Struk" value={formatRp(Math.round(omzetStats.avgOrder))} />
            </div>

            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Metode Pembayaran</p>
            {Object.keys(omzetStats.byPayment).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(omzetStats.byPayment)
                  .sort((a, b) => b[1] - a[1])
                  .map(([method, amount]) => (
                    <PaymentRow
                      key={method}
                      method={method}
                      amount={amount}
                      total={omzetStats.lunas}
                    />
                  ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-4 text-center">Belum ada penjualan lunas.</p>
            )}
          </section>

          {/* Laporan Pengeluaran */}
          <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Laporan Pengeluaran</h4>
              <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                {loadingExpenses ? '…' : `${expenseStats.count} catatan`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <MiniStat label="Pembelian Stok" value={formatRp(expenseStats.pembelian)} color={THEME.orange} />
              <MiniStat label="Operasional" value={formatRp(expenseStats.operasional)} />
            </div>

            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Per Kategori</p>
            {expenseStats.byCategory.length > 0 ? (
              <div className="space-y-2">
                {expenseStats.byCategory.slice(0, 6).map((c) => (
                  <PaymentRow
                    key={c.name}
                    method={c.name}
                    amount={c.amount}
                    total={expenseStats.total}
                    barColor="#F47920"
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                {loadingExpenses ? 'Memuat data pengeluaran…' : 'Belum ada catatan pengeluaran.'}
              </p>
            )}
          </section>
        </div>

        {showChart && (
          <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Grafik Omzet vs Pengeluaran
              </h4>
              <span className="text-[9px] font-black bg-teal-50 text-teal-600 px-3 py-1 rounded-full border border-teal-100 uppercase">
                {periodLabel}
              </span>
            </div>
            <DailyBarChart
              data={chartData}
              height={240}
              tooltip={<ChartTooltip />}
              showLegend
              bars={[
                { dataKey: 'omzet', fill: THEME.teal, name: 'Omzet', maxBarSize: 12 },
                { dataKey: 'pengeluaran', fill: THEME.orange, name: 'Pengeluaran', maxBarSize: 12 },
              ]}
            />
          </section>
        )}

        {/* Produk Terlaris */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Produk Terlaris</h4>
            <span className="text-[9px] font-bold text-teal-600">{periodTitle}</span>
          </div>
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            {topProducts.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="px-5 py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-black text-slate-300 w-5 shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <p className="text-sm font-bold text-slate-700 truncate">{p.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-slate-800">{p.qty}x</p>
                      <div className="w-20 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${topProducts[0].qty ? (p.qty / topProducts[0].qty) * 100 : 0}%`,
                            background: THEME.teal,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center text-slate-400 italic text-xs font-medium">
                Belum ada data penjualan untuk periode ini.
              </div>
            )}
          </div>
        </section>

        <p className="text-[10px] text-slate-400 font-medium text-center pb-4">
          Laba dihitung dari omzet lunas dikurangi total pembelian & biaya operasional.
          Piutang belum lunas ditampilkan terpisah.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, positive, negative, highlight, bold, sub, muted, note }) {
  const valueColor = highlight
    ? (value >= 0 ? THEME.teal : '#dc2626')
    : positive
      ? THEME.teal
      : negative
        ? '#ea580c'
        : muted
          ? '#94a3b8'
          : '#334155';

  return (
    <div className={`flex items-start justify-between gap-3 py-1.5 ${bold ? 'font-black' : ''}`}>
      <div className="min-w-0">
        <span className={`text-sm ${highlight || bold ? 'font-black text-slate-800' : 'font-bold text-slate-600'} ${sub ? 'text-slate-400 text-xs' : ''}`}>
          {label}
        </span>
        {note && <p className="text-[9px] text-slate-400 font-bold">{note}</p>}
      </div>
      <span className="text-sm font-black shrink-0" style={{ color: valueColor }}>
        {negative && value > 0 ? '−' : ''}{formatRp(Math.abs(value))}
      </span>
    </div>
  );
}

function MiniStat({ label, value, color = '#334155' }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-black truncate" style={{ color }}>{value}</p>
    </div>
  );
}

function PaymentRow({ method, amount, total, barColor = THEME.teal }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-2 mb-1">
          <span className="text-xs font-bold text-slate-700 truncate">{method}</span>
          <span className="text-xs font-black text-slate-800 shrink-0">{formatRp(amount)}</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
      </div>
      <span className="text-[10px] font-black text-slate-400 w-8 text-right shrink-0">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}
