// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';

/**
 * StockManager.jsx (MANAJEMEN BAHAN BAKU & STOK PRODUK PREMIUM - BAHASA INDONESIA)
 * - Menarik data produk dari katalog ke dropdown searchable berdasarkan tenantId.
 * - Menarik data satuan dinamis dari tabel 'product_units' berdasarkan tenantId.
 * - Logika Sinkronisasi Konversi Otomatis: Gudang (KG) vs Takaran Kasir (ML).
 * - Kategori Bisnis dinamis ditarik langsung dari tabel 'product_categories' berdasarkan tenantId.
 * - VIEW SWITCHER & FULL SCREEN LOG DETAIL: Detail log mutasi tampil full screen premium di HP.
 * - 100% RESPONSIVE MOBILE FRIENDLY FIX (Sesuai dengan standard mockup terbaru).
 * - [DYNAMIC MULTI-TENANT RESOLVER] Deteksi tenantId berlapis dari prop & localStorage untuk mencegah kebocoran data toko.
 * - [ERROR LOGS FIXED] Menangkap & melempar error insert stock_logs secara eksplisit agar tidak terjadi silent-failure.
 * - [CONNECTION DETECTOR] Memunculkan warning spesifik jika kredensial Supabase di .env mengarah ke project yang salah.
 * - [ACTOR NAME FIX] actor_name diambil dari currentUser?.name (staff yang login), bukan hardcode.
 */

const IconChevronLeft = () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const IconPlus = () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

const UI = {
  btnBack: 'flex items-center gap-2 bg-white border border-slate-200 px-6 py-3.5 rounded-[1.5rem] shadow-sm text-[10px] font-black text-slate-800 active:scale-95 transition-all uppercase tracking-widest hover:border-slate-300',
  btnPrimary: 'text-white font-black text-[11px] uppercase tracking-[0.1em] px-6 sm:px-8 py-3.5 sm:py-4 rounded-[1.25rem] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 bg-gradient-to-br from-[#0f8b6b] to-teal-600 w-full sm:w-auto shrink-0',
  btnSubmit: 'flex-1 py-5 rounded-[1.75rem] bg-teal-600 text-white text-[11px] font-black uppercase tracking-[0.25em] shadow-xl shadow-teal-100 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50',
  btnCancel: 'px-8 py-5 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-wider rounded-2xl hover:bg-slate-200 transition-all',
  search: 'w-full bg-white border border-slate-200 rounded-3xl p-4 pl-12 text-sm font-bold shadow-sm focus:border-teal-600 outline-none transition-all',
  listWrap: 'space-y-4',
  listRow: 'bg-white px-5 py-4 rounded-[2rem] border border-slate-200/80 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:border-teal-300/60 cursor-pointer active:scale-[0.99]',
  listAvatar: 'w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 shrink-0 text-xl',
  emptyState: 'text-center py-16 border border-dashed border-slate-200 rounded-[2rem] bg-white',
  pageHeader: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-10',
  pageTitleBlock: 'min-w-0',
  pageTitle: 'text-xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight uppercase',
  pageSubtitle: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2',
};

