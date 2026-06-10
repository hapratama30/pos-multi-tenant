// eslint-disable-next-line no-unused-vars
import React, { useMemo, useState, useEffect } from 'react';
import { usePosStore } from '../store/usePosStore';
import {
  toLocalDateKey,
  isSameLocalDay,
  isInDateRange,
  forEachDayInRange,
  currentMonthRange,
  isActiveSale,
} from '../utils/dateFilters';
import ChartDateRangeFilter, { formatShortDateRange } from './charts/ChartDateRangeFilter';
import DailyBarChart from './charts/DailyBarChart';
import { formatRupiah } from '../utils/platformAdmin';
// =====================================================================
// KOMPONEN IKON UTAMA (Warna diatur dinamis lewat class Tailwind)
// =====================================================================
const IconKatalog = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 md:w-7 h-7 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const IconVarian = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 md:w-7 h-7 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const IconStok = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 md:w-7 h-7 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const IconPelanggan = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 md:w-7 h-7 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const IconPromo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 md:w-7 h-7 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const IconExpense = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 md:w-7 md:h-7 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

// --- Ikon PPOB ---
const IconPulsa = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 md:w-7 md:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);
const IconData = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 md:w-7 md:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconListrik = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 md:w-7 md:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);
const IconPDAM = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 md:w-7 md:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-2.42 2.76-6 6.82-6 10.5 0 3.31 2.69 6 6 6s6-2.69 6-6c0-3.68-3.58-7.74-6-10.5z" />
  </svg>
);
const IconEwallet = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 md:w-7 md:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);
const IconGame = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 md:w-7 md:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
  </svg>
);
const IconGrid = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 md:w-7 md:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

// Kustomisasi Pop-up Tooltip Grafik yang Clean
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const val = Number(payload[0]?.value) || 0;
  return (
    <div className="bg-slate-900 shadow-xl p-3 rounded-xl text-xs text-white border border-slate-800">
      <p className="font-medium text-slate-400 mb-1">{row?.formattedDate || '-'}</p>
      <p className="font-bold text-teal-400">{formatRupiah(val)}</p>
      <p className="text-[10px] text-slate-300 mt-0.5">{row?.count ?? 0} Transaksi</p>
    </div>
  );
};

