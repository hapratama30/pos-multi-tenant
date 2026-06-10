import React, { useState, useEffect } from 'react';

export default function PpobWithdraw({ currentUser, onNavigate, onShowToast }) {
  const rawLocalUser = localStorage.getItem('pos_current_user');
  const parsedLocalUser = rawLocalUser ? JSON.parse(rawLocalUser) : null;
  const activeUser = currentUser || parsedLocalUser || {};

  const [ppobBalance, setPpobBalance] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawBank, setWithdrawBank] = useState('');
  const [withdrawAccNum, setWithdrawAccNum] = useState('');
  const [withdrawAccName, setWithdrawAccName] = useState('');
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
  const [withdrawErr, setWithdrawErr] = useState('');

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
  }, [activeUser?.tenant_id, activeUser?.outlet_id]);

  const handleWithdraw = async (e) => {
    if (e) e.preventDefault();
    
    const amountVal = Number(withdrawAmount);
    if (!amountVal || amountVal < 10000) {
      setWithdrawErr('Minimal penarikan Rp 10.000');
      return;
    }
    if (amountVal > ppobBalance) {
      setWithdrawErr('Saldo tidak mencukupi');
      return;
    }
    if (!withdrawBank || !withdrawAccNum || !withdrawAccName) {
      setWithdrawErr('Mohon lengkapi data rekening');
      return;
    }

    setIsWithdrawLoading(true);
    setWithdrawErr('');
    try {
      const { supabase } = await import('../supabaseClient');
      const { error: insertError } = await supabase
        .from('tenant_withdrawals')
        .insert({
          tenant_id: activeUser.tenant_id,
          amount: amountVal,
          bank_name: withdrawBank,
          account_number: withdrawAccNum,
          account_name: withdrawAccName,
          status: 'pending'
        });

      if (insertError) throw insertError;

      const successMsg = 'Permintaan penarikan (withdraw) berhasil dikirim dan sedang diproses oleh Admin.';
      if (onShowToast) onShowToast(successMsg); else alert(successMsg);
      setWithdrawAmount('');
      setWithdrawBank('');
      setWithdrawAccNum('');
      setWithdrawAccName('');
      onNavigate('ppob-history');
    } catch (err) {
      setWithdrawErr(err.message || 'Gagal membuat permintaan penarikan.');
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-gradient-to-br from-slate-50 via-orange-50/30 to-amber-50/20 text-slate-800 overflow-y-auto flex flex-col font-sans">
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
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-orange-500/[0.06] rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-amber-500/[0.05] rounded-full blur-[80px] pointer-events-none" />

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
          <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-orange-50 text-orange-700 rounded-full border border-orange-200 shadow-sm shadow-orange-500/5">
            AgraPay Portal
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 space-y-6 saas-page-anim relative z-10">
        
        {/* Page Title Header */}
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 bg-clip-text text-transparent tracking-tight leading-none">
            Tarik Saldo (Withdraw)
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Ajukan penarikan dana dari saldo AgraPay ke Rekening bank atau e-wallet</p>
        </div>

        {/* Validation Alert */}
        {withdrawErr && (
          <div className="bg-orange-50 border border-orange-200 text-orange-850 p-4 rounded-2xl text-xs font-bold flex items-start gap-3 animate-in fade-in duration-200 shadow-sm">
            <span className="text-orange-600 text-lg mt-0.5">⚠️</span>
            <p className="leading-relaxed">{withdrawErr}</p>
          </div>
        )}

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start pb-16">
          
          {/* Column 1: The Form (3/5 space) */}
          <form onSubmit={handleWithdraw} className="lg:col-span-3 bg-white border-t-4 border-t-orange-500 border-l border-r border-b border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-200/30 space-y-6">
            
            {/* Amount Input Block */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Nominal Penarikan</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">Rp</span>
                <input
                  type="text"
                  value={withdrawAmount ? Number(withdrawAmount).toLocaleString('id-ID') : ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setWithdrawAmount(val);
                  }}
                  placeholder="Minimal Rp 10.000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4.5 pl-12 pr-4 text-2xl font-bold font-mono text-slate-800 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white focus:outline-none transition-all shadow-sm"
                  required
                />
              </div>
              <p className="text-[9px] text-slate-400 mt-1.5 ml-1 font-bold">
                💡 Batas penarikan minimal dana adalah Rp 10.000
              </p>
            </div>

            {/* Nominal Chips */}
            <div className="grid grid-cols-3 gap-2">
              {[50000, 100000, 200000, 500000, 1000000, 2000000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setWithdrawAmount(String(amt))}
                  className={`py-3 rounded-xl text-xs font-bold font-mono border transition-all active:scale-95
                    ${Number(withdrawAmount) === amt
                      ? 'border-orange-500 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-extrabold shadow-md shadow-orange-500/15 scale-[1.02]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-350'}`}
                >
                  {amt >= 1000000 ? `${amt / 1000000} Jt` : `${amt / 1000}k`}
                </button>
              ))}
            </div>

            {/* Destination Bank Details */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Rekening Tujuan</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-550 ml-1">Nama Bank / E-Wallet</label>
                  <input
                    type="text"
                    value={withdrawBank}
                    onChange={(e) => setWithdrawBank(e.target.value)}
                    placeholder="BCA, Mandiri, Dana, Ovo..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white transition-all shadow-sm"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-550 ml-1">Nomor Rekening / No HP</label>
                  <input
                    type="text"
                    value={withdrawAccNum}
                    onChange={(e) => setWithdrawAccNum(e.target.value)}
                    placeholder="1234567890"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 font-mono focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white transition-all shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-550 ml-1">Nama Pemilik Rekening</label>
                <input
                  type="text"
                  value={withdrawAccName}
                  onChange={(e) => setWithdrawAccName(e.target.value)}
                  placeholder="Sesuai nama rekening tabungan / e-wallet"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white transition-all shadow-sm"
                  required
                />
              </div>
            </div>

            {/* Estimate Sisa Saldo */}
            {withdrawAmount && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center text-xs font-bold text-slate-550">
                <span>Estimasi Sisa Saldo:</span>
                <span className="font-mono text-slate-700 font-black">
                  Rp {Math.max(0, ppobBalance - Number(withdrawAmount)).toLocaleString('id-ID')}
                </span>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isWithdrawLoading || !withdrawAmount || Number(withdrawAmount) < 10000 || Number(withdrawAmount) > ppobBalance}
                className="w-full py-4.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer text-white shadow-lg shadow-orange-600/15 hover:shadow-orange-600/25 hover:brightness-105 active:scale-[0.98]
                  disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 disabled:shadow-none disabled:scale-100 disabled:cursor-not-allowed
                  bg-gradient-to-r from-orange-600 to-amber-500"
              >
                {isWithdrawLoading ? (
                  <>
                    <span className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    Kirim Permintaan Penarikan
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>

          </form>

          {/* Column 2: Status & Info (2/5 space) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Balance Card Panel - Colorful orange gradient card */}
            <div className="bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 text-white rounded-3xl p-6 shadow-xl shadow-orange-600/15 border-none space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
              <div className="relative z-10">
                <p className="text-[10px] text-orange-200 font-extrabold uppercase tracking-widest leading-none">Saldo Tersedia Untuk Ditarik</p>
                <h2 className="text-3xl font-extrabold font-mono mt-2 text-white">
                  Rp {Number(ppobBalance).toLocaleString('id-ID')}
                </h2>
              </div>
              <div className="text-[10px] text-orange-100/80 leading-relaxed pt-3.5 border-t border-white/10 relative z-10">
                Seluruh sisa saldo PPOB AgraPay Anda dapat ditarik kembali ke rekening bank atau e-wallet Anda kapan saja.
              </div>
            </div>

            {/* Help Guidelines Widget */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
              <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <span>⏱️</span> INFORMASI PENARIKAN
              </h4>
              <ul className="text-[10px] text-slate-550 font-bold space-y-2.5 list-disc pl-4 leading-relaxed">
                <li>Proses transfer penarikan diproses manual oleh Admin POS dalam estimasi waktu maksimal 1x24 jam kerja.</li>
                <li>Pastikan data bank, nomor rekening, dan nama pemilik rekening terisi dengan benar untuk menghindari kegagalan transfer.</li>
                <li>Biaya transfer bank admin ditanggung oleh penerima dana.</li>
              </ul>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
