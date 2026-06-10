import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import StorefrontIcon from '@mui/icons-material/Storefront';
import HistoryIcon from '@mui/icons-material/History';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';

export default function CashShiftManager({ tenantId, currentUser, onBack }) {
  const [shifts, setShifts] = useState([]);
  const [activeShift, setActiveShift] = useState(null);
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [loading, setLoading] = useState(true);
  const [cashSales, setCashSales] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [msg, setMsg] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const showToast = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const fetchActiveShiftStats = async (shiftId) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('total, payment_method')
        .eq('shift_id', shiftId)
        .eq('tenant_id', tenantId)
        .eq('status', 'completed');

      if (error) throw error;

      const tunaiTxs = data.filter(t => t.payment_method?.toLowerCase() === 'tunai');
      const totalCash = tunaiTxs.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
      
      setCashSales(totalCash);
      setTotalTransactions(data.length);
      return totalCash;
    } catch (err) {
      console.error('Error fetching shift stats:', err);
      return 0;
    }
  };

  const fetchShifts = useCallback(async () => {
    if (!tenantId) return;
    try {
      let query = supabase
        .from('cash_shifts')
        .select('*')
        .eq('tenant_id', tenantId);

      if (currentUser?.outlet_id) {
        query = query.eq('outlet_id', currentUser.outlet_id);
      }

      const { data, error } = await query
        .order('opened_at', { ascending: false })
        .limit(30);
        
      if (error) throw error;
      
      const shiftsData = data || [];
      setShifts(shiftsData);
      
      const currentActive = shiftsData.find((s) => s.status === 'open');
      setActiveShift(currentActive || null);

      if (currentActive) {
        await fetchActiveShiftStats(currentActive.id);
      }
    } catch (err) {
      showToast('Gagal memuat data shift: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [tenantId, currentUser]);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  const handleOpenShift = async (e) => {
    e.preventDefault();
    if (openingBalance === '') {
      showToast('Masukkan saldo awal kasir terlebih dahulu', 'error');
      return;
    }
    
    setIsProcessing(true);
    try {
      const kasir = currentUser?.name || 'Kasir';
      const { error } = await supabase.from('cash_shifts').insert([{
        tenant_id: tenantId,
        staff_id: currentUser?.staff_id || currentUser?.id,
        cashier_name: kasir,
        opening_balance: Number(openingBalance) || 0,
        status: 'open',
        outlet_id: currentUser?.outlet_id || null,
      }]);
      if (error) throw error;
      setOpeningBalance('');
      showToast(`Shift berhasil dibuka oleh ${kasir}`);
      fetchShifts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (!activeShift) return;
    if (closingBalance === '') {
      showToast('Masukkan saldo fisik akhir di laci kasir', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      // Fetch latest cash sales just in case new transactions occurred
      const finalCashSales = await fetchActiveShiftStats(activeShift.id);
      
      const closing = Number(closingBalance) || 0;
      const expected = (Number(activeShift.opening_balance) || 0) + finalCashSales;
      const difference = closing - expected;

      const { error } = await supabase.from('cash_shifts').update({
        closing_balance: closing,
        expected_balance: expected,
        difference: difference,
        status: 'closed',
        closed_at: new Date().toISOString(),
      }).eq('id', activeShift.id).eq('tenant_id', tenantId);
      
      if (error) throw error;
      setClosingBalance('');
      
      if (difference === 0) {
        showToast('Shift berhasil ditutup. Saldo Balance (Sesuai) ✅');
      } else if (difference > 0) {
        showToast(`Shift ditutup. Uang Lebih: Rp ${difference.toLocaleString('id-ID')} ⚠️`, 'success');
      } else {
        showToast(`Shift ditutup. Uang Kurang: Rp ${Math.abs(difference).toLocaleString('id-ID')} ❌`, 'error');
      }
      
      fetchShifts();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-xs font-black text-slate-400 uppercase animate-pulse">Memuat data shift kasir...</div>;

  const expectedBalance = activeShift ? (Number(activeShift.opening_balance) || 0) + cashSales : 0;
  const currentDifference = activeShift && closingBalance !== '' ? (Number(closingBalance) || 0) - expectedBalance : 0;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pb-32 animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Shift Kasir</h2>
            <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Manajemen Saldo Laci Kasir & Rekonsiliasi</p>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4 ${msg.type === 'success' ? 'bg-teal-600 text-white' : 'bg-rose-600 text-white'}`}>
          <span className="text-lg">{msg.type === 'success' ? '✅' : '⚠️'}</span>
          <span className="text-xs font-black tracking-wide uppercase">{msg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* KOLOM KIRI: KONTROL SHIFT AKTIF / BUKA SHIFT BARU */}
        <div className="lg:col-span-5 space-y-6">
          {!activeShift ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40 sticky top-6">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                  <StorefrontIcon sx={{ fontSize: 32 }} />
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Mulai Shift Baru</h3>
                <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">Masukkan jumlah uang modal awal (kembalian) yang ada di dalam laci kasir saat ini sebelum memulai transaksi.</p>
              </div>

              <form onSubmit={handleOpenShift} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Uang Modal Awal (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                    <input 
                      type="number" 
                      required
                      placeholder="Contoh: 100000" 
                      value={openingBalance} 
                      onChange={(e) => setOpeningBalance(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-4 text-lg font-black text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" 
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={isProcessing}
                  className={`w-full py-4 text-white font-black rounded-xl text-sm uppercase tracking-widest shadow-xl transition-all ${isProcessing ? 'opacity-70 cursor-wait bg-blue-600' : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 shadow-blue-500/30'}`}
                >
                  {isProcessing ? 'Memproses...' : 'Buka Shift Sekarang'}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-teal-800 to-teal-900 rounded-3xl p-1 shadow-xl shadow-teal-900/30 sticky top-6">
              <div className="bg-white/5 border border-white/10 rounded-[22px] p-6 sm:p-8 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Shift Berjalan
                    </span>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">{activeShift.cashier_name}</h3>
                    <p className="text-xs text-teal-200/60 font-medium mt-1">Dibuka: {new Date(activeShift.opened_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                  </div>
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-teal-300">
                    <PointOfSaleIcon sx={{ fontSize: 24 }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] text-teal-200/60 font-black uppercase tracking-wider mb-1">Modal Awal</p>
                    <p className="text-lg font-black text-white">Rp {(Number(activeShift.opening_balance) || 0).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] text-teal-200/60 font-black uppercase tracking-wider mb-1">Total Tunai Masuk</p>
                    <p className="text-lg font-black text-emerald-400">+ Rp {cashSales.toLocaleString('id-ID')}</p>
                  </div>
                </div>

                <div className="bg-black/40 rounded-2xl p-5 border border-white/10 mb-8 text-center">
                  <p className="text-xs text-teal-200/80 font-black uppercase tracking-wider mb-2">Expected Balance (Seharusnya)</p>
                  <p className="text-3xl font-black text-white">Rp {expectedBalance.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-teal-200/50 font-medium mt-2">Dari {totalTransactions} transaksi tersimpan</p>
                </div>

                <form onSubmit={handleCloseShift} className="space-y-4 pt-4 border-t border-white/10">
                  <div>
                    <label className="block text-[10px] font-black text-teal-200 uppercase tracking-wider mb-2">Uang Fisik Aktual di Laci (Rp) <span className="text-rose-400">*</span></label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rp</span>
                      <input 
                        type="number" 
                        required
                        placeholder="Hitung uang fisik..." 
                        value={closingBalance} 
                        onChange={(e) => setClosingBalance(e.target.value)} 
                        className="w-full bg-white border-0 rounded-xl pl-12 pr-4 py-3.5 text-base font-black text-slate-900 focus:ring-4 focus:ring-teal-500/50 transition-all outline-none" 
                      />
                    </div>
                  </div>
                  
                  {closingBalance !== '' && (
                    <div className={`p-4 rounded-xl border flex items-center justify-between animate-in slide-in-from-bottom-2 ${currentDifference === 0 ? 'bg-emerald-500/20 border-emerald-500/30' : currentDifference > 0 ? 'bg-blue-500/20 border-blue-500/30' : 'bg-rose-500/20 border-rose-500/30'}`}>
                      <span className="text-xs font-black text-white uppercase">Selisih:</span>
                      <span className={`text-base font-black ${currentDifference === 0 ? 'text-emerald-400' : currentDifference > 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                        {currentDifference === 0 ? 'BALANCE ✅' : currentDifference > 0 ? `+ Rp ${currentDifference.toLocaleString('id-ID')} (Lebih)` : `- Rp ${Math.abs(currentDifference).toLocaleString('id-ID')} (Kurang)`}
                      </span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isProcessing}
                    className={`w-full py-4 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 mt-4 ${isProcessing ? 'opacity-70 cursor-wait bg-orange-500' : 'bg-gradient-to-r from-orange-500 to-rose-500 hover:scale-[1.02] active:scale-95 shadow-orange-500/30'}`}
                  >
                    <AccountBalanceWalletIcon sx={{ fontSize: 18 }} /> {isProcessing ? 'Memproses...' : 'Tutup Shift Kasir'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* KOLOM KANAN: RIWAYAT SHIFT */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                <HistoryIcon sx={{ fontSize: 18 }} />
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Riwayat Shift Sebelumnya</h3>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 pos-scroll">
              {shifts.filter(s => s.status === 'closed').length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-xs font-bold uppercase tracking-wider">Belum ada riwayat shift yang ditutup.</p>
                </div>
              ) : (
                shifts.filter(s => s.status === 'closed').map((s) => (
                  <div key={s.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:border-slate-200 transition-colors">
                    <div className="flex flex-wrap justify-between items-start gap-4 mb-4 pb-4 border-b border-slate-200/60">
                      <div>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{s.cashier_name}</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-wider">
                          {new Date(s.opened_at).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })} • {new Date(s.opened_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - {new Date(s.closed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-200 text-slate-600">
                        Selesai
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Modal Awal</p>
                        <p className="text-xs font-bold text-slate-700">Rp {(Number(s.opening_balance) || 0).toLocaleString('id-ID')}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Sistem (Expected)</p>
                        <p className="text-xs font-bold text-slate-700">Rp {(Number(s.expected_balance) || 0).toLocaleString('id-ID')}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Fisik (Aktual)</p>
                        <p className="text-xs font-bold text-slate-700">Rp {(Number(s.closing_balance) || 0).toLocaleString('id-ID')}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Selisih</p>
                        <p className={`text-xs font-black ${Number(s.difference) === 0 ? 'text-emerald-600' : Number(s.difference) > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                          {Number(s.difference) === 0 ? '0 (Balance)' : Number(s.difference) > 0 ? `+ Rp ${Number(s.difference).toLocaleString('id-ID')}` : `- Rp ${Math.abs(Number(s.difference)).toLocaleString('id-ID')}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
