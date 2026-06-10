// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';

/**
 * CustomerManager.js
 * - Modul pengelolaan data pelanggan dengan Custom Delete Dialog.
 * - FIX NAVIGASI: Mencegah mental ke dashboard saat klik kembali di detail.
 * - Format .js digunakan untuk menghindari auto-preview yang menyebabkan lag.
 * - [DYNAMIC TENANT] Data pelanggan sekarang terisolasi sempurna mengikut tenantId masing-masing.
 * - [FIXED] Menghapus seluruh kolom 'notes' karena tidak ada di tabel database Supabase Anda.
 */

// Ikon Segitiga Peringatan untuk Dialog Hapus Modern
const IconAlertTriangle = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const IconChevronLeft = () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const IconPlus = () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconSearch = () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const IconUser = () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const IconPhone = () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>;
const IconMail = () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;
const IconAward = () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>;

const UI = {
  btnBack: 'flex items-center gap-2 bg-white border border-slate-200 px-6 py-3.5 rounded-[1.5rem] shadow-sm text-[10px] font-black text-slate-800 active:scale-95 transition-all uppercase tracking-widest hover:border-slate-300',
  btnPrimary: 'text-white font-black text-[11px] uppercase tracking-[0.1em] px-6 sm:px-8 py-3.5 sm:py-4 rounded-[1.25rem] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 bg-gradient-to-br from-[#0f8b6b] to-teal-600 w-full sm:w-auto shrink-0',
  btnSubmit: 'w-full py-5 rounded-[1.75rem] bg-teal-600 text-white text-[11px] font-black uppercase tracking-[0.25em] shadow-xl shadow-teal-100 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-3',
  btnCancel: 'w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest text-center hover:text-slate-600 transition-all',
  search: 'w-full bg-white border border-slate-200 rounded-3xl p-4 pl-12 text-sm font-bold shadow-sm focus:border-teal-600 outline-none transition-all',
  listWrap: 'space-y-4',
  listRow: 'bg-white px-5 py-4 rounded-[2rem] border border-slate-200/80 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:border-teal-300/60 cursor-pointer active:scale-[0.99]',
  listAvatar: 'w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 shrink-0 text-teal-700',
  emptyState: 'text-center py-16 border border-dashed border-slate-200 rounded-[2rem] bg-white',
  pageHeader: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-10',
  pageTitleBlock: 'min-w-0',
  pageTitle: 'text-xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight uppercase',
  pageSubtitle: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2',
};