// eslint-disable-next-line no-unused-vars
export default function Dashboard({ transactions = [], onNavigate, currentUser, onShowToast, onTriggerUpgrade, onTriggerFeaturePopup }) {
  const [broadcasts, setBroadcasts] = useState([]);
  const [activePopup, setActivePopup] = useState(null);

  const handleClosePopup = () => {
    if (activePopup) {
      localStorage.setItem('pos_last_seen_broadcast_popup_id', String(activePopup.id));
      setActivePopup(null);
    }
  };

  const handleActionClick = () => {
    if (activePopup && activePopup.button_url) {
      const url = activePopup.button_url.trim();
      if (url.startsWith('/')) {
        const tabName = url.substring(1);
        onNavigate?.(tabName);
      } else {
        window.open(url, '_blank');
      }
    }
    handleClosePopup();
  };

  React.useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/saas/broadcasts`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setBroadcasts(data.data);
          
          // Cari broadcast popup aktif terbaru
          const latestPopup = data.data.find(b => b.show_as_popup && b.is_active);
          if (latestPopup) {
            const seenId = localStorage.getItem('pos_last_seen_broadcast_popup_id');
            if (String(latestPopup.id) !== seenId) {
              setActivePopup(latestPopup);
            }
          }
        }
      })
      .catch(console.error);
  }, []);

  // Baca Data User / Tenant
  const rawLocalUser = localStorage.getItem('pos_current_user');
  const parsedLocalUser = rawLocalUser ? JSON.parse(rawLocalUser) : null;
  const activeUser = currentUser || parsedLocalUser || {};

  const [livePlanId, setLivePlanId] = useState(activeUser?.plan_id || activeUser?.tenants?.plan_id || activeUser?.tenant?.plan_id || 'free');
  const [liveModules, setLiveModules] = useState(activeUser?.enabled_modules || activeUser?.tenants?.enabled_modules || activeUser?.tenant?.enabled_modules || []);
  const [ppobBalance, setPpobBalance] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const [ppobMutations, setPpobMutations] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [topupMethod, setTopupMethod] = useState('otomatis');
  // eslint-disable-next-line no-unused-vars
  const [isTopupLoading, setIsTopupLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [platformSettings, setPlatformSettings] = useState({
    deposit_qris_enabled: true,
    deposit_transfer_enabled: true
  });

  React.useEffect(() => {
    if (!activeUser?.tenant_id) return;
    import('../supabaseClient').then(({ supabase }) => {
      Promise.all([
        supabase.from('tenants').select('enabled_modules').eq('tenant_id', activeUser.tenant_id).maybeSingle(),
        supabase.from('tenant_subscriptions').select('plan_id, status, trial_ends_at, current_period_end').eq('tenant_id', activeUser.tenant_id).maybeSingle()
      ]).then(([{ data: tenantData }, { data: subData }]) => {
        let activePlan = subData?.plan_id || 'free';
        let activeModules = tenantData?.enabled_modules || ['pos', 'history', 'catalog', 'staff', 'settings'];

        if (activePlan !== 'free') {
          const now = new Date();
          let isExpired = false;
          if (subData?.status === 'trialing' && subData?.trial_ends_at) {
            isExpired = new Date(subData.trial_ends_at) < now;
          } else if (subData?.current_period_end) {
            isExpired = new Date(subData.current_period_end) < now;
          }

          if (isExpired) {
            activePlan = 'free';
            activeModules = ['pos', 'history', 'catalog', 'staff', 'settings'];

            // Update database secara background
            supabase
              .from('tenant_subscriptions')
              .update({
                plan_id: 'free',
                status: 'expired',
                updated_at: now.toISOString()
              })
              .eq('tenant_id', activeUser.tenant_id)
              .catch(err => console.error('[Auto-Expiry Dashboard] Gagal update plan:', err));

            supabase
              .from('tenants')
              .update({
                enabled_modules: activeModules
              })
              .eq('tenant_id', activeUser.tenant_id)
              .catch(err => console.error('[Auto-Expiry Dashboard] Gagal update modules:', err));
          }
        }

        setLiveModules(activeModules);
        setLivePlanId(activePlan);
      }).catch(console.error);
    });

      // Fetch PPOB balance
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ppob/balance?tenant_id=${activeUser.tenant_id}&outlet_id=${activeUser.outlet_id || ''}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setPpobBalance(data.balance);
            setPpobMutations(data.mutations || []);
          }
        }).catch(console.error);

      // Fetch Global Platform Settings (Feature Toggles)
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/saas/platform-settings`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setPlatformSettings(data.features || { deposit_qris_enabled: true, deposit_transfer_enabled: true });

            // Set default tab if the current one is disabled
            setTopupMethod(prev => {
              const qrisOn = data.features?.deposit_qris_enabled !== false;
              const transferOn = data.features?.deposit_transfer_enabled !== false;
              if (prev === 'otomatis' && !qrisOn && transferOn) return 'manual';
              if (prev === 'manual' && !transferOn && qrisOn) return 'otomatis';
              return prev;
            });
          }
        })
        .catch(console.error);
  }, [activeUser?.tenant_id, activeUser?.outlet_id]);

  const namaTokoAktif = activeUser?.tenants?.name || activeUser?.tenant?.name || activeUser?.tenant_name || "TEST";
  const namaUserLogin = activeUser?.name || activeUser?.username || "Admin";

  const hasPermission = (menuId) => {
    if (platformSettings?.pos_features?.[menuId]?.status === 'hidden') return false;
    if (activeUser?.role === 'Owner' || activeUser?.role === 'Admin') return true;
    // Jika permissions bukan array valid, user biasa tidak mendapat akses apapun (kecuali dashboard)
    const perms = Array.isArray(activeUser?.permissions) ? activeUser.permissions : [];
    return perms.includes(menuId);
  };

  const isPro = livePlanId !== 'free';

  const checkModuleAccess = (moduleId) => {
    if (isPro) return true;
    if (!Array.isArray(liveModules)) return false;
    if (liveModules.includes('all')) return true;
    return liveModules.includes(moduleId);
  };

  const menuItems = [
    { id: 'catalog', label: 'Katalog Produk', icon: <IconKatalog /> },
    { id: 'variants', label: 'Varian & Ekstra', icon: <IconVarian /> },
    { id: 'stock', label: 'Stok Bahan', icon: <IconStok /> },
    { id: 'customers', label: 'Pelanggan', icon: <IconPelanggan /> },
    { id: 'discounts', label: 'Diskon & Promo', icon: <IconPromo /> },
    { id: 'expenses', label: 'Beli & Keluar', icon: <IconExpense /> },
  ].filter(item => hasPermission(item.id));

  // eslint-disable-next-line no-unused-vars
  const ppobMenus = [
    { id: 'pulsa', label: 'Pulsa', icon: <IconPulsa />, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', isPremium: true },
    { id: 'data', label: 'Paket Data', icon: <IconData />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', isPremium: true },
    { id: 'pln', label: 'Token PLN', icon: <IconListrik />, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', isPremium: true },
    { id: 'ewallet', label: 'Top Up', icon: <IconEwallet />, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', isPremium: true },
    { id: 'pdam', label: 'PDAM', icon: <IconPDAM />, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200', isPremium: true },
    { id: 'game', label: 'Voucher Game', icon: <IconGame />, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', isPremium: true },
    { id: 'all', label: 'Lainnya', icon: <IconGrid />, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', isPremium: true },
  ];

  const handleMenuClick = (menuId, isLocked) => {
    const config = platformSettings?.pos_features?.[menuId];
    if (config?.status === 'popup') {
      onTriggerFeaturePopup && onTriggerFeaturePopup(menuId);
      return;
    }
    if (isLocked) {
      onTriggerUpgrade && onTriggerUpgrade(menuId);
      return;
    }
    onNavigate(menuId);
  };

  // Modals state variables and logic removed — moved to dedicated pages/tabs.

  const activeTransactions = useMemo(
    () => transactions.filter(isActiveSale),
    [transactions]
  );

  const todayStats = useMemo(() => {
    let omzet = 0;
    let orders = 0;
    activeTransactions.forEach((t) => {
      if (!isSameLocalDay(t.created_at)) return;
      omzet += Number(t.total) || 0;
      orders += 1;
    });
    return { omzet, orders };
  }, [activeTransactions]);

  const [chartFrom, setChartFrom] = useState(() => currentMonthRange().from);
  const [chartTo, setChartTo] = useState(() => currentMonthRange().to);

  const processedChartData = useMemo(() => {
    if (!chartFrom || !chartTo || chartFrom > chartTo) return [];

    const dataMap = {};
    forEachDayInRange(chartFrom, chartTo, ({ dateKey, dayLabel, formattedDate }) => {
      dataMap[dateKey] = {
        dateStr: dateKey,
        name: dayLabel,
        formattedDate,
        omzet: 0,
        count: 0,
      };
    });

    activeTransactions.forEach((t) => {
      if (!isInDateRange(t.created_at, chartFrom, chartTo)) return;
      const txDateStr = toLocalDateKey(t.created_at);
      if (dataMap[txDateStr]) {
        dataMap[txDateStr].omzet += Number(t.total) || 0;
        dataMap[txDateStr].count += 1;
      }
    });

    return Object.values(dataMap).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [activeTransactions, chartFrom, chartTo]);

  const chartRangeLabel = formatShortDateRange(chartFrom, chartTo);

  const applyBulanIni = () => {
    const r = currentMonthRange();
    setChartFrom(r.from);
    setChartTo(r.to);
  };

  const todayTransactions = useMemo(
    () =>
      activeTransactions
        .filter((t) => t.created_at && isSameLocalDay(t.created_at))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [activeTransactions]
  );

  return (
    <div className="relative min-h-screen bg-slate-50 pb-24 overflow-x-hidden -mt-4 -mx-4 sm:-mt-6 sm:-mx-6 lg:-mt-8 lg:-mx-8">

      {/* BACKGROUND HEADER */}
      <div className="absolute top-0 left-0 right-0 h-64 md:h-76 bg-gradient-to-b from-teal-700 via-teal-600 to-transparent rounded-b-[3rem] z-0 opacity-95">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.12),transparent_50%)]" />
      </div>

      {/* CONTENT WRAPPER */}
      {/* Catatan Perubahan: pt-10 md:pt-12 ditambahkan agar judul turun ke bawah dan tidak mepet navbar */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 pt-10 md:pt-12 space-y-6">

        {/* HEADER */}
        <header className="text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-orange-300 text-xs md:text-sm font-black uppercase tracking-widest drop-shadow-sm">
              Selamat Datang di Toko "{namaTokoAktif}"
            </p>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight drop-shadow-sm mt-1">
              Halo, {namaUserLogin}! 👋
            </h1>
            <p className="text-teal-100 text-[10px] md:text-xs font-semibold uppercase tracking-wider mt-1 opacity-80">
              Sistem POS Multi-Tenant Berjalan Sempurna
            </p>
          </div>

          <div className="hidden md:block bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 text-right">
            <p className="text-[10px] text-teal-200 font-black uppercase tracking-widest">Sesi Aktif</p>
            <p className="text-xs font-bold text-white">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </header>

        {/* BROADCAST MARQUEE */}
        {broadcasts.filter(b => !b.show_as_popup).length > 0 && (
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden flex items-center shadow-lg">
            <div className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-black text-[10px] md:text-xs uppercase tracking-wider shrink-0 z-10 shadow-md flex items-center gap-2">
              <span>📢</span> <span className="hidden sm:inline">PENGUMUMAN</span>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <marquee className="text-teal-100 text-xs md:text-sm font-medium flex items-center pt-1.5" scrollamount="5">
                {broadcasts.filter(b => !b.show_as_popup).map((b, i, arr) => (
                  <span key={b.id} className="mr-12">
                    <span className="mr-2">{b.type === 'promo' ? '🎉' : b.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                    <strong className="text-white tracking-wide">{b.title}:</strong> {b.message}
                    {i < arr.length - 1 && <span className="ml-12 text-slate-600">•</span>}
                  </span>
                ))}
              </marquee>
            </div>
          </div>
        )}

        {/* TAGIHAN & ISI ULANG (PPOB) */}
        {(() => {
          if (platformSettings?.pos_features?.ppob?.status === 'hidden') return null;
          const isPpobLocked = !checkModuleAccess('ppob');
          const handleActionClick = (actionTab) => {
            const ppobConfig = platformSettings?.pos_features?.ppob;
            if (ppobConfig?.status === 'popup') {
              onTriggerFeaturePopup && onTriggerFeaturePopup('ppob');
              return;
            }
            if (isPpobLocked) {
              onTriggerUpgrade && onTriggerUpgrade('ppob');
              return;
            }
            onNavigate(actionTab);
          };

          return (
            <section className="bg-white rounded-3xl p-5 shadow-xl shadow-slate-200/40 border border-slate-100/80 mt-2">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <div>
                  <h3 className="text-sm md:text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <span className="text-xl">⚡</span> Tagihan & Isi Ulang (PPOB)
                  </h3>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 mt-0.5">Jual Pulsa, Listrik, PDAM, dan Top Up E-Wallet</p>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border p-5 md:p-6 flex flex-col md:flex-row justify-between items-center gap-6 w-full md:w-auto"
                  style={{ borderColor: '#e8f7f4' }}>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm shrink-0" style={{ background: '#fffbeb' }}>💰</div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Saldo Deposit</p>
                      <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tighter truncate">{formatRupiah(ppobBalance)}</h2>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => handleActionClick('ppob-withdraw')} className="flex-1 md:flex-none flex flex-col items-center justify-center p-2.5 rounded-2xl transition hover:scale-105 relative"
                      style={{ background: 'var(--pos-orange-light)', border: '1px solid #fed7aa' }}>
                      {isPpobLocked && (
                        <div className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full p-0.5 shadow-sm text-[8px] w-4 h-4 flex items-center justify-center">
                          🔒
                        </div>
                      )}
                      <span className="text-lg mb-1 text-orange-500">💳</span>
                      <span className="text-[9px] font-black uppercase text-orange-700">Withdraw</span>
                    </button>
                    <button onClick={() => handleActionClick('ppob-topup')} className="flex-1 md:flex-none flex flex-col items-center justify-center p-2.5 rounded-2xl transition hover:scale-105 relative"
                      style={{ background: '#f8fffe', border: '1px solid #d1ede8' }}>
                      {isPpobLocked && (
                        <div className="absolute -top-1 -right-1 bg-teal-600 text-white rounded-full p-0.5 shadow-sm text-[8px] w-4 h-4 flex items-center justify-center">
                          🔒
                        </div>
                      )}
                      <span className="text-lg mb-1" style={{ color: 'var(--pos-teal)' }}>➕</span>
                      <span className="text-[9px] font-black uppercase" style={{ color: 'var(--pos-teal-dark)' }}>Top Up</span>
                    </button>
                    <button onClick={() => handleActionClick('ppob-history')} className="flex-1 md:flex-none flex flex-col items-center justify-center p-2.5 rounded-2xl transition hover:scale-105 relative"
                      style={{ background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                      {isPpobLocked && (
                        <div className="absolute -top-1 -right-1 bg-slate-600 text-white rounded-full p-0.5 shadow-sm text-[8px] w-4 h-4 flex items-center justify-center">
                          🔒
                        </div>
                      )}
                      <span className="text-lg mb-1 text-slate-500">📋</span>
                      <span className="text-[9px] font-black uppercase text-slate-600">Riwayat</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 md:gap-4">
                {[
                  { id: 'pulsa', label: 'Pulsa', icon: <IconPulsa />, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', isPremium: true },
                  { id: 'data', label: 'Paket Data', icon: <IconData />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', isPremium: true },
                  { id: 'pln', label: 'Token PLN', icon: <IconListrik />, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', isPremium: true },
                  { id: 'ewallet', label: 'E-Wallet', icon: <IconEwallet />, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', isPremium: true },
                  { id: 'game', label: 'Game', icon: <IconGame />, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', isPremium: true },
                  { id: 'lainnya', label: 'Lainnya', icon: <IconGrid />, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', isPremium: true }
                ].map(m => {
                  const handlePPOBClick = () => {
                    const ppobConfig = platformSettings?.pos_features?.ppob;
                    if (ppobConfig?.status === 'popup') {
                      onTriggerFeaturePopup && onTriggerFeaturePopup('ppob');
                      return;
                    }
                    if (isPpobLocked) {
                      onTriggerUpgrade && onTriggerUpgrade('ppob');
                      return;
                    }
                    const catMap = {
                      'pulsa': 'Pulsa',
                      'data': 'Paket Data',
                      'pln': 'Token PLN',
                      'ewallet': 'E-Money',
                      'game': 'Voucher Game'
                    };
                    usePosStore.getState().setInitialAction({
                      type: 'OPEN_PPOB',
                      category: m.id === 'lainnya' ? null : (catMap[m.id] || m.label)
                    });
                    onNavigate('pos');
                  };

                  return (
                    <button
                      key={m.id}
                      onClick={handlePPOBClick}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border ${m.border} ${m.bg} hover:shadow-lg transition-all hover:-translate-y-1 group relative`}
                    >
                      {isPpobLocked && m.isPremium && m.id !== 'lainnya' && (
                        <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-1 shadow-sm">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                      )}
                      <div className={`${m.color} group-hover:scale-110 transition-transform duration-300`}>{m.icon}</div>
                      <span className={`text-[10px] md:text-xs font-black uppercase mt-2 ${m.color} text-center`}>
                        {m.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* RINGKASAN HARI INI */}
        <div className="bg-white rounded-3xl p-5 md:p-6 shadow-xl shadow-slate-200/40 border border-slate-100/80">
          <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ringkasan Hari Ini</span>
            <span className="text-[9px] font-black bg-teal-50 text-teal-600 px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">● Live</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-teal-50 to-teal-100/30 p-4 md:p-5 rounded-2xl border border-teal-100/40">
              <p className="text-[9px] text-teal-700 font-black uppercase tracking-wider mb-1">Total Pendapatan</p>
              <h3 className="text-lg md:text-2xl font-black text-slate-800 tracking-tight truncate">
                {formatRupiah(todayStats.omzet)}
              </h3>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100/30 p-4 md:p-5 rounded-2xl border border-orange-100/40">
              <p className="text-[9px] text-orange-700 font-black uppercase tracking-wider mb-1">Volume Penjualan</p>
              <h3 className="text-lg md:text-2xl font-black text-slate-800 tracking-tight">
                {todayStats.orders} Nota
              </h3>
            </div>
          </div>
        </div>

        {/* GRAFIK — lebar penuh, filter rentang tanggal */}
        <div className="bg-white rounded-3xl p-5 md:p-6 shadow-xl shadow-slate-200/40 border border-slate-100/80 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h4 className="text-xs md:text-sm font-black tracking-wide text-slate-800 uppercase">
              Grafik Penjualan
            </h4>
            {chartRangeLabel && (
              <span className="text-[9px] font-black bg-teal-50 text-teal-600 px-3 py-1 rounded-full border border-teal-100 uppercase tracking-wider">
                {chartRangeLabel}
              </span>
            )}
          </div>

          <ChartDateRangeFilter
            dateFrom={chartFrom}
            dateTo={chartTo}
            onFromChange={setChartFrom}
            onToChange={setChartTo}
            onBulanIni={applyBulanIni}
          />

          <DailyBarChart
            data={processedChartData}
            height={240}
            tooltip={<CustomTooltip />}
            bars={[{ dataKey: 'omzet', fill: '#0d9488', name: 'Omzet', maxBarSize: 16 }]}
          />
        </div>

        {/* MENU UTAMA (EFEK HOVER MODERN DENGAN ANIMASI HALUS TANPA BLOK KAKU) */}
        <section className="bg-white p-5 md:p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h4 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1">Menu Fitur Aplikasi</h4>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 md:gap-4">
            {menuItems.map((item) => {
              const isLocked = !checkModuleAccess(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleMenuClick(item.id, isLocked)}
                  className="flex flex-col items-center gap-3 p-3.5 bg-slate-50/60 border border-slate-100/70 rounded-2xl transition-all duration-300 ease-out group hover:-translate-y-1 hover:bg-white hover:border-teal-200 hover:shadow-md hover:shadow-teal-600/5 active:scale-95 relative"
                >
                  {/* Kontainer Lingkaran Ikon */}
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-white border border-slate-100 text-teal-600 rounded-xl flex items-center justify-center shadow-sm transition-all duration-300 group-hover:bg-teal-50 group-hover:text-teal-500 group-hover:border-teal-100 relative">
                    {item.icon}
                    {isLocked && (
                      <div style={{
                        position: 'absolute', top: '-4px', right: '-4px',
                        background: '#f97316', color: 'white', fontSize: '9px',
                        borderRadius: '50%', width: '18px', height: '18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        🔒
                      </div>
                    )}
                  </div>
                  {/* Teks Label Menu */}
                  <span className="text-[9px] md:text-[10px] font-black text-slate-500 text-center uppercase tracking-wider truncate w-full transition-colors duration-300 group-hover:text-teal-600">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* LOG AKTIVITAS TERAKHIR (KHUSUS HARI INI) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between ml-1">
            <div className="flex items-center gap-2">
              <h4 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Log Aktivitas Transaksi Terbaru</h4>
              <span className="bg-orange-50 text-orange-600 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border border-orange-100">Hari Ini</span>
            </div>
            {hasPermission('history') && (
              <button
                onClick={() => onNavigate('history')}
                className="text-[9px] md:text-[10px] font-black text-orange-500 hover:text-orange-600 uppercase tracking-widest transition-colors"
              >
                Lihat Semua Riwayat
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todayTransactions.length > 0 ? (
              todayTransactions.slice(0, 6).map((t, index) => (
                <div
                  key={t.id || index}
                  className="bg-white p-4 rounded-2xl flex items-center justify-between border border-slate-100 shadow-sm hover:shadow-md hover:border-teal-100 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-black text-[10px] border border-slate-100 shrink-0">
                      #{String(index + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-700 tracking-tight">Pelanggan Umum</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {t.created_at ? new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Baru saja'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-black text-emerald-600 tracking-tight bg-emerald-50 px-3 py-1.5 rounded-xl">
                    +{formatRupiah(t.total || 0)}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12 border border-dashed border-slate-200 rounded-3xl bg-white/50">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Belum ada transaksi masuk pada hari ini</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* MODAL POPUP BROADCAST (PREMIUM SHOPEE/LAZADA STYLE) */}
      {activePopup && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          
          {/* Main Container for Banner and Close Button */}
          <div className="flex flex-col items-center max-w-sm w-full animate-in zoom-in-95 duration-300">
            
            {/* Modal Body */}
            {activePopup.image ? (
              /* Image Banner Mode (Shopee/Lazada style) - NO white card background, just the image and overlay button */
              <div className="relative w-full overflow-hidden rounded-[2rem] shadow-2xl flex flex-col items-center select-none bg-transparent">
                <img 
                  src={activePopup.image} 
                  alt={activePopup.title} 
                  className="w-full h-auto object-contain rounded-[2rem]" 
                />
                
                {/* Floating Action Button (Overlay on image bottom) */}
                {activePopup.button_text && activePopup.button_url && (
                  <div className="absolute bottom-6 left-0 right-0 px-8 flex justify-center">
                    <button
                      onClick={handleActionClick}
                      className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black uppercase tracking-widest rounded-full shadow-lg shadow-emerald-500/30 transition-all active:scale-[0.97] hover:scale-[1.02] cursor-pointer text-center"
                    >
                      {activePopup.button_text}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Standard Text-only Mode */
              <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20 w-full flex flex-col relative">
                {/* Fallback Banner */}
                <div className="w-full h-44 bg-gradient-to-br from-purple-600 via-indigo-600 to-teal-600 p-6 flex flex-col justify-between text-white relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
                  <span className="bg-white/20 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-white/20 w-max shadow-sm">
                    📢 PENGUMUMAN
                  </span>
                  <div>
                    <h3 className="text-xl font-black leading-tight tracking-tight">{activePopup.title}</h3>
                    <p className="text-[10px] text-purple-200 mt-1">{new Date(activePopup.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>

                <div className="p-6 text-center space-y-4">
                  <p className="text-xs font-semibold text-slate-550 leading-relaxed max-h-32 overflow-y-auto pr-1 whitespace-pre-wrap">
                    {activePopup.message}
                  </p>

                  {/* Optional Action Button for Text mode */}
                  {activePopup.button_text && activePopup.button_url && (
                    <div className="pt-2">
                      <button
                        onClick={handleActionClick}
                        className="w-full py-3.5 px-6 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-teal-500/25 transition-all active:scale-[0.97] hover:scale-[1.01] cursor-pointer"
                      >
                        {activePopup.button_text}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Vertical connector line */}
            <div className="w-0.5 h-8 bg-white/40"></div>

            {/* Shopee-style Circular Close Button */}
            <button
              onClick={handleClosePopup}
              className="w-12 h-12 rounded-full border-2 border-white/70 bg-black/30 hover:bg-black/55 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg hover:border-white cursor-pointer group"
              title="Tutup Pengumuman"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6 stroke-white group-hover:rotate-90 transition-transform duration-250" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

          </div>
        </div>
      )}
    </div>
  );
}