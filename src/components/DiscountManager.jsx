import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';

/**
 * DiscountManager.jsx (MODUL MANAJEMEN DISKON & PROMOSI PREMIUM MULTI-PRODUCT)
 * - Kelola kode promo kasir (e.g., PROMO10, DISKONKOPI).
 * - Opsi potongan Persentase (%) atau Rupiah (Nominal).
 * - Set minimal pembelian / minimum transaksi.
 * - Multi-Product Selection: Satu diskon bisa diaplikasikan ke banyak produk sekaligus.
 * - Full Screen Detail Overlay Premium.
 * - [DYNAMIC TENANT FIX] Menggunakan tenantId dinamis dari prop tanpa merubah tampilan/fungsi apapun.
 */

// =====================================================================
// KOMPONEN IKON SVG MURNI (Konsisten, Ringan & Bebas Crash)
// =====================================================================
const IconChevronLeft = () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const IconPlus = () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconEdit = () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
const IconTrash = () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
// eslint-disable-next-line no-unused-vars
const IconX = () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

const UI = {
  btnBack: 'flex items-center gap-2 bg-white border border-slate-200 px-6 py-3.5 rounded-[1.5rem] shadow-sm text-[10px] font-black text-slate-800 active:scale-95 transition-all uppercase tracking-widest hover:border-slate-300',
  btnPrimary: 'text-white font-black text-[11px] uppercase tracking-[0.1em] px-6 sm:px-8 py-3.5 sm:py-4 rounded-[1.25rem] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 bg-gradient-to-br from-[#0f8b6b] to-teal-600 w-full sm:w-auto shrink-0',
  btnSubmit: 'flex-1 py-5 rounded-[1.75rem] bg-teal-600 text-white text-[11px] font-black uppercase tracking-[0.25em] shadow-xl shadow-teal-100 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50',
  btnCancel: 'px-8 py-5 bg-slate-100 text-slate-500 font-black text-[11px] uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all',
  search: 'w-full bg-white border border-slate-200 rounded-3xl p-4 pl-12 text-sm font-bold shadow-sm focus:border-teal-600 outline-none transition-all',
  listWrap: 'space-y-4',
  listRow: 'bg-white px-5 py-4 rounded-[2rem] border border-slate-200/80 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:border-teal-300/60 cursor-pointer active:scale-[0.99]',
  emptyState: 'text-center py-16 border border-dashed border-slate-200 rounded-[2rem] bg-white p-8',
  pageHeader: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-10',
  pageTitleBlock: 'min-w-0',
  pageTitle: 'text-xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight uppercase',
  pageSubtitle: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2',
};

