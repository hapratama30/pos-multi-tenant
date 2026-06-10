import React, { useState, useEffect } from 'react';

const AVAILABLE_FEATURES = [
  { id: 'pos', name: '⚡ Kasir POS', desc: 'Aplikasi kasir utama tempat input order/transaksi' },
  { id: 'history', name: '📜 Riwayat Transaksi', desc: 'Halaman daftar riwayat transaksi & struk' },
  { id: 'catalog', name: '📦 Katalog Produk', desc: 'Halaman manajemen produk, harga & kategori' },
  { id: 'variants', name: '🏷️ Varian Produk', desc: 'Halaman manajemen varian, topping, & ekstra' },
  { id: 'stock', name: '📋 Stok Bahan', desc: 'Halaman manajemen gudang & mutasi stok bahan baku' },
  { id: 'customers', name: '👥 Member & Pelanggan', desc: 'Halaman database pelanggan & poin loyalitas' },
  { id: 'discounts', name: '🎁 Diskon & Promo', desc: 'Halaman manajemen diskon otomatis & potongan harga' },
  { id: 'expenses', name: '💸 Pengeluaran', desc: 'Halaman pencatatan beban biaya operasional toko' },
  { id: 'reports', name: '📊 Laporan & Analitik', desc: 'Halaman analitik omzet, laba kotor & grafik penjualan' },
  { id: 'staff', name: '🧑‍💼 Manajemen Staff', desc: 'Halaman tambah/edit hak akses kasir & staff' },
  { id: 'outlets', name: '🏪 Multi Outlet / Cabang', desc: 'Halaman manajemen cabang outlet toko' },
  { id: 'shifts', name: '🕐 Shift Kas', desc: 'Halaman pencatatan buka/tutup kasir' },
  { id: 'ppob', name: '📱 Tagihan PPOB', desc: 'Layanan isi ulang pulsa, token listrik, & e-money' },
];

