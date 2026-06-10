import React, { useState, useEffect } from 'react';

export default function PpobTopup({ currentUser, onNavigate, onShowToast }) {
  const rawLocalUser = localStorage.getItem('pos_current_user');
  const parsedLocalUser = rawLocalUser ? JSON.parse(rawLocalUser) : null;
  const activeUser = currentUser || parsedLocalUser || {};

  const [ppobBalance, setPpobBalance] = useState(0);
  const [platformSettings, setPlatformSettings] = useState({
    deposit_qris_enabled: true,
    deposit_transfer_enabled: true
  });
  const [topupNominal, setTopupNominal] = useState('');
  const [topupMethod, setTopupMethod] = useState('otomatis'); // otomatis | manual
  const [proofImage, setProofImage] = useState(null);
  const [isTopupLoading, setIsTopupLoading] = useState(false);

  useEffect(() => {
    if (!activeUser?.tenant_id) return;
    
    // Fetch PPOB balance
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ppob/balance?tenant_id=${activeUser.tenant_id}&outlet_id=${activeUser.outlet_id || ''}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPpobBalance(data.balance);
        }
      })
      .catch(console.error);

    // Fetch Global Platform Settings (Feature Toggles)
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/saas/platform-settings`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPlatformSettings(data.features || { deposit_qris_enabled: true, deposit_transfer_enabled: true });

          const qrisOn = data.features?.deposit_qris_enabled !== false;
          const transferOn = data.features?.deposit_transfer_enabled !== false;
          if (!qrisOn && transferOn) setTopupMethod('manual');
          if (qrisOn && !transferOn) setTopupMethod('otomatis');
        }
      })
      .catch(console.error);
  }, [activeUser?.tenant_id, activeUser?.outlet_id]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        return onShowToast ? onShowToast("Ukuran file maksimal 2MB") : alert("Ukuran file maksimal 2MB");
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyAccount = (text) => {
    navigator.clipboard.writeText(text);
    if (onShowToast) {
      onShowToast("Nomor rekening berhasil disalin!");
    } else {
      alert("Nomor rekening berhasil disalin!");
    }
  };

  const handleTopupSubmit = async () => {
    const amount = Number(topupNominal.replace(/\D/g, ''));
    if (!amount || amount < 10000) {
      return onShowToast ? onShowToast("Nominal tidak valid. Minimal Rp 10.000.") : alert("Nominal tidak valid. Minimal Rp 10.000.");
    }

    if (topupMethod === 'manual') {
      if (!proofImage) {
        return onShowToast ? onShowToast("Silakan upload bukti transfer terlebih dahulu!") : alert("Silakan upload bukti transfer terlebih dahulu!");
      }
      setIsTopupLoading(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ppob/manual-deposit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_id: activeUser.tenant_id,
            outlet_id: activeUser.outlet_id || null,
            amount,
            proof_image: proofImage
          })
        });
        const data = await res.json();
        if (data.success) {
          if (onShowToast) onShowToast(data.message); else alert(data.message);
          setTopupNominal('');
          setProofImage(null);
          onNavigate('ppob-history');
        } else {
          if (onShowToast) onShowToast(data.error || "Gagal mengirim permintaan."); else alert(data.error || "Gagal mengirim permintaan.");
        }
      } catch (e) {
        if (onShowToast) onShowToast("Terjadi kesalahan jaringan."); else alert("Terjadi kesalahan jaringan.");
      } finally {
        setIsTopupLoading(false);
      }
      return;
    }

    setIsTopupLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ppob/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: activeUser.tenant_id,
          outlet_id: activeUser.outlet_id || null,
          amount
        })
      });
      const data = await res.json();
      if (data.success && data.invoice_url) {
        window.location.href = data.invoice_url;
      } else {
        alert(data.error || "Gagal membuat invoice");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsTopupLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 text-slate-800 overflow-y-auto flex flex-col font-sans">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { transform: translateY(15px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .saas-page-anim {
          animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      {/* Floating Glowing Orbs for Colorful Background */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-teal-500/[0.06] rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-emerald-500/[0.05] rounded-full blur-[80px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm shrink-0">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-xs tracking-wider uppercase"
          title="Kembali ke Dashboard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Dashboard
        </button>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-teal-50 text-teal-700 rounded-full border border-teal-200 shadow-sm shadow-teal-500/5">
            AgraPay Portal
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 space-y-6 saas-page-anim relative z-10">
        
        {/* Page Title Header */}
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 bg-clip-text text-transparent tracking-tight leading-none">
            Top Up AgraPay
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Isi ulang saldo deposit PPOB secara instan atau manual</p>
        </div>

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start pb-16">
          
          {/* Column 1: The Form (3/5 space) */}
          <div className="lg:col-span-3 bg-white border-t-4 border-t-teal-600 border-l border-r border-b border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-200/30 space-y-6">
            
            {/* Method Tabs */}
            {(platformSettings.deposit_qris_enabled !== false || platformSettings.deposit_transfer_enabled !== false) && (
              <div className="flex border-b border-slate-200">
                {platformSettings.deposit_qris_enabled !== false && (
                  <button
                    type="button"
                    onClick={() => setTopupMethod('otomatis')}
                    className={`pb-4 px-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all mr-6
                      ${topupMethod === 'otomatis' ? 'border-teal-600 text-teal-700 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    ⚡ Otomatis (QRIS/VA)
                  </button>
                )}
                {platformSettings.deposit_transfer_enabled !== false && (
                  <button
                    type="button"
                    onClick={() => setTopupMethod('manual')}
                    className={`pb-4 px-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all
                      ${topupMethod === 'manual' ? 'border-teal-650 text-teal-700 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    🏦 Manual (Transfer Bank)
                  </button>
                )}
              </div>
            )}

            {platformSettings.deposit_qris_enabled === false && platformSettings.deposit_transfer_enabled === false && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-bold text-center">
                ⚠️ Portal deposit sedang ditangguhkan sementara.
              </div>
            )}

            {/* Amount input block */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Nominal Pengisian</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">Rp</span>
                <input
                  type="text"
                  value={topupNominal}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setTopupNominal(val ? Number(val).toLocaleString('id-ID') : '');
                  }}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4.5 pl-12 pr-4 text-2xl font-bold font-mono text-slate-800 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 focus:bg-white focus:outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Fast selection chips */}
            <div className="grid grid-cols-3 gap-2">
              {[50000, 100000, 200000, 300000, 500000, 1000000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTopupNominal(amt.toLocaleString('id-ID'))}
                  className={`py-3 rounded-xl text-xs font-bold font-mono border transition-all active:scale-95
                    ${topupNominal === amt.toLocaleString('id-ID')
                      ? 'border-teal-605 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-extrabold shadow-md shadow-teal-500/15 scale-[1.02]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-350'}`}
                >
                  {amt >= 1000000 ? `${amt / 1000000} Jt` : `${amt / 1000}k`}
                </button>
              ))}
            </div>

            {/* Payment Method / Manual bank details */}
            {topupMethod === 'otomatis' ? (
              <div className="bg-[#f8fffe] border border-[#d1ede8] rounded-2xl p-4 flex gap-3 items-start animate-in fade-in duration-200">
                <span className="text-teal-650 text-lg">💡</span>
                <p className="text-[10px] font-bold text-[#0f766e] leading-relaxed">
                  Tautan pengisian saldo online aman akan dihasilkan oleh payment gateway. Anda dapat menggunakan scan **QRIS** dari aplikasi perbankan & dompet digital mana saja atau transfer melalui **Virtual Account**. Saldo terupdate secara instan.
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 text-xs font-bold">
                    <span>🏦</span>
                    <span className="uppercase tracking-wider">TRANSFER MANUAL KE REKENING ADMIN</span>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bank Transfer</p>
                      <p className="font-mono text-sm font-black text-slate-800 mt-0.5">
                        {platformSettings?.admin_bank_account || 'BCA : 7285034621 A/N : HAFIDZ AGUS PRATAMA'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyAccount(platformSettings?.admin_bank_account || 'BCA : 7285034621 A/N : HAFIDZ AGUS PRATAMA')}
                      className="text-[10px] font-black uppercase text-teal-700 hover:text-teal-900 border border-teal-200 bg-teal-50 hover:bg-teal-100/65 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Salin
                    </button>
                  </div>
                </div>

                {/* Upload Proof */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Bukti Transfer (Format Gambar, Max 2MB)</label>
                  {!proofImage ? (
                    <label className="border-2 border-dashed border-slate-200 hover:border-teal-500 bg-slate-50 hover:bg-teal-50/10 transition-all rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer group">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400 group-hover:text-teal-600 mb-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-bold text-slate-550 group-hover:text-teal-700">Pilih Foto Bukti</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                      <img src={proofImage} alt="Bukti Transfer" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setProofImage(null)}
                          className="bg-red-600 hover:bg-red-750 text-white font-bold text-xs uppercase px-4 py-2 rounded-xl"
                        >
                          Ganti Bukti
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Estimate Row */}
            {topupNominal && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center text-xs font-bold text-slate-550">
                <span>Estimasi Saldo Akhir:</span>
                <span className="font-mono text-emerald-650 font-black">
                  Rp {(Number(ppobBalance) + Number(topupNominal.replace(/\D/g, ''))).toLocaleString('id-ID')}
                </span>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2">
              {!(platformSettings.deposit_qris_enabled === false && platformSettings.deposit_transfer_enabled === false) && (
                <button
                  onClick={handleTopupSubmit}
                  disabled={isTopupLoading || !topupNominal || Number(topupNominal.replace(/\D/g, '')) < 10000 || (topupMethod === 'manual' && !proofImage)}
                  className="w-full py-4 rounded-[1.25rem] text-xs font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer text-white shadow-lg shadow-teal-600/10 hover:shadow-teal-650/20 hover:brightness-105 active:scale-[0.98]
                    disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed
                    bg-gradient-to-r from-teal-700 to-emerald-600"
                >
                  {isTopupLoading ? (
                    <>
                      <span className="w-4.5 h-4.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      {topupMethod === 'otomatis' ? 'Lanjutkan Pembayaran Instan' : 'Kirim Permintaan & Bukti'}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>

          {/* Column 2: Status & Info (2/5 space) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Balance Card Panel - Colorful gradient card */}
            <div className="bg-gradient-to-br from-teal-700 via-teal-650 to-emerald-655 text-white rounded-3xl p-6 shadow-xl shadow-teal-750/15 border-none space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
              <div className="relative z-10">
                <p className="text-[10px] text-teal-200 font-extrabold uppercase tracking-widest leading-none">Saldo AgraPay Aktif</p>
                <h2 className="text-3xl font-extrabold font-mono mt-2 text-white">
                  Rp {Number(ppobBalance).toLocaleString('id-ID')}
                </h2>
              </div>
              <div className="text-[10px] text-teal-100/80 leading-relaxed pt-3.5 border-t border-white/10 relative z-10">
                Saldo AgraPay digunakan untuk transaksi tagihan PPOB (Pulsa, Token PLN, Paket Data, PDAM, dll) di sistem POS.
              </div>
            </div>

            {/* Help guidelines widget */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
              <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <span>🛡️</span> KEAMANAN TRANSAKSI
              </h4>
              <ul className="text-[10px] text-slate-550 font-bold space-y-2.5 list-disc pl-4 leading-relaxed">
                <li>Pembayaran otomatis diverifikasi secara langsung oleh gateway pembayaran dalam hitungan detik.</li>
                <li>Pastikan nomor rekening pengirim sesuai untuk mempercepat validasi deposit manual.</li>
                <li>Hubungi Admin jika saldo tidak bertambah dalam waktu 15 menit.</li>
              </ul>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
