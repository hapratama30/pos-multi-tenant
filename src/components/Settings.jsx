import React, { useState } from 'react';
import StaffManager from './StaffManager';
import ProfileSettings from './settings/ProfileSettings';
import BusinessSettings from './settings/BusinessSettings';
import PrinterSettings from './settings/PrinterSettings';
import OutletManager from './OutletManager';
import PaymentSettings from './settings/PaymentSettings';
import CashShiftManager from './CashShiftManager';
// Import VerticalModulesHub dihapus

// =====================================================================
// KOMPONEN MODAL KONFIRMASI LOGOUT YANG CANTIK
// =====================================================================
function LogoutConfirmModal({ onConfirm, onCancel, userName }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        animation: 'fadeInOverlay 0.2s ease'
      }}
      onClick={onCancel}
    >
      <style>{`
        @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUpModal { from { opacity: 0; transform: translateY(24px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '24px',
          padding: '32px 28px 28px',
          maxWidth: '380px',
          width: '100%',
          boxShadow: '0 32px 64px rgba(15,23,42,0.2), 0 0 0 1px rgba(15,23,42,0.05)',
          animation: 'slideUpModal 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          textAlign: 'center'
        }}
      >
        {/* Ikon Peringatan */}
        <div style={{
          width: '64px', height: '64px',
          background: 'linear-gradient(135deg, #fff5f5, #ffe3e3)',
          borderRadius: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '28px',
          border: '1px solid #fecaca'
        }}>
          🚪
        </div>

        {/* Judul */}
        <h3 style={{
          margin: '0 0 8px',
          fontSize: '18px',
          fontWeight: 900,
          color: '#0f172a',
          letterSpacing: '-0.02em',
          textTransform: 'uppercase'
        }}>
          Keluar dari Sesi?
        </h3>

        {/* Deskripsi */}
        <p style={{
          margin: '0 0 28px',
          fontSize: '13px',
          color: '#64748b',
          fontWeight: 500,
          lineHeight: 1.6
        }}>
          Anda akan keluar dari akun <strong style={{ color: '#0f172a' }}>{userName}</strong>.<br />
          Pastikan semua transaksi sudah tersimpan sebelum keluar.
        </p>

        {/* Tombol Aksi */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '13px 0',
              background: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: '14px',
              fontWeight: 800,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => e.target.style.background = '#e2e8f0'}
            onMouseLeave={e => e.target.style.background = '#f1f5f9'}
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '13px 0',
              background: 'linear-gradient(135deg, #f43f5e, #f97316)',
              color: 'white',
              border: 'none',
              borderRadius: '14px',
              fontWeight: 900,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(244,63,94,0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 12px 24px rgba(244,63,94,0.4)'; }}
            onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 8px 20px rgba(244,63,94,0.3)'; }}
          >
            Ya, Keluar
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// KOMPONEN SETTINGS UTAMA
// =====================================================================
export default function Settings({ tenantId, currentUser, onLogout, outlets = [], selectedOutletId, onOutletChange, onNavigate, onTriggerUpgrade, platformSettings, onTriggerFeaturePopup }) {
  const [activeTab, setActiveTab] = useState('menu');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [pendingOutletId, setPendingOutletId] = useState(null);

  const [livePlanId, setLivePlanId] = useState(currentUser?.plan_id || currentUser?.tenants?.plan_id || currentUser?.tenant?.plan_id || 'free');
  const [liveModules, setLiveModules] = useState(currentUser?.enabled_modules || currentUser?.tenants?.enabled_modules || currentUser?.tenant?.enabled_modules || []);

  React.useEffect(() => {
    if (!tenantId) return;
    import('../supabaseClient').then(({ supabase }) => {
      Promise.all([
        supabase.from('tenants').select('enabled_modules').eq('tenant_id', tenantId).maybeSingle(),
        supabase.from('tenant_subscriptions').select('plan_id').eq('tenant_id', tenantId).maybeSingle()
      ]).then(([{ data: tenantData }, { data: subData }]) => {
        if (tenantData && tenantData.enabled_modules) {
          setLiveModules(tenantData.enabled_modules);
        }
        if (subData && subData.plan_id) {
          setLivePlanId(subData.plan_id);
        }
      }).catch(console.error);
    });
  }, [tenantId]);

  const userName = currentUser?.name || 'User Kasir';
  const userRole = currentUser?.role || 'Staff';

  const isPro = livePlanId !== 'free';

  const checkSettingModuleAccess = (itemId) => {
    const settingToModuleMap = {
      'staff': 'staff',
      'outlets': 'outlets',
      'shifts': 'shifts'
    };
    const requiredModule = settingToModuleMap[itemId];
    if (!requiredModule) return true;
    
    if (isPro) return true;
    if (!Array.isArray(liveModules)) return false;
    if (liveModules.includes('all')) return true;
    return liveModules.includes(requiredModule);
  };

  const hasSettingsPermission = () => {
    if (userRole === 'Admin' || userRole === 'Owner') return true;
    const perms = Array.isArray(currentUser?.permissions)
      ? currentUser.permissions
      : [];
    return perms.includes('settings');
  };

  const menuItems = [
    { id: 'profile', title: 'Profile Pengguna', desc: 'Atur info akun, nama, email, dan ganti password login Anda', icon: '👤' },
    { id: 'business', title: 'Nama Usaha & Toko', desc: 'Ubah nama laundry/toko, alamat, nomor telepon, dan identitas tenant', icon: '🏪' },
    { id: 'staff', title: 'Manajemen Staff', desc: 'Kelola hak akses, tambah kasir baru, atau nonaktifkan akun karyawan', icon: '👥' },
    { id: 'printer', title: 'Setting Printer Thermal', desc: 'Hubungkan printer struk kasir bluetooth, pilih ukuran kertas 58mm / 80mm', icon: '🖨️' },
    { id: 'payments', title: 'Metode Pembayaran & Xendit', desc: 'Registrasi QRIS mandiri & Virtual Account otomatis via Xendit Gateway', icon: '💳' },
    { id: 'outlets', title: 'Cabang / Outlet', desc: 'Kelola multi-cabang untuk laporan per lokasi', icon: '🏢' },
    { id: 'shifts', title: 'Shift Kasir', desc: 'Kelola saldo laci, modal, dan rekonsiliasi kas', icon: '💰' }
  ];

  if (activeTab === 'staff') {
    if (!checkSettingModuleAccess('staff')) {
      setActiveTab('menu');
      onTriggerUpgrade && onTriggerUpgrade('staff');
      return null;
    }
    return <StaffManager currentUser={currentUser} selectedOutletId={selectedOutletId} onBack={() => setActiveTab('menu')} />;
  }
  if (activeTab === 'profile') {
    return <ProfileSettings currentUser={currentUser} onBack={() => setActiveTab('menu')} />;
  }
  if (activeTab === 'business') {
    if (!selectedOutletId && outlets.length > 0) {
      alert('Silakan pilih cabang / outlet secara spesifik terlebih dahulu untuk mengedit pengaturan.');
      setActiveTab('menu');
      return null;
    }
    return <BusinessSettings tenantId={tenantId} selectedOutletId={selectedOutletId} onBack={() => setActiveTab('menu')} />;
  }
  if (activeTab === 'printer') {
    if (!selectedOutletId && outlets.length > 0) {
      alert('Silakan pilih cabang / outlet secara spesifik terlebih dahulu untuk mengedit pengaturan.');
      setActiveTab('menu');
      return null;
    }
    return <PrinterSettings tenantId={tenantId} selectedOutletId={selectedOutletId} onBack={() => setActiveTab('menu')} />;
  }
  if (activeTab === 'payments') {
    if (!selectedOutletId && outlets.length > 0) {
      alert('Silakan pilih cabang / outlet secara spesifik terlebih dahulu untuk mengedit pengaturan.');
      setActiveTab('menu');
      return null;
    }
    return (
      <PaymentSettings 
        tenantId={tenantId} 
        selectedOutletId={selectedOutletId} 
        onBack={() => setActiveTab('menu')} 
        onTriggerUpgrade={onTriggerUpgrade}
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 pb-24 overflow-x-hidden -mt-4 -mx-4 sm:-mt-6 sm:-mx-6 lg:-mt-8 lg:-mx-8 font-sans">

      {/* BACKGROUND HEADER */}
      <div className="absolute top-0 left-0 right-0 h-64 md:h-76 bg-gradient-to-b from-teal-700 via-teal-600 to-transparent rounded-b-[3rem] z-0 opacity-95">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.12),transparent_50%)]" />
      </div>

      {/* MODAL KONFIRMASI PINDAH CABANG */}
      {pendingOutletId !== null && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                🏢
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Pindah Cabang?</h3>
              <p className="text-sm text-slate-500 mb-6">
                Apakah Anda yakin ingin berpindah mengelola cabang{' '}
                <span className="font-bold text-slate-700">
                  {outlets.find(o => String(o.id) === pendingOutletId)?.name}
                </span>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPendingOutletId(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    onOutletChange(pendingOutletId ? Number(pendingOutletId) : null);
                    setPendingOutletId(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30"
                >
                  Ya, Pindah
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI LOGOUT */}
      {showLogoutModal && (
        <LogoutConfirmModal
          userName={userName}
          onConfirm={() => {
            setShowLogoutModal(false);
            onLogout && onLogout();
          }}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}

      {/* CONTENT WRAPPER */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 pt-10 md:pt-12">
        <div className="w-full space-y-6">

          {/* HEADER */}
          <header className="text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-orange-300 text-xs md:text-sm font-black uppercase tracking-widest drop-shadow-sm">
                Sistem POS Multi-Tenant
              </p>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight drop-shadow-sm mt-1">
                PENGATURAN SISTEM
              </h1>
              <p className="text-teal-100 text-[10px] md:text-xs font-semibold uppercase tracking-wider mt-1 opacity-80">
                Kelola profil toko, integrasi hardware, dan manajemen otorisasi sistem
              </p>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {/* CARD MINI PROFIL PENGGUNA */}
            <div className="w-full bg-white p-5 rounded-3xl border border-slate-100/80 shadow-xl shadow-slate-200/40 flex items-center gap-4">
              <div className="w-14 h-14 bg-teal-50 border border-teal-100 rounded-full flex items-center justify-center text-teal-600 font-black text-xl shadow-inner shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">{userName}</h3>
                <p className="text-[10px] font-black text-orange-600 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-md inline-block uppercase tracking-wider mt-1">
                  {userRole}
                </p>
              </div>
            </div>

            {/* CARD PEMILIHAN CABANG AKTIF */}
            {outlets.length > 0 && (
              <div className="w-full bg-white p-5 rounded-3xl border border-slate-100/80 shadow-xl shadow-slate-200/40 flex flex-col justify-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center justify-between">
                  <span>🏢 Lokasi / Cabang Aktif</span>
                  <span className="bg-teal-50 text-teal-600 px-2 py-0.5 rounded text-[8px] tracking-wider border border-teal-100">SAAT INI</span>
                </label>
                {userRole === 'Owner' || userRole === 'Admin' || !currentUser?.outlet_id ? (
                  <select
                    value={selectedOutletId || ''}
                    onChange={(e) => setPendingOutletId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5 text-sm font-bold text-slate-700 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 outline-none transition-all appearance-none cursor-pointer"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        🏪 {o.name} {o.is_main ? '(Utama)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5 text-sm font-bold text-slate-600">
                    🏪 {outlets.find(o => o.id === selectedOutletId)?.name || 'Cabang Karyawan'}
                    <span className="block text-[9px] font-semibold text-slate-400 mt-1 uppercase tracking-widest">Akses Dibatasi</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* GRID DAFTAR SUB-MENU */}
          <div className="space-y-4">
            <h4 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
              Pilih Kategori Konfigurasi
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full">
              {menuItems.filter(item => {
                const mapping = {
                  'business': 'settings',
                  'printer': 'settings',
                  'payments': 'xendit',
                  'staff': 'staff',
                  'outlets': 'outlets',
                  'shifts': 'shifts'
                };
                const modId = mapping[item.id];
                if (modId && platformSettings?.pos_features?.[modId]?.status === 'hidden') {
                  return false;
                }
                return true;
              }).map((item) => {
                const isRestricted = (item.id === 'staff' || item.id === 'payments' || item.id === 'business') && !hasSettingsPermission();
                const isSaaSLocked = !checkSettingModuleAccess(item.id);

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (isRestricted) return;
                      const mapping = {
                        'business': 'settings',
                        'printer': 'settings',
                        'payments': 'xendit',
                        'staff': 'staff',
                        'outlets': 'outlets',
                        'shifts': 'shifts'
                      };
                      const modId = mapping[item.id];
                      if (modId && platformSettings?.pos_features?.[modId]?.status === 'popup') {
                        onTriggerFeaturePopup && onTriggerFeaturePopup(modId);
                        return;
                      }
                      if (isSaaSLocked) {
                        const requiredModule = {
                          'staff': 'staff',
                          'payments': 'xendit',
                          'outlets': 'outlets',
                          'shifts': 'shifts'
                        }[item.id];
                        onTriggerUpgrade && onTriggerUpgrade(requiredModule);
                        return;
                      }
                      if (['outlets', 'shifts'].includes(item.id)) {
                        onNavigate && onNavigate(item.id);
                      } else {
                        setActiveTab(item.id);
                      }
                    }}
                    className={`flex flex-col justify-between text-left bg-white border rounded-3xl p-4 md:p-6 transition-all duration-300 ease-out group min-h-[160px] md:min-h-[190px] ${isRestricted
                        ? 'opacity-45 cursor-not-allowed border-dashed border-slate-200'
                        : 'border-slate-200 hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-600/8 active:scale-95 shadow-sm'
                      }`}
                  >
                    <div className="text-xl md:text-2xl p-3 md:p-3.5 bg-teal-50 border border-teal-100 rounded-2xl group-hover:bg-teal-100 group-hover:border-teal-200 transition-all duration-300 inline-block self-start shadow-sm relative">
                      {item.icon}
                      {isSaaSLocked && (
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
                    <div className="pt-3 flex-1 w-full flex flex-col justify-end">
                      <h3 className="text-[11px] md:text-sm font-black text-slate-800 group-hover:text-teal-600 transition-colors duration-300 leading-tight flex flex-wrap items-center gap-1.5">
                        {item.title}
                        {isRestricted && (
                          <span className="block text-[8px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded uppercase mt-1 w-fit">
                            🔒 Owner
                          </span>
                        )}
                        {isSaaSLocked && (
                          <span className="block text-[8px] font-black text-white bg-gradient-to-r from-amber-500 to-orange-500 px-1.5 py-0.5 rounded uppercase mt-1 w-fit">
                            ⭐ PRO
                          </span>
                        )}
                      </h3>
                      <p className="text-[9px] md:text-[10px] text-slate-400 font-semibold leading-relaxed mt-1 line-clamp-2 md:line-clamp-3">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* INFO TENANT ENGINE & LOGOUT - BOTTOM SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full pt-4 border-t border-slate-100">
            <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider">Tenant ID:</span>
                <span className="font-mono bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-xs text-slate-700 font-black">{tenantId}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider">Database Engine:</span>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
                  Supabase Hybrid Cloud ⚡
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowLogoutModal(true)}
              className="w-full py-4 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-orange-500/25 hover:from-rose-600 hover:to-orange-600 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Keluar dari Akun Kasir ✕
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}