export default function SuperAdminSettings({ showToast }) {
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/saas/platform-settings`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFeatures(data.features || {});
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = (key) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleInputChange = (key, value) => {
    setFeatures(prev => ({ ...prev, [key]: value }));
  };

  const handleFeatureStatusChange = (featureId, status) => {
    setFeatures(prev => {
      const pos_features = { ...(prev.pos_features || {}) };
      pos_features[featureId] = {
        ...(pos_features[featureId] || {}),
        status
      };
      return { ...prev, pos_features };
    });
  };

  const handleFeatureMessageChange = (featureId, message) => {
    setFeatures(prev => {
      const pos_features = { ...(prev.pos_features || {}) };
      pos_features[featureId] = {
        ...(pos_features[featureId] || {}),
        popupMessage: message
      };
      return { ...prev, pos_features };
    });
  };

  const handleSaveClick = () => {
    const savedPin = localStorage.getItem('pos_superadmin_pin');
    if (savedPin) {
      executeSave(savedPin);
    } else {
      setShowPinModal(true);
    }
  };

  const executeSave = async (pin) => {
    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/saas/platform-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, features })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Berhasil', 'Pengaturan global berhasil disimpan!', 'success');
        localStorage.setItem('pos_superadmin_pin', pin);
        setShowPinModal(false);
        setPinInput('');
      } else {
        showToast('Gagal', data.error || 'Terjadi kesalahan.', 'error');
        if (data.error === 'Unauthorized') localStorage.removeItem('pos_superadmin_pin');
      }
    } catch (err) {
      showToast('Gagal', 'Terjadi kesalahan jaringan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold">Memuat pengaturan...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide flex items-center gap-3 mb-6">
          <span className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">⚙️</span>
          Feature Toggles (Platform Settings)
        </h2>
        
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          Gunakan tombol di bawah ini untuk mengaktifkan atau menonaktifkan fitur secara global (berlaku untuk semua Tenant). Perubahan akan langsung berdampak pada tampilan aplikasi pengguna setelah Anda menekan tombol "Simpan Perubahan".
        </p>

        <div className="space-y-4">
          {/* Item 1: QRIS / VA */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
            <div className="pr-4">
              <h3 className="font-bold text-slate-800 text-sm">Deposit via Otomatis (QRIS / Virtual Account)</h3>
              <p className="text-xs text-slate-500 mt-1">Mengizinkan Tenant untuk melakukan Top Up saldo menggunakan Payment Gateway Xendit secara otomatis.</p>
            </div>
            <button 
              onClick={() => handleToggle('deposit_qris_enabled')}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${features.deposit_qris_enabled !== false ? 'bg-indigo-500' : 'bg-slate-300'}`}
            >
              <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${features.deposit_qris_enabled !== false ? 'translate-x-7' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Item 2: Transfer Manual */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
            <div className="pr-4">
              <h3 className="font-bold text-slate-800 text-sm">Deposit via Transfer Manual (Konfirmasi WA)</h3>
              <p className="text-xs text-slate-500 mt-1">Mengizinkan Tenant melakukan Top Up dengan mentransfer ke rekening Bank Anda dan konfirmasi via WhatsApp.</p>
            </div>
            <button 
              onClick={() => handleToggle('deposit_transfer_enabled')}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${features.deposit_transfer_enabled !== false ? 'bg-indigo-500' : 'bg-slate-300'}`}
            >
              <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${features.deposit_transfer_enabled !== false ? 'translate-x-7' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="text-xl">🏦</span> Rekening Bank Super Admin
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Teks nomor rekening yang akan ditampilkan pada halaman "Top Up Manual" bagi para Tenant.
              </p>
            </div>
            <input
              type="text"
              className="w-full md:w-72 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Contoh: BCA 123456 a.n PT Agrapos"
              value={features.admin_bank_account || ''}
              onChange={(e) => handleInputChange('admin_bank_account', e.target.value)}
            />
          </div>

          {/* Bisa ditambahkan toggle lain disini */}
          
          <div className="border-t border-slate-200/80 pt-8 mt-8 space-y-6">
            <h3 className="text-base font-black text-slate-800 uppercase tracking-wide flex items-center gap-3">
              <span className="p-2 bg-teal-50 text-teal-600 rounded-xl">🛡️</span>
              Manajemen Fitur POS (Status & Pop-up)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Atur status akses untuk setiap fitur utama di aplikasi kasir POS. Anda dapat menyembunyikan fitur sepenuhnya atau mengaktifkan mode pop-up informasi kustom (misal jika fitur sedang dalam pemeliharaan atau pengembangan).
            </p>

            <div className="grid gap-4">
              {AVAILABLE_FEATURES.map((feat) => {
                const config = features.pos_features?.[feat.id] || { status: 'active', popupMessage: '' };
                return (
                  <div key={feat.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{feat.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{feat.desc}</p>
                      </div>
                      
                      <select
                        value={config.status || 'active'}
                        onChange={(e) => handleFeatureStatusChange(feat.id, e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-indigo-500 min-w-[170px] cursor-pointer"
                      >
                        <option value="active">🟢 Aktif (Normal)</option>
                        <option value="hidden">🔴 Sembunyikan (Hide)</option>
                        <option value="popup">🟡 Pop-up Pengumuman</option>
                      </select>
                    </div>

                    {config.status === 'popup' && (
                      <div className="border-t border-slate-200/60 pt-3">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                          Pesan Pop-up Kustom (Kosongkan untuk pesan default)
                        </label>
                        <textarea
                          rows={2}
                          className="w-full bg-white border border-slate-200 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 text-slate-700 font-semibold"
                          placeholder="Contoh: Fitur ini sedang dikembangkan oleh Tim Developer AGRAPos dan akan segera rilis!"
                          value={config.popupMessage || ''}
                          onChange={(e) => handleFeatureMessageChange(feat.id, e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
          <button 
            onClick={handleSaveClick}
            disabled={saving}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-500/30 disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      {/* MODAL PIN CUSTOM */}
      {showPinModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-black text-slate-800 text-lg uppercase tracking-wide mb-1">Otorisasi Super Admin</h3>
              <p className="text-xs text-slate-500 mb-6">Masukkan PIN keamanan Anda untuk menerapkan perubahan global ini.</p>
              
              <input
                id="superadmin-pin-input"
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••••••"
                className="w-full text-center text-slate-900 font-bold text-2xl p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:outline-none transition-all mb-6"
                autoFocus
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    executeSave(pinInput);
                  }
                }}
              />

              <div className="flex gap-3">
                <button 
                  onClick={() => { setShowPinModal(false); setPinInput(''); }}
                  disabled={saving}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button 
                  onClick={() => executeSave(pinInput)}
                  disabled={saving || !pinInput}
                  className="flex-1 py-3 text-sm font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {saving ? 'Proses...' : 'Konfirmasi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
