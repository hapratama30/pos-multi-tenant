import React, { useState } from 'react';

const NAV_ITEMS = [
  {
    id: 'overview',
    label: 'Dashboard',
    desc: 'Ringkasan platform',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm0 6a1 1 0 011-1h4a1 1 0 011 1v8a1 1 0 01-1 1h-4a1 1 0 01-1-1v-8zM4 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    id: 'tenants',
    label: 'Tenant',
    desc: 'Langganan, modul & limit',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: 'plans',
    label: 'Paket & Modul',
    desc: 'Matriks fitur platform',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 'landing',
    label: 'Landing Page',
    desc: 'CMS marketing',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm4 2h8M8 11h8M8 15h5" />
      </svg>
    ),
  },
  {
    id: 'ppob',
    label: 'PPOB Master',
    desc: 'Pengaturan API PPOB',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'broadcasts',
    label: 'Pengumuman',
    desc: 'Pesan ke semua tenant',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
  },
  {
    id: 'agrapay',
    label: 'AgraPay',
    desc: 'Deposit & Penarikan',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    subItems: [
      { id: 'deposits', label: 'Deposit Masuk' },
      { id: 'withdrawals', label: 'Tarik Tunai (Withdraw)' }
    ]
  },
  {
    id: 'settings',
    label: 'Pengaturan Global',
    desc: 'Konfigurasi fitur sentral',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const SECTION_META = {
  overview: { title: 'Dashboard Platform', subtitle: 'Pantau pertumbuhan tenant, langganan, dan aktivitas AGRAPos.' },
  tenants: { title: 'Manajemen Tenant', subtitle: 'Kelola langganan, modul fitur, limit kuota, status, dan follow-up pelanggan.' },
  plans: { title: 'Paket & Modul Platform', subtitle: 'Matriks fitur per paket langganan — referensi saat assign tenant.' },
  landing: { title: 'CMS Landing Page', subtitle: 'Edit konten marketing yang tampil untuk semua pengunjung.' },
  ppob: { title: 'PPOB Master', subtitle: 'Konfigurasi provider PPOB (Digiflazz) dan margin keuntungan global platform.' },
  broadcasts: { title: 'Broadcast Pengumuman', subtitle: 'Pesan akan muncul di dashboard seluruh Tenant.' },
  deposits: { title: 'Permintaan Deposit', subtitle: 'Setujui atau tolak permintaan Top Up Manual dari Tenant.' },
  withdrawals: { title: 'Permintaan Withdraw', subtitle: 'Persetujuan penarikan saldo AgraPay tenant ke rekening bank.' },
  settings: { title: 'Pengaturan Global', subtitle: 'Kontrol fitur-fitur platform (Feature Toggles) secara terpusat.' },
};

export default function SuperAdminShell({
  section,
  onSectionChange,
  toast,
  onLock,
  onBack,
  onPreview,
  showPreview,
  headerActions,
  children,
}) {
  const meta = SECTION_META[section] || SECTION_META.overview;
  const [openMenus, setOpenMenus] = useState({ agrapay: true });

  const toggleMenu = (id) => {
    setOpenMenus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-slate-950 text-white shrink-0 fixed inset-y-0 left-0 z-50">
        <div className="px-5 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src="https://i.ibb.co.com/kVYjtTcc/Frame-2-1.png" alt="Logo" className="h-8 w-auto object-contain" />
            <div>
              <p className="font-bold text-sm tracking-tight">AGRAPos</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isSubItemActive = item.subItems && item.subItems.some(sub => sub.id === section);
            const active = section === item.id || isSubItemActive;

            if (item.subItems) {
              const isOpen = openMenus[item.id];
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleMenu(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-left transition-all ${
                      active || isOpen
                        ? 'bg-white/5 text-slate-200'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={active ? 'text-teal-400' : 'text-slate-500'}>{item.icon}</span>
                      <span>
                        <span className="block text-sm font-semibold">{item.label}</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">{item.desc}</span>
                      </span>
                    </div>
                    <svg className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="pl-11 pr-2 py-1 space-y-1 border-l-2 border-slate-800 ml-5">
                      {item.subItems.map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => onSectionChange(sub.id)}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                            section === sub.id ? 'bg-teal-500/20 text-teal-300' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                  active
                    ? 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <span className={active ? 'text-teal-400' : 'text-slate-500'}>{item.icon}</span>
                <span>
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">{item.desc}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <div className="px-3 py-2 rounded-lg bg-white/5 text-[10px] text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
            Sistem operasional
          </div>
          <button
            type="button"
            onClick={onLock}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Kunci Panel
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-64 min-w-0">
        {/* Mobile nav */}
        <div className="lg:hidden sticky top-0 z-40 bg-slate-950 px-4 py-3 flex gap-2 overflow-x-auto">
          {NAV_ITEMS.flatMap((item) => item.subItems ? item.subItems : [item]).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold ${
                section === item.id ? 'bg-teal-500 text-white' : 'bg-white/10 text-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Top bar */}
        <header className="sticky top-0 lg:top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-1">Platform Console</p>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{meta.title}</h1>
              <p className="text-sm text-slate-500 mt-0.5 max-w-xl">{meta.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {headerActions}
              {showPreview && onPreview && (
                <button
                  type="button"
                  onClick={onPreview}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview
                </button>
              )}
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Keluar
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Toast */}
        {toast && (
          <div className="fixed top-20 right-4 z-[9999] max-w-sm animate-in slide-in-from-top-2">
            <div
              className={`px-4 py-3 rounded-xl shadow-xl border text-sm font-medium flex items-start gap-3 ${
                toast.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : toast.type === 'info'
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <span className="text-lg leading-none">
                {toast.type === 'error' ? '✕' : toast.type === 'info' ? 'ℹ' : '✓'}
              </span>
              {toast.msg}
            </div>
          </div>
        )}

        <main className="p-4 sm:p-6 pb-16">{children}</main>
      </div>
    </div>
  );
}

export { NAV_ITEMS };
