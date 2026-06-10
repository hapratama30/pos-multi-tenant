import React, { useState, useEffect } from 'react';

export default function PpobHistory({ currentUser, onNavigate }) {
  const rawLocalUser = localStorage.getItem('pos_current_user');
  const parsedLocalUser = rawLocalUser ? JSON.parse(rawLocalUser) : null;
  const activeUser = currentUser || parsedLocalUser || {};

  const [ppobBalance, setPpobBalance] = useState(0);
  const [ppobMutations, setPpobMutations] = useState([]);
  const [activeHistoryTab, setActiveHistoryTab] = useState('deposit'); // deposit | withdraw
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historySearchDebounced, setHistorySearchDebounced] = useState('');
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Debounce search input — wait 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setHistorySearchDebounced(historySearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [historySearch]);

  const fetchPpobBalance = () => {
    if (!activeUser?.tenant_id) return;
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ppob/balance?tenant_id=${activeUser.tenant_id}&outlet_id=${activeUser.outlet_id || ''}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPpobBalance(data.balance);
        }
      })
      .catch(console.error);
  };

  const fetchHistory = () => {
    if (!activeUser?.tenant_id) return;
    setIsHistoryLoading(true);
    const params = new URLSearchParams({ tenant_id: activeUser.tenant_id, outlet_id: activeUser.outlet_id || '' });
    if (historyStartDate) params.append('start_date', historyStartDate);
    if (historyEndDate) params.append('end_date', historyEndDate);
    if (historySearchDebounced.trim()) params.append('search', historySearchDebounced.trim());

    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ppob/history?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPpobMutations(data.mutations || []);
        }
      })
      .catch(console.error)
      .finally(() => setIsHistoryLoading(false));
  };

  useEffect(() => {
    fetchPpobBalance();
  }, [activeUser?.tenant_id, activeUser?.outlet_id]);

  useEffect(() => {
    fetchHistory();
  }, [activeUser?.tenant_id, activeUser?.outlet_id, historyStartDate, historyEndDate, historySearchDebounced]);

  // Helper check for withdrawals
  const isWithdrawMutation = (m) => {
    const ref = m.ref_id || '';
    const desc = (m.description || '').toLowerCase();
    return ref.startsWith('WD-') || ref.startsWith('WITHDRAWAL-') || desc.includes('tarik') || desc.includes('withdraw');
  };

  const depositMutations = ppobMutations.filter(m => !isWithdrawMutation(m));
  const withdrawMutations = ppobMutations.filter(m => isWithdrawMutation(m));
  const filteredMutations = activeHistoryTab === 'deposit' ? depositMutations : withdrawMutations;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 overflow-x-hidden -mt-4 -mx-4 sm:-mt-6 sm:-mx-6 lg:-mt-8 lg:-mx-8 font-sans">
      {/* Background Header */}
      <div className={`absolute top-0 left-0 right-0 h-64 md:h-76 bg-gradient-to-b ${activeHistoryTab === 'deposit' ? 'from-teal-700 via-teal-600' : 'from-orange-600 via-orange-500'} to-transparent rounded-b-[3rem] z-0 opacity-95 transition-colors duration-300`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_50%)]" />
      </div>

      <div className="relative z-10 px-4 sm:px-6 lg:px-8 pt-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header Bar */}
          <div className="flex items-center justify-between text-white pb-2">
            <div className="flex items-center gap-4">
              <button
                onClick={() => onNavigate('dashboard')}
                className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all font-bold backdrop-blur-sm active:scale-95 border border-white/10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-wide">Riwayat Transaksi AgraPay</h1>
                <p className="text-[10px] md:text-xs font-semibold uppercase tracking-widest text-teal-100 opacity-80 mt-0.5">AgraPay Saldo Mutasi & Withdraw</p>
              </div>
            </div>
          </div>

          {/* Banner Saldo */}
          <div className={`bg-gradient-to-r ${activeHistoryTab === 'deposit' ? 'from-teal-500 to-emerald-500 shadow-teal-500/20' : 'from-orange-500 to-orange-600 shadow-orange-500/20'} rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex items-center justify-between transition-all duration-300`}>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-black/10 rounded-full blur-xl"></div>

            <div className="relative z-10">
              <p className="text-xs sm:text-sm font-bold text-white uppercase tracking-widest mb-1 opacity-90">Total Saldo Aktif Anda</p>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Rp {Number(ppobBalance).toLocaleString('id-ID')}</h2>
            </div>
            <div className="relative z-10 bg-white/20 p-4 rounded-2xl backdrop-blur-sm hidden sm:block">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="bg-white rounded-3xl p-1.5 border border-slate-100 shadow-sm flex gap-2">
            <button
              onClick={() => setActiveHistoryTab('deposit')}
              className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${activeHistoryTab === 'deposit' ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/20' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              📥 Riwayat Deposit / Mutasi
            </button>
            <button
              onClick={() => setActiveHistoryTab('withdraw')}
              className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${activeHistoryTab === 'withdraw' ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md shadow-orange-500/20' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              📤 Riwayat Withdraw
            </button>
          </div>

          {/* Filters Area */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <h4 className="font-black text-slate-800 uppercase tracking-wider text-xs flex items-center gap-2 self-start md:self-auto">
              <span className={`w-2.5 h-2.5 rounded-full ${activeHistoryTab === 'deposit' ? 'bg-teal-500' : 'bg-orange-500'}`}></span> Aktivitas Terakhir
            </h4>

            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="flex gap-2">
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                  className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500 focus:bg-white"
                />
                <span className="text-slate-400 self-center text-xs">-</span>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                  className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-teal-500 focus:bg-white"
                />
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Cari ID, keterangan, status, nominal..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/10 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Mutations List */}
          <div className="space-y-3">
            {isHistoryLoading ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <div className="inline-block w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Memuat data riwayat...</p>
              </div>
            ) : filteredMutations.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 border-dashed">
                <div className="text-5xl mb-4 opacity-50">{historySearchDebounced ? '🔍' : '📭'}</div>
                <p className="text-slate-400 text-sm font-bold">
                  {historySearchDebounced
                    ? `Tidak ditemukan hasil untuk "${historySearchDebounced}"`
                    : activeHistoryTab === 'deposit'
                      ? 'Belum ada riwayat deposit atau mutasi saldo.'
                      : 'Belum ada riwayat penarikan (withdraw).'}
                </p>
              </div>
            ) : (
              filteredMutations.map(m => {
                const isIncome = Number(m.amount) > 0;
                const statusKey = (m.status || '').toLowerCase();
                const isPending = statusKey === 'pending';
                const isDitolak = statusKey === 'ditolak' || statusKey === 'rejected';
                const isBerhasil = statusKey === 'berhasil' || statusKey === 'approved' || statusKey === 'success';

                const iconBg = isPending ? 'bg-amber-50 text-amber-500' : isDitolak ? 'bg-rose-50 text-rose-500' : isIncome ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-500';
                const iconAnimClass = isPending ? 'status-icon-pending' : isDitolak ? 'status-icon-ditolak' : isBerhasil ? 'status-icon-berhasil' : '';

                return (
                  <div key={m.id} className="bg-white border border-slate-100 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm hover:shadow-lg hover:border-slate-200 transition-all duration-300 gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-2xl shrink-0 ${iconBg} ${iconAnimClass}`}>
                        {isPending ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : isDitolak ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : isBerhasil ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {isIncome ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 11l5-5m0 0l5 5m-5-5v12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 13l-5 5m0 0l-5-5m5 5V6" />}
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 flex items-center gap-2 flex-wrap">
                          {m.description || (isIncome ? 'Top Up Saldo' : 'Potong Saldo')}
                          {m.status && (
                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5 ${isPending ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                isDitolak ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                                  'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}>
                              {isPending && <span className="w-2 h-2 rounded-full bg-amber-500 status-dot-pending inline-block" />}
                              {isDitolak && <span className="w-2 h-2 rounded-full bg-rose-500 status-dot-ditolak inline-block" />}
                              {isBerhasil && <span className="w-2 h-2 rounded-full bg-emerald-500 status-dot-berhasil inline-block" />}
                              {m.status === 'rejected' ? 'Ditolak' : m.status === 'approved' ? 'Berhasil' : m.status}
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] font-bold text-teal-600 mt-0.5 bg-teal-50 inline-block px-1.5 py-0.5 rounded font-mono uppercase">ID: {m.ref_id || m.id}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{new Date(m.created_at).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span className="text-[10px] font-bold text-slate-400">{new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 pl-14 sm:pl-0">
                      <p className={`text-lg font-black tracking-tight ${isIncome ? 'text-green-600' : 'text-slate-800'}`}>
                        {isIncome ? '+' : ''} Rp {Number(m.amount).toLocaleString('id-ID')}
                      </p>
                      {m.balance_after !== undefined && (
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase bg-slate-50 inline-block px-2 py-0.5 rounded-md border border-slate-100">
                          Sisa Saldo: <span className="text-slate-600">Rp {Number(m.balance_after).toLocaleString('id-ID')}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