export default function DiscountManager({ onBack, tenantId: propTenantId, selectedOutletId, outlets = [] }) {
  const tenantId = propTenantId;

  const isMainOutlet = useMemo(() => {
    if (!selectedOutletId) return true;
    const current = outlets.find(o => String(o.id) === String(selectedOutletId));
    return current ? current.is_main : false;
  }, [outlets, selectedOutletId]);
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // State untuk Dropdown Pencarian Banyak Produk (Multi-Select)
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // State untuk pencarian daftar kupon/diskon utama
  const [discountSearch, setDiscountSearch] = useState('');

  // State untuk Full Screen Detail Dialog Overlay
  const [selectedDetail, setSelectedDetail] = useState(null);

  // Form State
  const [form, setForm] = useState({
    id: null,
    name: '',
    code: '',
    type: 'percentage', // 'percentage' | 'fixed'
    value: '',
    min_purchase: '0',
    is_active: true,
    product_ids: [] // Menyimpan array string id-id produk terpilih
  });

  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

  const showToast = useCallback((message, type = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 6000);
  }, []);

  // Fetch Data Diskon berdasarkan tenant_id
  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) {
        if (error.code === '42P01') {
          throw new Error("Tabel 'discounts' belum terpasang di database Supabase Anda.");
        }
        throw error;
      }
      setDiscounts(data || []);
    } catch (err) {
      console.error(err.message);
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, showToast]);

  // Fetch Data Produk Toko untuk dihubungkan ke diskon
  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("Gagal memuat produk:", err.message);
    }
  }, [tenantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDiscounts();
    fetchProducts();
  }, [fetchDiscounts, fetchProducts]);

  // Filter produk berdasarkan search input dropdown di dalam form
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter daftar diskon utama berdasarkan discountSearch
  const filteredDiscounts = discounts.filter(item => {
    if (selectedOutletId) {
      const iOutlet = item.outlet_id ? String(item.outlet_id) : null;
      const matchesOutlet = iOutlet === String(selectedOutletId);
      const isGlobal = !item.outlet_id || String(item.outlet_id) === 'null';
      if (!matchesOutlet && !(isMainOutlet && isGlobal)) return false;
    }
    const dName = String(item.name || '').toLowerCase();
    const dCode = String(item.code || '').toLowerCase();
    const q = discountSearch.toLowerCase();
    return dName.includes(q) || dCode.includes(q);
  });

  // Fungsi toggle pilih/batal produk di dalam form
  const handleToggleProductSelection = (productId) => {
    const pIdStr = String(productId);
    setForm(prev => {
      const exists = prev.product_ids.includes(pIdStr);
      if (exists) {
        return { ...prev, product_ids: prev.product_ids.filter(id => id !== pIdStr) };
      } else {
        return { ...prev, product_ids: [...prev.product_ids, pIdStr] };
      }
    });
  };

  // Simpan data diskon (Insert atau Update)
  const handleSaveDiscount = async (e) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.value) return;

    setUploading(true);
    const payload = {
      tenant_id: tenantId,
      name: form.name,
      code: form.code.toUpperCase().replace(/\s+/g, ''),
      type: form.type,
      value: Number(form.value) || 0,
      min_purchase: Number(form.min_purchase) || 0,
      is_active: form.is_active,
      product_ids: form.product_ids || [], // Masuk ke database sebagai array text
      outlet_id: selectedOutletId ? Number(selectedOutletId) : null
    };

    try {
      if (form.id) {
        const { error } = await supabase.from('discounts').update(payload).eq('id', form.id).eq('tenant_id', tenantId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('discounts').insert([payload]);
        if (error) throw error;
      }

      setForm({ id: null, name: '', code: '', type: 'percentage', value: '', min_purchase: '0', is_active: true, product_ids: [] });
      setIsFormOpen(false);
      setSearchQuery('');
      showToast("Promosi diskon berhasil disimpan", "success");
      fetchDiscounts();
    } catch (err) {
      console.error(err.message);
      showToast(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Hapus permanen diskon
  const handleDeleteDiscount = async (id) => {
    if (!window.confirm("Hapus promo diskon ini secara permanen?")) return;
    try {
      const { error } = await supabase.from('discounts').delete().eq('id', id).eq('tenant_id', tenantId);
      if (error) throw error;
      showToast("Promo diskon telah dihapus", "success");
      fetchDiscounts();
    } catch (err) {
      console.error(err.message);
      showToast(`Gagal menghapus diskon: ${err.message}`);
    }
  };

  // Toggle status aktif/nonaktif promo di halaman utama
  const toggleDiscountStatus = async (item) => {
    try {
      const { error } = await supabase
        .from('discounts')
        .update({ is_active: !item.is_active })
        .eq('id', item.id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
      showToast(`Promo ${item.code} telah ${!item.is_active ? 'Diaktifkan' : 'Dinonaktifkan'}`, "success");
      fetchDiscounts();
    } catch (err) {
      showToast(`Gagal mengubah status: ${err.message}`);
    }
  };

  return (
    <div className="pb-32 bg-[#F8FAFC] min-h-screen font-sans relative">
      
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

      {/* FULL SCREEN OVERLAY DETAIL DIALOG */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-[#F8FAFC] z-[99999] flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header Full Screen */}
          <div className="p-6 bg-white border-b border-slate-200/80 flex items-center justify-between shadow-sm">
            <button 
              onClick={() => setSelectedDetail(null)}
              className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-3.5 rounded-[1.5rem] shadow-sm text-[10px] font-black text-slate-800 active:scale-95 transition-all uppercase tracking-widest hover:border-slate-300"
            >
              <IconChevronLeft /> Tutup Detail
            </button>
            <div className="text-right">
              <span className="font-mono font-black text-xs text-teal-700 bg-teal-50 border border-teal-200 px-4 py-2 rounded-2xl tracking-widest uppercase shadow-sm">
                🎟️ {selectedDetail.code}
              </span>
            </div>
          </div>

          {/* Isi Konten Full Screen */}
          <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-8">
            <header className="border-b pb-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nama Promosi / Kampanye</span>
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight leading-tight">{selectedDetail.name}</h1>
            </header>

            {/* Grid Informasi Utama */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Tipe Diskon</span>
                <p className="text-sm font-black text-slate-800 uppercase">
                  {selectedDetail.type === 'percentage' ? 'Persentase (%)' : 'Rupiah (Fixed Rp)'}
                </p>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Besar Potongan</span>
                <p className="text-xl font-mono font-black text-emerald-600">
                  {selectedDetail.type === 'percentage' ? `${selectedDetail.value}%` : `Rp ${selectedDetail.value.toLocaleString('id-ID')}`}
                </p>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Minimal Pembelian</span>
                <p className="text-sm font-mono font-bold text-slate-700">
                  {selectedDetail.min_purchase > 0 ? `Rp ${selectedDetail.min_purchase.toLocaleString('id-ID')}` : 'Tanpa Minimal Transaksi'}
                </p>
              </div>
            </div>

            {/* Row Status */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Status Penggunaan</span>
                <p className="text-xs font-bold text-slate-500 mt-1">Menentukan apakah kasir bisa menerapkan promo ini atau tidak.</p>
              </div>
              <span className={`text-[10px] font-black uppercase px-4 py-2 rounded-2xl shadow-sm ${selectedDetail.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                {selectedDetail.is_active ? '● Voucher Aktif' : '○ Sedang Nonaktif'}
              </span>
            </div>

            {/* DAFTAR PRODUK YANG TERCAKUP */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span>🎯</span> Produk Terkait Yang Tercakup ({selectedDetail.product_ids?.length || 0})
                </h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">Promo ini hanya aktif jika item di bawah ini ada di dalam transaksi kasir</p>
              </div>

              <div className="border-t pt-4">
                {selectedDetail.product_ids && selectedDetail.product_ids.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedDetail.product_ids.map(pId => {
                      const foundProd = products.find(p => String(p.id) === String(pId));
                      return (
                        <div key={pId} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 font-sans">
                          <span className="text-base">📦</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-slate-800 uppercase truncate">{foundProd ? foundProd.name : `Produk ID: ${pId}`}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Terikat Kupon</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 bg-teal-50/50 border border-dashed border-teal-200 text-center rounded-2xl">
                    <p className="text-xl mb-1">🌍</p>
                    <p className="text-xs font-black text-teal-800 uppercase tracking-wider">Berlaku Global (Semua Produk Toko)</p>
                    <p className="text-[9px] text-teal-500 uppercase tracking-widest mt-0.5">Tidak dikunci ke produk tertentu</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6">

      {/* HEADER UTAMA */}
      <div className="mb-6">
        <button onClick={onBack} className={UI.btnBack}>
          <IconChevronLeft /> Kembali
        </button>
      </div>

      <header className={UI.pageHeader}>
        <div className={UI.pageTitleBlock}>
          <h2 className={UI.pageTitle}>Promosi Diskon</h2>
          <div className={UI.pageSubtitle}>Kelola Potongan Harga & Voucher Toko</div>
        </div>
        <button
          onClick={() => {
            setForm({ id: null, name: '', code: '', type: 'percentage', value: '', min_purchase: '0', is_active: true, product_ids: [] });
            setSearchQuery('');
            setIsFormOpen(true);
          }}
          className={UI.btnPrimary}
        >
          <IconPlus />
          Buat Promo
        </button>
      </header>

      <div className="mb-6 relative">
        <input
          type="text"
          placeholder="Cari kode promo atau nama diskon..."
          value={discountSearch}
          onChange={e => setDiscountSearch(e.target.value)}
          className={UI.search}
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        {discountSearch && (
          <button 
            type="button"
            onClick={() => setDiscountSearch('')} 
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {/* FORM INPUT DISKON */}
      {isFormOpen && (
        <form onSubmit={handleSaveDiscount} className="bg-white p-8 rounded-[3rem] border border-slate-200/80 shadow-2xl mb-10 space-y-6 animate-in slide-in-from-top-10 duration-300">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{form.id ? 'Edit Promo' : 'Buat Voucher Baru'}</h3>
            <button type="button" onClick={() => { setIsFormOpen(false); setSearchQuery(''); }} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Promosi</label>
              <input type="text" placeholder="Contoh: Diskon Besar-besaran Akhir Tahun" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:border-teal-600 outline-none" required />
            </div>

            {/* SELECTION SEARCHABLE MULTI-CHECKBOX DROPDOWN */}
            <div className="space-y-2 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Beberapa Produk Terkait ({form.product_ids?.length || 0} Terpilih)</label>
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold flex justify-between items-center cursor-pointer hover:border-slate-300 transition-all select-none"
              >
                <span className={form.product_ids?.length > 0 ? "text-teal-700 font-black" : "text-slate-400"}>
                  {form.product_ids?.length > 0 
                    ? `🎯 ${form.product_ids.length} Produk Masuk Promo` 
                    : '🌍 Berlaku Global untuk Semua Produk'}
                </span>
                <span className="text-xs text-slate-400 transition-transform duration-200" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
              </div>

              {isDropdownOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto overflow-x-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-2 sticky top-0 bg-white border-b border-slate-100 flex items-center justify-between gap-2">
                    <input 
                      type="text" 
                      placeholder="Cari nama produk untuk dicentang..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onClick={e => e.stopPropagation()} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-teal-600"
                    />
                    {form.product_ids?.length > 0 && (
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setForm({ ...form, product_ids: [] }); }}
                        className="text-[9px] bg-rose-50 text-rose-600 border border-rose-100 font-black uppercase px-2.5 py-2 rounded-xl whitespace-nowrap"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <ul className="p-1.5 space-y-0.5">
                    <li 
                      onClick={() => setForm({ ...form, product_ids: [] })}
                      className={`p-3 text-xs font-black uppercase rounded-xl cursor-pointer hover:bg-slate-50 transition-all flex items-center justify-between ${form.product_ids?.length === 0 ? 'bg-teal-50 text-teal-700' : 'text-slate-500'}`}
                    >
                      <span>🌍 Semua Produk Toko (Global)</span>
                      {form.product_ids?.length === 0 && <span>✓</span>}
                    </li>
                    <div className="border-t my-1 border-slate-100"></div>
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map(product => {
                        const isChecked = form.product_ids.includes(String(product.id));
                        return (
                          <li 
                            key={product.id}
                            onClick={(e) => { e.stopPropagation(); handleToggleProductSelection(product.id); }}
                            className={`p-3 text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-50 transition-all flex items-center justify-between truncate ${isChecked ? 'bg-teal-50 text-teal-700 font-black' : 'text-slate-700'}`}
                          >
                            <span className="truncate">📦 {product.name}</span>
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={() => handleToggleProductSelection(product.id)}
                              onClick={e => e.stopPropagation()} 
                              className="w-4 h-4 rounded accent-teal-700 cursor-pointer"
                            />
                          </li>
                        );
                      })
                    ) : (
                      <li className="p-3 text-center text-xs text-slate-400 font-bold uppercase tracking-wider">Produk tidak ditemukan</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Voucher</label>
                <input type="text" placeholder="Contoh: MERDEKA79" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black tracking-widest text-teal-700 focus:border-teal-600 outline-none font-mono" required />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Diskon</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:border-teal-600 outline-none">
                  <option value="percentage">Persentase (%)</option>
                  <option value="fixed">Rupiah (Fixed Rp)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Nilai Potongan {form.type === 'percentage' ? '(%)' : '(Rp)'}
                </label>
                <input type="number" placeholder={form.type === 'percentage' ? 'Contoh: 10' : 'Contoh: 15000'} value={form.value} onChange={e => setForm({...form, value: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-black focus:border-teal-600 outline-none font-mono" required />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Minimal Belanja (Rp)</label>
                <input type="number" placeholder="0 (Tanpa Minimal)" value={form.min_purchase} onChange={e => setForm({...form, min_purchase: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:border-teal-600 outline-none font-mono" />
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl">
              <input type="checkbox" id="is_active_check" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-5 h-5 rounded accent-teal-700 cursor-pointer" />
              <label htmlFor="is_active_check" className="text-xs font-black text-slate-600 uppercase cursor-pointer selection:bg-transparent">Aktifkan Voucher Ini Langsung</label>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button type="submit" disabled={uploading} className={UI.btnSubmit}>
              {uploading ? 'Sedang Memproses...' : 'Terbitkan Voucher'}
            </button>
            <button type="button" onClick={() => { setIsFormOpen(false); setSearchQuery(''); }} className={UI.btnCancel}>Batal</button>
          </div>
        </form>
      )}

      {/* DAFTAR VOUCHER */}
      <div className={UI.listWrap}>
        {loading ? (
          <div className="text-center py-24 text-[11px] font-black text-slate-300 animate-pulse uppercase tracking-[0.3em]">Menghubungkan Server Promosi...</div>
        ) : filteredDiscounts.length === 0 ? (
          <div className={UI.emptyState}>
            <p className="text-slate-400 font-bold text-sm">Belum ada promo aktif di toko ini.</p>
            <p className="text-[9px] text-slate-300 uppercase tracking-widest mt-1">Buat kode voucher pertamamu dengan menekan Buat Promo</p>
          </div>
        ) : filteredDiscounts.map(item => {
          const countAttached = item.product_ids?.length || 0;
          return (
            <div
              key={item.id}
              onClick={() => setSelectedDetail(item)}
              className={`${UI.listRow} justify-between`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="font-mono font-black text-teal-700 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100 tracking-wider text-xs group-hover:bg-teal-700 group-hover:text-white group-hover:border-teal-700 transition-all">
                    🎟️ {item.code}
                  </span>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${item.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {item.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${countAttached > 0 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {countAttached > 0 ? `🎯 ${countAttached} Produk` : '🌍 Global'}
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 truncate uppercase group-hover:text-teal-700 transition-colors">{item.name}</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                  Potongan: <span className="text-slate-700 font-black">{item.type === 'percentage' ? `${item.value}%` : `Rp ${(item.value || 0).toLocaleString('id-ID')}`}</span> 
                  {item.min_purchase > 0 && ` • Min. Belanja: Rp ${item.min_purchase.toLocaleString('id-ID')}`}
                </p>
              </div>

              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                {/* Toggle Aktif */}
                <button 
                  onClick={() => toggleDiscountStatus(item)} 
                  className={`px-4 py-2 text-[8px] font-black uppercase rounded-xl transition-all active:scale-95 ${item.is_active ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-teal-50 text-teal-700 border border-teal-100'}`}
                >
                  {item.is_active ? 'Matikan' : 'Aktifkan'}
                </button>
                
                {/* Edit */}
                <button 
                  onClick={() => { 
                    setForm({
                      id: item.id,
                      name: item.name || '',
                      code: item.code || '',
                      type: item.type || 'percentage',
                      value: item.value || '',
                      min_purchase: item.min_purchase || '0',
                      is_active: item.is_active,
                      product_ids: item.product_ids ? item.product_ids.map(id => String(id)) : []
                    }); 
                    setSearchQuery('');
                    setIsFormOpen(true); 
                    window.scrollTo({ top: 0, behavior: 'smooth' }); 
                  }} 
                  className="p-3 text-teal-600 hover:bg-teal-50 rounded-2xl transition-all active:scale-90"
                >
                  <IconEdit />
                </button>

                {/* Delete */}
                <button 
                  onClick={() => handleDeleteDiscount(item.id)} 
                  className="p-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all active:scale-90"
                >
                  <IconTrash />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      </div>

    </div>
  );
}