export default function StockManager({ onBack, tenantId: propTenantId, currentUser, selectedOutletId, outlets = [] }) {
  // DETEKSI BERLAPIS MULTI-TENANT (Membaca prop atau penyimpanan lokal POS secara dinamis)
  const tenantId = useMemo(() => {
    const saved = localStorage.getItem('pos_current_user');
    const parsed = saved ? JSON.parse(saved) : null;
    return propTenantId || parsed?.tenant_id || null;
  }, [propTenantId]);

  const isMainOutlet = useMemo(() => {
    if (!selectedOutletId) return true;
    const current = outlets.find(o => String(o.id) === String(selectedOutletId));
    return current ? current.is_main : false;
  }, [outlets, selectedOutletId]);

  // Aktor transaksi: diambil dari staff yang sedang login, bukan hardcode
  const currentActorName = currentUser?.name || 'System';

  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // State untuk View Switcher (Tab Navigasi)
  const [activeTab, setActiveTab] = useState('stock');

  // State Dinamis Dropdown
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [productUnits, setProductUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // State untuk Full Screen Detail Overlay (Gudang View)
  const [selectedDetail, setSelectedDetail] = useState(null);

  // State Baru: FULL SCREEN OVERLAY DETAIL untuk Riwayat Transaksi Global
  const [selectedLogDetail, setSelectedLogDetail] = useState(null);

  // State untuk Modal Keluarkan Barang
  const [dispatchModal, setDispatchModal] = useState({ open: false, item: null });
  const [dispatchForm, setDispatchForm] = useState({ qty: '', note: '' });
  const [dispatching, setDispatching] = useState(false);

  // State untuk Modal Barang Masuk (Restock)
  const [restockModal, setRestockModal] = useState({ open: false, item: null });
  const [restockForm, setRestockForm] = useState({ qty: '', note: '' });
  const [restocking, setRestocking] = useState(false);

  // State untuk Riwayat Transaksi Per Item (Modal)
  const [historyModal, setHistoryModal] = useState({ open: false, item: null });
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // State Riwayat Transaksi Secara Keseluruhan (Global Logs) untuk View Switcher
  const [globalLogs, setGlobalLogs] = useState([]);
  const [globalLogsLoading, setGlobalLogsLoading] = useState(false);

  // Form State
  const [form, setForm] = useState({
    id: null,
    name: '',
    current_stock: '',
    unit: '',
    min_stock: '0.1',
    usage_coefficient: '5',
    product_id: '',
    business_mode: ''
  });

  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

  const showToast = useCallback((message, type = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 8000);
  }, []);

  const fetchStockItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      if (error) throw error;
      setStockItems(data || []);
    } catch (err) {
      console.error(err.message);
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, showToast]);

  const fetchGlobalLogs = useCallback(async () => {
    setGlobalLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('stock_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setGlobalLogs(data || []);
    } catch (err) {
      console.error("Gagal memuat riwayat keseluruhan:", err.message);
      if (err.message && err.message.includes('relation "public.stock_logs" does not exist')) {
        showToast("⚠️ ERROR KONEKSI: Tabel 'stock_logs' tidak ditemukan di database target! Tolong cek kembali apakah file .env Anda sudah terhubung ke project Supabase yang benar.");
      } else {
        showToast(`Gagal memuat riwayat transaksi: ${err.message}`);
      }
    } finally {
      setGlobalLogsLoading(false);
    }
  }, [tenantId, showToast]);

  const fetchUnits = useCallback(async () => {
    try {
      let query = supabase
        .from('product_units')
        .select('id, name')
        .eq('tenant_id', tenantId);

      if (selectedOutletId) {
        if (isMainOutlet) {
          query = query.or(`outlet_id.eq.${selectedOutletId},outlet_id.is.null`);
        } else {
          query = query.eq('outlet_id', selectedOutletId);
        }
      } else {
        query = query.is('outlet_id', null);
      }

      const { data, error } = await query.order('name', { ascending: true });

      if (error) throw error;
      setProductUnits(data || []);
      if (data && data.length > 0) {
        setForm(prev => prev.unit ? prev : { ...prev, unit: data[0].name });
      } else {
        setForm(prev => ({ ...prev, unit: '' }));
      }
    } catch (err) {
      console.error("Gagal memuat tabel product_units:", err.message);
      showToast(`Gagal memuat satuan: ${err.message}`);
    }
  }, [tenantId, selectedOutletId, isMainOutlet, showToast]);

  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, unit')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      if (error) throw error;
      setCatalogProducts(data || []);
    } catch (err) {
      console.error("Gagal memuat katalog produk:", err.message);
      showToast(`Gagal memuat katalog produk: ${err.message}`);
    }
  }, [tenantId, showToast]);

  const fetchCategories = useCallback(async () => {
    try {
      let query = supabase
        .from('product_categories')
        .select('id, name')
        .eq('tenant_id', tenantId);

      if (selectedOutletId) {
        if (isMainOutlet) {
          query = query.or(`outlet_id.eq.${selectedOutletId},outlet_id.is.null`);
        } else {
          query = query.eq('outlet_id', selectedOutletId);
        }
      } else {
        query = query.is('outlet_id', null);
      }

      const { data, error } = await query.order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
      if (data && data.length > 0) {
        setForm(prev => prev.business_mode ? prev : { ...prev, business_mode: data[0].name });
      } else {
        setForm(prev => ({ ...prev, business_mode: '' }));
      }
    } catch (err) {
      console.error("Gagal memuat kategori bisnis:", err.message);
      showToast(`Gagal memuat kategori bisnis: ${err.message}`);
    }
  }, [tenantId, selectedOutletId, isMainOutlet, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStockItems();
    fetchProducts();
    fetchUnits();
    fetchCategories();
    fetchGlobalLogs();
  }, [fetchStockItems, fetchProducts, fetchUnits, fetchCategories, fetchGlobalLogs]);

  const filteredProducts = useMemo(() => {
    return catalogProducts.filter(product =>
      (product.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [catalogProducts, searchQuery]);

  const selectedProductObj = useMemo(() => {
    return catalogProducts.find(p => String(p.id) === String(form.product_id));
  }, [catalogProducts, form.product_id]);

  const handleSaveStockItem = async (e) => {
    e.preventDefault();
    if (!form.name || form.current_stock === '') return;

    setUploading(true);
    const isRetail = (form.business_mode || '').toLowerCase().includes('ritel') || (form.business_mode || '').toLowerCase().includes('retail');

    const payload = {
      tenant_id: tenantId,
      name: form.name,
      current_stock: Number(form.current_stock) || 0,
      unit: form.unit,
      min_stock: Number(form.min_stock) || 0,
      usage_coefficient: isRetail ? 1 : (Number(form.usage_coefficient) || 1),
      product_id: form.product_id || null,
      outlet_id: selectedOutletId ? Number(selectedOutletId) : null
    };

    try {
      if (form.id) {
        const { error } = await supabase.from('stock_items').update(payload).eq('id', form.id).eq('tenant_id', tenantId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('stock_items').insert([payload]);
        if (error) throw error;
      }

      const defaultUnit = productUnits.length > 0 ? productUnits[0].name : 'KG';
      const defaultMode = categories.length > 0 ? categories[0].name : '';
      setForm({ id: null, name: '', current_stock: '', unit: defaultUnit, min_stock: '0.1', usage_coefficient: '5', product_id: '', business_mode: defaultMode });
      setIsFormOpen(false);
      setSearchQuery('');
      showToast("Data stok berhasil disimpan", "success");
      fetchStockItems();
      fetchGlobalLogs();
    } catch (err) {
      console.error(err.message);
      showToast(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Hapus item bahan baku dari database?")) return;
    try {
      const { error } = await supabase.from('stock_items').delete().eq('id', id).eq('tenant_id', tenantId);
      if (error) throw error;
      showToast("Bahan baku berhasil dihapus", "success");
      fetchStockItems();
      fetchGlobalLogs();
    } catch (err) {
      showToast(`Gagal menghapus: ${err.message}`);
    }
  };

  // FUNGSI UTAMA PENULISAN LOG - actor_name dari currentUser yang login
  const writeLog = async (item, type, qty, note, stockBefore, stockAfter) => {
    const { error } = await supabase.from('stock_logs').insert([{
      tenant_id: tenantId,
      stock_item_id: Number(item.id),
      stock_item_name: item.name,
      type,
      qty: Number(qty),
      note: note || null,
      stock_before: Number(stockBefore),
      stock_after: Number(stockAfter),
      actor_name: currentActorName  // ← Dari currentUser?.name, bukan hardcode
    }]);

    if (error) {
      console.error('Gagal menulis log mutasi ke Supabase:', error);
      let userMsg = error.message;
      if (error.message && error.message.includes('relation "public.stock_logs" does not exist')) {
        userMsg = "Tabel 'stock_logs' tidak ditemukan di database target! Pastikan kredensial file .env mengarah ke project Supabase yang benar.";
      }
      throw new Error(`Gagal mencatat mutasi ke tabel stock_logs: ${userMsg}`);
    }
  };

  const handleDispatch = async () => {
    const item = dispatchModal.item;
    const qty = Number(dispatchForm.qty);
    if (!qty || qty <= 0) return showToast("Masukkan jumlah yang valid");
    if (qty > Number(item.current_stock)) return showToast("Jumlah melebihi stok yang tersedia!");

    setDispatching(true);
    const stockBefore = Number(item.current_stock);
    const newStock = stockBefore - qty;
    try {
      const { error } = await supabase
        .from('stock_items')
        .update({ current_stock: newStock })
        .eq('id', item.id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await writeLog(item, 'keluar', qty, dispatchForm.note, stockBefore, newStock);

      showToast(`✅ ${qty} ${item.unit} ${item.name} berhasil dikeluarkan`, "success");
      setDispatchModal({ open: false, item: null });
      setDispatchForm({ qty: '', note: '' });
      fetchStockItems();
      fetchGlobalLogs();
    } catch (err) {
      showToast(`Gagal mutasi keluar: ${err.message}`);
    } finally {
      setDispatching(false);
    }
  };

  const handleRestock = async () => {
    const item = restockModal.item;
    const qty = Number(restockForm.qty);
    if (!qty || qty <= 0) return showToast("Masukkan jumlah yang valid");

    setRestocking(true);
    const stockBefore = Number(item.current_stock);
    const newStock = stockBefore + qty;
    try {
      const { error } = await supabase
        .from('stock_items')
        .update({ current_stock: newStock })
        .eq('id', item.id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await writeLog(item, 'masuk', qty, restockForm.note, stockBefore, newStock);

      showToast(`✅ ${qty} ${item.unit} ${item.name} berhasil ditambahkan`, "success");
      setRestockModal({ open: false, item: null });
      setRestockForm({ qty: '', note: '' });
      fetchStockItems();
      fetchGlobalLogs();
    } catch (err) {
      showToast(`Gagal restock: ${err.message}`);
    } finally {
      setRestocking(false);
    }
  };

  const fetchHistory = useCallback(async (item) => {
    setHistoryLoading(true);
    setHistoryLogs([]);
    try {
      const { data, error } = await supabase
        .from('stock_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('stock_item_id', item.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setHistoryLogs(data || []);
    } catch (err) {
      console.error(err);
      if (err.message && err.message.includes('relation "public.stock_logs" does not exist')) {
        showToast("⚠️ ERROR: Tabel 'stock_logs' tidak terdeteksi! Silakan periksa kredensial .env proyek Supabase Anda.");
      } else {
        showToast(`Gagal memuat riwayat: ${err.message}`);
      }
    } finally {
      setHistoryLoading(false);
    }
  }, [tenantId, showToast]);

  const isFormRetailMode = (form.business_mode || '').toLowerCase().includes('ritel') || (form.business_mode || '').toLowerCase().includes('retail');

  const filteredStockItems = useMemo(() => {
    return stockItems.filter(item => {
      if (selectedOutletId) {
        const iOutlet = item.outlet_id ? String(item.outlet_id) : null;
        const matchesOutlet = iOutlet === String(selectedOutletId);
        const isGlobal = !item.outlet_id || String(item.outlet_id) === 'null';
        if (!matchesOutlet && !(isMainOutlet && isGlobal)) return false;
      }
      return true;
    });
  }, [stockItems, selectedOutletId, isMainOutlet]);

  const filteredGlobalLogs = useMemo(() => {
    return globalLogs.filter(log => {
      const item = stockItems.find(s => s.id === log.stock_item_id);
      if (!item) return false;
      if (selectedOutletId) {
        const iOutlet = item.outlet_id ? String(item.outlet_id) : null;
        const matchesOutlet = iOutlet === String(selectedOutletId);
        const isGlobal = !item.outlet_id || String(item.outlet_id) === 'null';
        if (!matchesOutlet && !(isMainOutlet && isGlobal)) return false;
      }
      return true;
    });
  }, [globalLogs, stockItems, selectedOutletId, isMainOutlet]);

  return (
    <div className="pb-32 bg-[#F8FAFC] min-h-screen font-sans relative">

      {/* GLOBAL TOAST */}
      {toast.show && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[999999] px-5 py-3.5 rounded-2xl shadow-2xl flex flex-col gap-1 animate-in fade-in slide-in-from-top-4 duration-300 text-white w-[92%] max-w-md ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider flex-1">{toast.message}</span>
            <button onClick={() => setToast({ show: false, message: '', type: 'error' })} className="text-white/80 text-xs px-1">✕</button>
          </div>
        </div>
      )}

      {/* FULL SCREEN OVERLAY DETAIL STOCK PREMIUM (VIEW UTAMA) */}
      {selectedDetail && (() => {
        const isDetailLow = Number(selectedDetail.current_stock) <= (Number(selectedDetail.min_stock) || 0);
        const linkedBackProd = catalogProducts.find(p => String(p.id) === String(selectedDetail.product_id));
        return (
          <div className="fixed inset-0 bg-[#F8FAFC] z-[99999] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 sm:p-6 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
              <button onClick={() => setSelectedDetail(null)} className="flex items-center gap-1 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-[10px] font-black text-slate-800 uppercase tracking-wider"><IconChevronLeft /> Tutup</button>
              <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl ${isDetailLow ? 'bg-rose-100 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{isDetailLow ? '🚨 STOK MINIMUM' : '✅ Aman'}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-2xl mx-auto w-full space-y-6">
              <header className="border-b pb-4">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Bahan Gudang</span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">{selectedDetail.name}</h1>
              </header>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Stok</span>
                  <p className="text-4xl font-mono font-black text-slate-900">{Number(selectedDetail.current_stock).toLocaleString('id-ID')}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase mt-1">{selectedDetail.unit}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
                  <p className="text-xs font-bold text-slate-700">Takaran Potong: <span className="text-teal-600 font-black">{selectedDetail.usage_coefficient || 1} ML/Gram</span> per item penjualan kasir.</p>
                  <p className="text-xs font-bold text-slate-400">Batas Minimum: {selectedDetail.min_stock} {selectedDetail.unit}</p>
                  <span className="text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-100 px-2 py-1 rounded-md inline-block uppercase mt-2">🎯 Koneksi: {linkedBackProd ? linkedBackProd.name : 'Murni Retail'}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* FULL SCREEN OVERLAY DETAIL TRANSAKSI MUTASI */}
      {selectedLogDetail && (() => {
        const isKeluar = selectedLogDetail.type === 'keluar';
        return (
          <div className="fixed inset-0 bg-[#F8FAFC] z-[99999] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 sm:p-6 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="flex items-center gap-1 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-[10px] font-black text-slate-800 uppercase tracking-wider"
              >
                <IconChevronLeft /> Tutup Detail
              </button>
              <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl ${isKeluar ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {isKeluar ? '📤 KELUAR / TERJUAL' : '📥 MASUK / RESTOCK'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-2xl mx-auto w-full space-y-6">
              <header className="border-b pb-4">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Log Mutasi Terpilih</span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight leading-tight">{selectedLogDetail.stock_item_name}</h1>
              </header>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume Mutasi</span>
                <p className={`text-4xl sm:text-5xl font-mono font-black ${isKeluar ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {isKeluar ? '-' : '+'}{Number(selectedLogDetail.qty).toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Sisa Stok Akhir di Gudang: <span className="font-mono font-black text-slate-800">{Number(selectedLogDetail.stock_after).toLocaleString('id-ID')}</span></p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Diproses Oleh (Aktor)</span>
                  <span className="font-black text-teal-600 uppercase text-xs">👤 {selectedLogDetail.actor_name || 'System'}</span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Waktu Transaksi</span>
                  <span className="font-bold text-slate-800 text-xs">{new Date(selectedLogDetail.created_at).toLocaleString('id-ID')}</span>
                </div>

                <div className="pt-2">
                  <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block mb-1.5">Catatan / Keterangan</span>
                  <p className="bg-slate-50 border border-slate-100 p-3 rounded-xl font-medium text-slate-700 italic text-xs leading-relaxed">
                    {selectedLogDetail.note || 'Tidak ada catatan atau alasan tambahan yang dimasukkan.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* CONTAINER MONITORING VIEW UTAMA */}
        {!isFormOpen && (
          <div className="space-y-4 sm:space-y-6">
            <div className="mb-2">
              <button onClick={onBack} className={UI.btnBack}><IconChevronLeft /> Kembali</button>
            </div>

            <header className={UI.pageHeader}>
              <div className={UI.pageTitleBlock}>
                <h2 className={UI.pageTitle}>Stock & Bahan</h2>
                <div className={UI.pageSubtitle}>Multi-Tenant Logistik & Konsumsi Bahan Otomatis Kasir</div>
              </div>
              {activeTab === 'stock' && (
                <button
                  onClick={() => {
                    const defaultUnit = productUnits.length > 0 ? productUnits[0].name : 'KG';
                    const defaultMode = categories.length > 0 ? categories[0].name : '';
                    setForm({ id: null, name: '', current_stock: '', unit: defaultUnit, min_stock: '0.1', usage_coefficient: '5', product_id: '', business_mode: defaultMode });
                    setSearchQuery('');
                    setSelectedDetail(null);
                    setIsFormOpen(true);
                  }}
                  className={UI.btnPrimary}
                >
                  <IconPlus /> Tambah Bahan
                </button>
              )}
            </header>

            <div className="bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[9px] font-black uppercase text-teal-700 tracking-wider w-fit">
              <span>👤 Operator:</span>
              <span className="font-mono text-slate-800 bg-white border border-slate-100 px-1.5 py-0.5 rounded-md">{currentActorName}</span>
            </div>

            {/* VIEW SWITCHER (TAB NAVIGASI PREMIUM) */}
            <div className="flex border-b border-slate-200 gap-4 sm:gap-6 pl-1">
              <button
                type="button"
                onClick={() => setActiveTab('stock')}
                className={`pb-2.5 text-[11px] sm:text-xs uppercase tracking-wider font-black transition-all relative ${activeTab === 'stock' ? 'text-teal-600' : 'text-slate-400'}`}
              >
                📋 Stok Bahan
                {activeTab === 'stock' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full"></div>}
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('history'); fetchGlobalLogs(); }}
                className={`pb-2.5 text-[11px] sm:text-xs uppercase tracking-wider font-black transition-all relative ${activeTab === 'history' ? 'text-teal-600' : 'text-slate-400'}`}
              >
                🕒 Riwayat Transaksi
                {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-full"></div>}
              </button>
            </div>



            {/* TAB 1: LIST MONITORING STOCK UTAMA */}
            {activeTab === 'stock' && (
              <div className={UI.listWrap}>
                {loading ? (
                  <div className="text-center py-20 text-[10px] font-black text-slate-300 animate-pulse uppercase tracking-[0.2em]">Memuat Lemari Stok...</div>
                ) : filteredStockItems.length === 0 ? (
                  <div className={UI.emptyState}><p className="text-slate-400 font-bold text-xs">Tidak ada stok bahan terdaftar.</p></div>
                ) : filteredStockItems.map(item => {
                  const isLowStock = Number(item.current_stock) <= (Number(item.min_stock) || 0);
                  const itemLinkedProd = catalogProducts.find(p => String(p.id) === String(item.product_id));
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedDetail(item)}
                      className={`${UI.listRow} flex-col sm:flex-row sm:items-center justify-between gap-3`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={UI.listAvatar}>📦</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-black text-slate-900 truncate uppercase">{item.name}</h4>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${isLowStock ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>{isLowStock ? '🚨 LIMIT' : '✅ AMAN'}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Koef: {item.usage_coefficient || 1} ML/Gr</span>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border uppercase ${itemLinkedProd ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                              🎯 {itemLinkedProd ? itemLinkedProd.name : 'Retail'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-slate-100 pt-2.5 sm:pt-0 w-full sm:w-auto" onClick={e => e.stopPropagation()}>
                        <div className="text-right sm:text-right pl-1">
                          <p className="text-xl font-black font-mono text-slate-900 leading-none">
                            {Number(item.current_stock).toLocaleString('id-ID', { maximumFractionDigits: 3 })}
                          </p>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{item.unit}</p>
                        </div>

                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            onClick={() => { setRestockModal({ open: true, item }); setRestockForm({ qty: '', note: '' }); }}
                            className="px-2.5 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[9px] font-black uppercase active:scale-90"
                          >
                            Masuk
                          </button>
                          <button
                            onClick={() => { setDispatchModal({ open: true, item }); setDispatchForm({ qty: '', note: '' }); }}
                            className="px-2.5 py-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg text-[9px] font-black uppercase active:scale-90"
                          >
                            Keluar
                          </button>
                          <button
                            onClick={() => { setHistoryModal({ open: true, item }); fetchHistory(item); }}
                            className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-all"
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                          </button>
                          <button
                            onClick={() => {
                              const matchedCategory = categories.find(c => Number(item.usage_coefficient) === 1 ? c.name.toLowerCase().includes('ritel') || c.name.toLowerCase().includes('retail') : !c.name.toLowerCase().includes('ritel') && !c.name.toLowerCase().includes('retail'));
                              setForm({
                                id: item.id,
                                name: item.name || '',
                                current_stock: String(item.current_stock || '0'),
                                unit: item.unit || '',
                                min_stock: String(item.min_stock || '0.1'),
                                usage_coefficient: String(item.usage_coefficient || '5'),
                                product_id: item.product_id ? String(item.product_id) : '',
                                business_mode: matchedCategory ? matchedCategory.name : (categories[0]?.name || '')
                              });
                              setSearchQuery(itemLinkedProd ? itemLinkedProd.name : '');
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="3" fill="none"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="3" fill="none"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: DETAILED GLOBAL HISTORY LOG VIEW */}
            {activeTab === 'history' && (
              <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-150">
                <div className="pl-1">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">📋 Log Aktivitas Stok Gudang</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Klik salah satu baris untuk melihat detail full screen aktor pelaksana</p>
                </div>

                {globalLogsLoading ? (
                  <div className="text-center py-20 text-[10px] font-black text-slate-300 animate-pulse uppercase tracking-wider">Memuat Seluruh Riwayat...</div>
                ) : filteredGlobalLogs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-bold text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">Belum ada riwayat transaksi mutasi apapun.</div>
                ) : (
                  <div className={UI.listWrap}>
                    {filteredGlobalLogs.map((log, i) => {
                      const isKeluar = log.type === 'keluar';
                      const logTime = new Date(log.created_at);
                      const timeStr = logTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                      const dateStr = logTime.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
                      return (
                        <div
                          key={i}
                          onClick={() => setSelectedLogDetail(log)}
                          className={`${UI.listRow} ${isKeluar ? 'bg-amber-50/30' : 'bg-emerald-50/30'}`}
                        >
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-xl ${isKeluar ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                            {isKeluar ? '📤' : '📥'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                              <span className="text-[11px] font-black text-slate-900 truncate uppercase max-w-[140px] sm:max-w-none">{log.stock_item_name}</span>
                              <span className={`text-[7px] font-black uppercase px-1 py-0.2 rounded-md ${isKeluar ? 'bg-amber-200 text-amber-800' : 'bg-emerald-200 text-emerald-800'}`}>{isKeluar ? 'OUT' : 'IN'}</span>
                            </div>
                            <p className="text-[9px] font-bold text-slate-400">{dateStr} · {timeStr} {log.actor_name ? `· 👤 ${log.actor_name}` : ''}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-xs font-black font-mono ${isKeluar ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {isKeluar ? '-' : '+'}{Number(log.qty).toLocaleString('id-ID')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* FORM INPUT BAHAN BAKU */}
        {isFormOpen && (
          <form onSubmit={handleSaveStockItem} className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-[3rem] border border-slate-200 shadow-2xl mb-10 space-y-5 animate-in slide-in-from-top-6 duration-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">{form.id ? 'Edit Item Stok' : 'Tambah Bahan Baku Baru'}</h3>
              <button type="button" onClick={() => { setIsFormOpen(false); setSearchQuery(''); }} className="text-slate-400 font-bold hover:text-slate-600 px-1">✕</button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Nama Bahan Baku / Supply Gudang</label>
                <input type="text" placeholder="Contoh: Sabun Laundry Liquid, Biji Kopi Arabika" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-bold text-slate-800 outline-none focus:border-teal-600" required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Stok Sekarang</label>
                  <input type="number" step="any" placeholder="0" value={form.current_stock} onChange={e => setForm({ ...form, current_stock: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-mono font-black text-slate-800 outline-none focus:border-teal-600" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Satuan Gudang</label>
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-bold text-slate-800 outline-none cursor-pointer focus:border-teal-600" required>
                    {productUnits.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                    {productUnits.length === 0 && <option value="KG">KG</option>}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Batas Min (Alert)</label>
                  <input type="number" step="any" placeholder="0.1" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-mono font-black text-slate-800 outline-none focus:border-teal-600" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Jenis Layanan Bisnis</label>
                  <select value={form.business_mode} onChange={e => {
                    const selectedCat = e.target.value;
                    const isRetail = selectedCat.toLowerCase().includes('ritel') || selectedCat.toLowerCase().includes('retail');
                    setForm(prev => ({ ...prev, business_mode: selectedCat, usage_coefficient: isRetail ? '1' : prev.usage_coefficient }));
                  }} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-bold text-slate-800 outline-none cursor-pointer focus:border-teal-600" required>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    {categories.length === 0 && <option value="Laundry Kiloan">Laundry / Jasa</option>}
                  </select>
                </div>

                {!isFormRetailMode && (
                  <div className="space-y-1.5 animate-in fade-in duration-150">
                    <label className="text-[9px] font-black text-teal-600 uppercase tracking-wider">Takaran Potong per Kuantitas Kasir (ML)</label>
                    <input type="number" placeholder="Contoh: isi 5" value={form.usage_coefficient} onChange={e => setForm({ ...form, usage_coefficient: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-mono font-black text-slate-800 outline-none focus:border-teal-600" required />
                  </div>
                )}
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-[9px] font-black text-teal-600 uppercase tracking-wider">Hubungkan ke Produk Kasir</label>
                <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-bold flex justify-between items-center cursor-pointer select-none shadow-sm hover:border-slate-300 transition-all">
                  <span className={selectedProductObj ? "text-slate-900 font-black" : "text-slate-400"}>
                    {selectedProductObj ? `📦 ${selectedProductObj.name}` : 'Murni Retail (Sesuai Nama Barang)'}
                  </span>
                  <span className="text-[9px] text-slate-400">▼</span>
                </div>
                {isDropdownOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    <div className="p-2 sticky top-0 bg-white border-b border-slate-100">
                      <input
                        type="text"
                        placeholder="Cari nama produk kasir..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none"
                      />
                    </div>
                    <ul className="p-1 text-xs">
                      <li onClick={() => { setForm({ ...form, product_id: '' }); setIsDropdownOpen(false); setSearchQuery(''); }} className={`p-2 rounded-lg cursor-pointer hover:bg-slate-50 ${!form.product_id ? 'text-teal-600 font-black' : 'text-slate-400'}`}>🌍 Murni Retail (Berdasarkan Kesamaan Nama)</li>
                      {filteredProducts.map(product => (
                        <li key={product.id} onClick={() => { setIsDropdownOpen(false); setSearchQuery(''); setForm(prev => ({ ...prev, product_id: String(product.id), name: isFormRetailMode ? product.name : prev.name, unit: isFormRetailMode ? (product.unit || 'Pcs') : prev.unit })); }} className={`p-2 rounded-lg cursor-pointer hover:bg-slate-50 truncate ${String(form.product_id) === String(product.id) ? 'text-teal-600 font-black' : 'text-slate-700'}`}>📦 {product.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <button type="submit" disabled={uploading} className={UI.btnSubmit}>{uploading ? 'Menyimpan...' : 'Simpan Bahan'}</button>
              <button type="button" onClick={() => { setIsFormOpen(false); setSearchQuery(''); }} className={UI.btnCancel}>Batal</button>
            </div>
          </form>
        )}

      </div>

      {/* MODAL KELUARKAN BARANG MANUAL */}
      {dispatchModal.open && dispatchModal.item && (
        <div className="fixed inset-0 z-[999998] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-6 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[8px] font-black text-amber-500 uppercase tracking-wider">Keluarkan Barang Manual</p>
                <h3 className="text-sm font-black text-slate-900 uppercase">{dispatchModal.item.name}</h3>
              </div>
              <button onClick={() => setDispatchModal({ open: false, item: null })} className="text-slate-400 font-bold text-base px-1">✕</button>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between text-xs">
              <span className="font-bold text-amber-600 uppercase text-[9px]">Stok Saat Ini</span>
              <span className="font-black font-mono text-amber-700">{Number(dispatchModal.item.current_stock).toLocaleString('id-ID')} {dispatchModal.item.unit}</span>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Jumlah Keluar ({dispatchModal.item.unit})</label>
                <input type="number" step="any" min="0.01" placeholder="0" value={dispatchForm.qty} onChange={e => setDispatchForm(prev => ({ ...prev, qty: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xl font-black font-mono text-center outline-none focus:border-amber-400" autoFocus />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Keterangan / Alasan</label>
                <input type="text" placeholder="Contoh: Rusak, kadaluarsa, dll" value={dispatchForm.note} onChange={e => setDispatchForm(prev => ({ ...prev, note: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-amber-400" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleDispatch} disabled={dispatching || !dispatchForm.qty || Number(dispatchForm.qty) <= 0} className="flex-1 py-3.5 bg-amber-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-md">📤 Keluarkan</button>
              <button onClick={() => { setDispatchModal({ open: false, item: null }); setDispatchForm({ qty: '', note: '' }); }} className="px-5 py-3.5 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-wider rounded-xl">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BARANG MASUK (RESTOCK) */}
      {restockModal.open && restockModal.item && (
        <div className="fixed inset-0 z-[999998] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-6 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-wider">📦 Restock / Barang Masuk</p>
                <h3 className="text-sm font-black text-slate-900 uppercase">{restockModal.item.name}</h3>
              </div>
              <button onClick={() => setRestockModal({ open: false, item: null })} className="text-slate-400 font-bold text-base px-1">✕</button>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-600 uppercase text-[9px]">Stok Saat Ini</span>
              <span className="font-black font-mono text-emerald-700">{Number(restockModal.item.current_stock).toLocaleString('id-ID')} {restockModal.item.unit}</span>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Jumlah Tambah ({restockModal.item.unit})</label>
                <input type="number" step="any" min="0.01" placeholder="0" value={restockForm.qty} onChange={e => setRestockForm(prev => ({ ...prev, qty: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xl font-black font-mono text-center outline-none focus:border-emerald-400" autoFocus />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Keterangan / Supplier</label>
                <input type="text" placeholder="Contoh: Kiriman supplier, belanja bulanan" value={restockForm.note} onChange={e => setRestockForm(prev => ({ ...prev, note: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none focus:border-emerald-400" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleRestock} disabled={restocking || !restockForm.qty || Number(restockForm.qty) <= 0} className="flex-1 py-3.5 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-md">📥 Tambah</button>
              <button onClick={() => { setRestockModal({ open: false, item: null }); setRestockForm({ qty: '', note: '' }); }} className="px-5 py-3.5 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-wider rounded-xl">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RIWAYAT TRANSAKSI PER ITEM */}
      {historyModal.open && historyModal.item && (
        <div className="fixed inset-0 z-[999998] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-5 flex items-center justify-between border-b border-slate-100">
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">🕒 Histori Mutasi</p>
                <h3 className="text-sm font-black text-slate-900 uppercase">{historyModal.item.name}</h3>
              </div>
              <button onClick={() => setHistoryModal({ open: false, item: null })} className="text-slate-400 font-bold text-base px-2">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
              {historyLoading ? (
                <div className="text-center py-12 text-[10px] font-black text-slate-300 animate-pulse uppercase">Memuat Riwayat...</div>
              ) : historyLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold">Belum ada riwayat transaksi.</div>
              ) : historyLogs.map((log, i) => {
                const isKeluar = log.type === 'keluar';
                return (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${isKeluar ? 'bg-amber-50/40 border-amber-100' : 'bg-emerald-50/40 border-emerald-100'}`}>
                    <span className="text-base flex-shrink-0">{isKeluar ? '📤' : '📥'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[8px] font-black uppercase px-1 py-0.2 rounded ${isKeluar ? 'bg-amber-200 text-amber-800' : 'bg-emerald-200 text-emerald-800'}`}>{isKeluar ? 'OUT' : 'IN'}</span>
                        <span className="font-black font-mono text-slate-700">{isKeluar ? '-' : '+'}{Number(log.qty).toLocaleString('id-ID')}</span>
                      </div>
                      {log.note && <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">{log.note}</p>}
                      <p className="text-[8px] font-bold text-slate-300 mt-0.5">{new Date(log.created_at).toLocaleDateString('id-ID')} {log.actor_name ? `· 👤 ${log.actor_name}` : ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-3 border-t border-slate-100 flex-shrink-0">
              <button onClick={() => setHistoryModal({ open: false, item: null })} className="w-full py-3 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-wider rounded-xl">Tutup</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}