// TANGKAP PROPS TENANT_ID DARI APP.JSX DENGAN DINAMIS COK!
export default function CustomerManager({ tenantId: propTenantId, selectedOutletId, outlets = [] }) {
  const tenantId = propTenantId;

  const isMainOutlet = useMemo(() => {
    if (!selectedOutletId) return true;
    const current = outlets.find(o => String(o.id) === String(selectedOutletId));
    return current ? current.is_main : false;
  }, [outlets, selectedOutletId]);

  // Master Data & View state
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('list'); // 'list' | 'form'
  const [searchTerm, setSearchTerm] = useState('');
  const [detailCustomer, setDetailCustomer] = useState(null);

  // Form State - BERSIH DARI NOTES COK!
  const [form, setForm] = useState({ id: null, name: '', phone: '', email: '', points: '0' });

  // Custom Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

  // Custom Confirmation Dialog state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    idTarget: null,
    displayTitle: ''
  });

  // Tampilkan Notifikasi Toast
  const showToast = useCallback((message, type = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 4000);
  }, []);

  // Ambil Data Pelanggan yang Terisolasi Berdasarkan tenant_id
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenantId) // KUNCI KEAMANAN MULTI-TENANT DI SINI!
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error(err);
      showToast(`Gagal memuat pelanggan: ${err.message || 'Koneksi error'}`);
    } finally {
      setLoading(false);
    }
  }, [tenantId, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCustomers();
  }, [fetchCustomers]);

  const handleBackToDashboard = () => {
    localStorage.setItem('pos_active_tab', 'dashboard');
    window.location.reload();
  };

  // Simpan Pelanggan Baru / Perbarui Pelanggan yang Sudah Ada (TANPA KOLOM NOTES!)
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast("Nama pelanggan wajib diisi!");
      return;
    }

    const payload = {
      tenant_id: tenantId, // PASTIKAN TENANT_ID TERPAUT SAAT MENYIMPAN!
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      points: Number(form.points) || 0,
      outlet_id: selectedOutletId ? Number(selectedOutletId) : null
    };

    try {
      if (form.id) {
        // Perbarui (Update)
        const { error } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', form.id)
          .eq('tenant_id', tenantId); // Validasi ganda keamanan data

        if (error) throw error;
        showToast("Data member berhasil diperbarui", "success");
      } else {
        // Tambah Baru (Insert)
        const { error } = await supabase
          .from('customers')
          .insert([payload]);

        if (error) throw error;
        showToast("Member baru berhasil terdaftar", "success");
      }

      setForm({ id: null, name: '', phone: '', email: '', points: '0' });
      setCurrentView('list');
      fetchCustomers();
    } catch (err) {
      console.error(err);
      showToast(`Gagal memproses data: ${err.message}`);
    }
  };

  // Trigger Modal Konfirmasi Hapus
  const triggerDelete = (id, name) => {
    setDeleteModal({ isOpen: true, idTarget: id, displayTitle: name });
  };

  // Hapus Pelanggan Secara Mutlak Per Tenant
  const handleConfirmDelete = async () => {
    const { idTarget } = deleteModal;
    if (!idTarget) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', idTarget)
        .eq('tenant_id', tenantId); // Validasi perlindungan data per toko

      if (error) throw error;

      setDeleteModal({ isOpen: false, idTarget: null, displayTitle: '' });
      setDetailCustomer(null);
      showToast("Data member berhasil dihapus dari sistem", "success");
      fetchCustomers();
    } catch (err) {
      console.error(err);
      showToast(`Gagal menghapus pelanggan: ${err.message}`);
    }
  };

  // Filter Data Pelanggan Berdasarkan Input Pencarian
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (selectedOutletId) {
        const cOutlet = c.outlet_id ? String(c.outlet_id) : null;
        const matchesOutlet = cOutlet === String(selectedOutletId);
        const isGlobal = !c.outlet_id || String(c.outlet_id) === 'null';
        if (!matchesOutlet && !(isMainOutlet && isGlobal)) return false;
      }
      const nameMatch = String(c.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const phoneMatch = String(c.phone || '').includes(searchTerm);
      const emailMatch = String(c.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      return nameMatch || phoneMatch || emailMatch;
    });
  }, [customers, searchTerm, selectedOutletId, isMainOutlet]);

  return (
    <div className="pb-32 bg-[#F8FAFC] min-h-screen font-sans">
      
      {/* GLOBAL ENTERPRISE TOAST */}
      {toast.show && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999999] px-6 py-4 rounded-3xl shadow-2xl flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 duration-300 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'} w-[90%] max-w-md`}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-white animate-ping"></div>
            <span className="text-[11px] font-black uppercase tracking-wider flex-1">{toast.message}</span>
            <button onClick={() => setToast({ show: false, message: '', type: 'error' })} className="text-white/70 hover:text-white font-bold text-xs">✕</button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6">

      {currentView === 'list' && (
        <>
          <div className="mb-6">
            <button onClick={handleBackToDashboard} className={UI.btnBack}>
              <IconChevronLeft />
              Kembali
            </button>
          </div>

          <header className={UI.pageHeader}>
            <div className={UI.pageTitleBlock}>
              <h2 className={UI.pageTitle}>Pelanggan</h2>
              <div className={UI.pageSubtitle}>Kelola Program & Poin Member</div>
            </div>
            <button onClick={() => { setForm({ id: null, name: '', phone: '', email: '', points: '0' }); setCurrentView('form'); }} className={UI.btnPrimary}>
              <IconPlus />
              Daftar Member
            </button>
          </header>

          <div className="mb-6 relative">
            <input type="text" placeholder="Cari nama, nomor telepon atau email member..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={UI.search} />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <IconSearch />
            </div>
          </div>

          <div className={UI.listWrap}>
            {loading ? (
              <div className="text-center py-24 text-[11px] font-black text-slate-300 animate-pulse uppercase tracking-widest">Memuat...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className={UI.emptyState}>
                <span className="text-4xl block mb-3">👥</span>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Belum Ada Member Terdaftar</p>
                <p className="text-[9px] text-slate-300 mt-1 uppercase tracking-wider">Mulai daftarkan member pertama Anda untuk meningkatkan retensi penjualan!</p>
              </div>
            ) : (
              filteredCustomers.map(c => (
                <div key={c.id} onClick={() => setDetailCustomer(c)} className={UI.listRow}>
                  <div className={UI.listAvatar}>
                    <IconUser />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900 truncate mb-1">{c.name || 'Tanpa Nama'}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{c.phone || 'No Telepon -'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] font-black text-teal-700 uppercase tracking-widest mb-0.5">POIN</div>
                    <p className="text-sm font-black font-mono text-slate-900">{c.points || 0}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {currentView === 'form' && (
        <div className="animate-in slide-in-from-right duration-300 space-y-6">
          <div className="bg-white p-5 rounded-[2.5rem] border border-slate-200/60 shadow-sm flex items-center justify-between">
            <button onClick={() => setCurrentView('list')} className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-800 active:scale-90 shadow-sm transition-all">
              <IconChevronLeft />
            </button>
            <div className="text-center">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1">Pendaftaran Member</h3>
              <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{form.id ? 'Perbarui Member' : 'Daftar Baru'}</p>
            </div>
            <div className="w-11" />
          </div>

          <form onSubmit={handleSaveCustomer} className="space-y-6 pb-20">
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Profil Pelanggan</p>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-teal-600 transition-colors">Nama Lengkap</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Contoh: Budi Santoso..." 
                      value={form.name || ''} 
                      onChange={e => setForm({...form, name: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 pl-12 text-sm font-bold focus:border-teal-600 outline-none transition-all" 
                      required 
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <IconUser />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-teal-600 transition-colors">Nomor Telepon</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Contoh: 081234567890..." 
                      value={form.phone || ''} 
                      onChange={e => setForm({...form, phone: e.target.value.replace(/[^0-9+]/g, '')})} 
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 pl-12 text-sm font-bold focus:border-teal-600 outline-none transition-all font-mono" 
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <IconPhone />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-teal-600 transition-colors">Alamat Email (Opsional)</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      placeholder="Contoh: budi@gmail.com..." 
                      value={form.email || ''} 
                      onChange={e => setForm({...form, email: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 pl-12 text-sm font-bold focus:border-teal-600 outline-none transition-all" 
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <IconMail />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-teal-600 transition-colors">Jumlah Poin Awal</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="0" 
                      value={form.points !== null && form.points !== undefined ? form.points : '0'} 
                      onChange={e => setForm({...form, points: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 pl-12 text-sm font-mono font-black focus:border-teal-600 outline-none transition-all" 
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <IconAward />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm space-y-3">
              <button 
                type="submit"
                className={UI.btnSubmit}
              >
                {form.id ? 'Perbarui Member' : 'Daftarkan Member'}
              </button>
              <button type="button" onClick={() => setCurrentView('list')} className={UI.btnCancel}>Batal</button>
            </div>
          </form>
        </div>
      )}

      </div>

      {detailCustomer && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#F8FAFC] animate-in slide-in-from-bottom duration-500 overflow-y-auto">
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-6 pt-10 pb-4 flex items-center justify-between border-b border-slate-100">
            <button onClick={() => setDetailCustomer(null)} className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-800 active:scale-90 shadow-sm transition-all">
              <IconChevronLeft />
            </button>
            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Profil Detail Member</h3>
            <div className="w-11" />
          </div>

          <div className="p-6 space-y-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-24 h-24 bg-teal-50 rounded-[2rem] border border-slate-200 flex items-center justify-center relative shadow-sm text-teal-700 text-3xl">
                <IconUser />
              </div>

              <div className="space-y-1">
                <div className="flex justify-center items-center">
                  <span className="text-[8px] font-black uppercase px-2.5 py-1 rounded-full bg-teal-100 text-teal-700 border border-teal-200 tracking-wider">
                    ⭐️ MEMBER AKTIF
                  </span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tight">
                  {detailCustomer.name || 'Tanpa Nama'}
                </h1>
                <p className="text-slate-400 font-bold text-xs tracking-wide">ID Member: <span className="text-slate-600 font-mono">#{detailCustomer.id}</span></p>
              </div>

              <div className="w-full bg-slate-900 p-6 rounded-[2rem] text-center shadow-lg relative overflow-hidden">
                <p className="text-teal-500 text-[8px] font-black uppercase tracking-[0.3em] mb-1.5">Loyalty Poin Terkumpul</p>
                <h2 className="text-2xl font-black text-white font-mono tracking-tighter">
                  {detailCustomer.points || 0} Poin
                </h2>
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-20 h-20 rounded-full bg-teal-600/10 blur-xl"></div>
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-20 h-20 rounded-full bg-teal-600/10 blur-xl"></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-2 w-full">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Informasi Kontak & Detail</span>
              </div>
              
              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400">No Telepon</span>
                  <span className="font-black text-slate-800 font-mono">{detailCustomer.phone || 'Belum diisi'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400">Email</span>
                  <span className="font-black text-slate-800">{detailCustomer.email || 'Belum diisi'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto p-6 bg-white border-t border-slate-100 space-y-3 pb-12">
            <button 
              onClick={() => { 
                setForm({
                  id: detailCustomer.id,
                  name: detailCustomer.name || '',
                  phone: detailCustomer.phone || '',
                  email: detailCustomer.email || '',
                  points: String(detailCustomer.points || '0')
                }); 
                setDetailCustomer(null); 
                setCurrentView('form'); 
              }} 
              className="w-full py-5 rounded-[1.75rem] bg-teal-600 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:brightness-110 active:scale-[0.98] transition-all text-center"
            >
              Ubah Profil Member
            </button>
            <button 
              onClick={() => triggerDelete(detailCustomer.id, detailCustomer.name || 'Tanpa Nama')} 
              className="w-full py-4 rounded-2xl bg-rose-50 text-rose-500 text-[10px] font-black uppercase tracking-widest text-center hover:bg-rose-100 active:scale-95 transition-all"
            >
              Hapus Member Dari Sistem
            </button>
          </div>
        </div>
      )}

      {/* CUSTOM DIALOG DELETE CENTERED */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-8 space-y-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto border border-rose-100 shadow-sm animate-bounce">
              <IconAlertTriangle />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Hapus Member?</h3>
              <p className="text-xs font-bold text-slate-400 leading-relaxed px-1">
                Apakah anda yakin ingin menghapus <span className="text-rose-500 font-black">"{deleteModal.displayTitle}"</span>? Data poin member ini akan hilang selamanya.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })} className="w-full bg-slate-50 border border-slate-100 text-slate-500 font-black text-[10px] uppercase py-3.5 rounded-2xl active:scale-95 transition-all">Batal</button>
              <button onClick={handleConfirmDelete} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase py-3.5 rounded-2xl active:scale-95 transition-all text-center shadow-lg shadow-rose-100">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}