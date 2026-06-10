// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { formatRupiah } from '../utils/platformAdmin';

/**
 * KatalogProduk.js (VERSI PREMIUM BLUE POS THEME - V5.7 BUG FIX)
 * - [FIXED] Bug duration_type berubah ke "Menit" saat edit produk dengan durasi "Hari/Jam/dll"
 *   Root cause: useEffect set default form hanya cek !form.category, tidak cek form.id === null
 *   Fix: Tambah kondisi && form.id === null agar tidak override saat mode edit
 * - Sistem Barcode Generator (Code 39 SVG) untuk scan kasir instan.
 * - Tombol Auto-Generate Barcode di form input.
 * - Tampilan "Sistem Scan & SKU" premium di dalam Detail Produk.
 * - Form Tambah/Edit Produk menggunakan View Switcher (inline) agar tidak menutup tab bawah.
 * - Detail Produk dipertahankan Fullscreen Overlay premium.
 * - Custom Delete Dialog Centered.
 * - Defensive string parsing untuk barcode & harga untuk mencegah "Error Semua" / crash total.
 * - Fitur Toast Notification di atas layar untuk mendeteksi error koneksi/DB secara anggun.
 */

// Ikon untuk UI Modern
const IconPlus = () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconChevronLeft = () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const IconAlertTriangle = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);
const IconImage = () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;
const IconBarcode = () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5v14M6 5v14M11 5v14M14 5v14M17 5v14M21 5v14" /></svg>;

const UI = {
  btnBack: 'flex items-center gap-2 bg-white border border-slate-200 px-6 py-3.5 rounded-[1.5rem] shadow-sm text-[10px] font-black text-slate-800 active:scale-95 transition-all uppercase tracking-widest hover:border-slate-300',
  btnPrimary: 'text-white font-black text-[11px] uppercase tracking-[0.1em] px-6 sm:px-8 py-3.5 sm:py-4 rounded-[1.25rem] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 bg-gradient-to-br from-[#0f8b6b] to-teal-600 w-full sm:w-auto shrink-0',
  btnSubmit: 'w-full py-5 rounded-[1.75rem] bg-teal-600 text-white text-[11px] font-black uppercase tracking-[0.25em] shadow-xl shadow-teal-100 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-3',
  btnCancel: 'w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest text-center hover:text-slate-600 transition-all',
  search: 'w-full bg-white border border-slate-200 rounded-3xl p-4 pl-12 text-sm font-bold shadow-sm focus:border-teal-600 outline-none transition-all',
  listWrap: 'space-y-4',
  listRow: 'bg-white px-5 py-4 rounded-[2rem] border border-slate-200/80 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:border-teal-300/60 cursor-pointer active:scale-[0.99]',
  listAvatar: 'w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 shrink-0',
  emptyState: 'text-center py-16 border border-dashed border-slate-200 rounded-[2rem] bg-white',
  pageHeader: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-10',
  pageTitleBlock: 'min-w-0',
  pageTitle: 'text-xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight uppercase',
  pageSubtitle: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2',
};

// --- COMPONENT BARCODE GENERATOR (Code 39 SVG) ---
const BarcodeGenerator = ({ value }) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const code39Map = {
    '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
    '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
    '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
    'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
    'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
    'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
    'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
    'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
    'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
    '-': '100101011011', '.': '110010101101', ' ': '100110101101', '*': '100101101101'
  };

  const cleanValue = useMemo(() => {
    const strVal = String(value || '');
    return strVal.toUpperCase().replace(/[^0-9A-Z\-.\s]/g, '');
  }, [value]);

  const bars = useMemo(() => {
    if (!cleanValue) return null;
    const fullString = `*${cleanValue}*`;
    let result = '';
    for (let char of fullString) {
      const pattern = code39Map[char] || code39Map[' '];
      result += pattern + '0';
    }
    return result;
  }, [cleanValue, code39Map]);

  if (!bars) return <div className="text-slate-300 font-bold text-xs py-2">Barcode tidak valid</div>;

  const barWidth = 2;
  const height = 45;
  const totalWidth = bars.length * barWidth;

  return (
    <div className="flex flex-col items-center">
      <svg width={totalWidth} height={height} className="block">
        {bars.split('').map((bit, index) => {
          if (bit === '1') {
            return (
              <rect
                key={index}
                x={index * barWidth}
                y={0}
                width={barWidth}
                height={height}
                fill="#1e293b"
              />
            );
          }
          return null;
        })}
      </svg>
      <span className="text-[10px] font-black tracking-[0.25em] text-slate-800 font-mono mt-1.5">{cleanValue}</span>
    </div>
  );
};

// TERIMA PROPS TENANT_ID DARI APP.JSX SECARA DINAMIS
export default function KatalogProduk({ tenantId: propTenantId, selectedOutletId, outlets = [] }) {
  const tenantId = propTenantId;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Master Data State
  const [categories, setCategories] = useState([]);
  const [durationUnits, setDurationUnits] = useState([]);
  const [productUnits, setProductUnits] = useState([]);

  // eslint-disable-next-line no-unused-vars
  const isMainOutlet = useMemo(() => {
    if (!selectedOutletId) return true;
    const current = outlets.find(o => String(o.id) === String(selectedOutletId));
    return current ? current.is_main : false;
  }, [outlets, selectedOutletId]);

  const filteredCategories = useMemo(() => {
    return categories.filter(c => {
      if (selectedOutletId) {
        // Jika item punya outlet_id, harus cocok. 
        // Jika item outlet_id-nya null, kita anggap dia milik outlet utama (isMainOutlet).
        if (c.outlet_id) return String(c.outlet_id) === String(selectedOutletId);
        return isMainOutlet; 
      }
      return true;
    });
  }, [categories, selectedOutletId, isMainOutlet]);

  const filteredDurationUnits = useMemo(() => {
    return durationUnits.filter(d => {
      if (selectedOutletId) {
        if (d.outlet_id) return String(d.outlet_id) === String(selectedOutletId);
        return isMainOutlet;
      }
      return true;
    });
  }, [durationUnits, selectedOutletId, isMainOutlet]);

  const filteredProductUnits = useMemo(() => {
    return productUnits.filter(u => {
      if (selectedOutletId) {
        if (u.outlet_id) return String(u.outlet_id) === String(selectedOutletId);
        return isMainOutlet;
      }
      return true;
    });
  }, [productUnits, selectedOutletId, isMainOutlet]);

  const [currentView, setCurrentView] = useState('katalog');
  const [selectedCategory, setSelectedCategory] = useState('Semua');

  const [searchTerm, setSearchTerm] = useState('');
  const [detailProduct, setDetailProduct] = useState(null);

  // --- TOAST NOTIFIKASI ERROR/SUKSES GLOBAL ---
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

  const showToast = useCallback((message, type = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 6000);
  }, []);

  // --- STATE CUSTOM DIALOG DELETE (TENGAH LAYAR) ---
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: 'product',
    idTarget: null,
    displayTitle: '',
    table: ''
  });

  // Form States (Harden Strings)
  const [form, setForm] = useState({ id: null, name: '', price: '', category: '', duration: '', duration_type: 'Menit', unit: 'Pcs', min_qty: '1', image_url: '', barcode: '' });
  const [categoryForm, setCategoryForm] = useState({ id: null, name: '', type: 'ritel' });
  const [durationForm, setDurationForm] = useState({ id: null, name: '' });
  const [unitForm, setUnitForm] = useState({ id: null, name: '' });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);

  // Pengaman parsing harga angka
  const formatPrice = (price) => {
    return formatRupiah(price);
  };

  // Bungkus fungsi pemanggilan data dengan useCallback
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: p, error: pError } = await supabase.from('products').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
      if (pError) throw pError;
      setProducts(p || []);

      const { data: c, error: cError } = await supabase
        .from('product_categories')
        .select('*')
        .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
        .order('id', { ascending: true });
      if (cError) throw cError;
      setCategories(c || []);

      const { data: d, error: dError } = await supabase
        .from('duration_units')
        .select('*')
        .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
        .order('id', { ascending: true });
      if (dError) throw dError;
      setDurationUnits(d || []);

      const { data: u, error: uError } = await supabase
        .from('product_units')
        .select('*')
        .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
        .order('id', { ascending: true });
      if (uError) throw uError;
      setProductUnits(u || []);
    } catch (err) {
      console.error(err);
      showToast(`Gagal memuat database: ${err.message || 'Error koneksi'}`);
    } finally {
      setLoading(false);
    }
  }, [tenantId, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAllData();
  }, [fetchAllData]);

  // ─── BUG FIX: Tambah kondisi form.id === null agar tidak override duration_type saat mode EDIT ───
  useEffect(() => {
    if (filteredCategories.length > 0 && !form.category && form.id === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(prev => ({
        ...prev,
        category: filteredCategories[0]?.name || '',
        category_type: filteredCategories[0]?.type || 'ritel',
        duration_type: filteredDurationUnits[0]?.name || 'Menit',
        unit: filteredProductUnits[0]?.name || 'Pcs'
      }));
    }
  }, [filteredCategories, filteredDurationUnits, filteredProductUnits, form.category, form.id]);

  const isJasa = useMemo(() => {
    if (form.category_type) return form.category_type === 'jasa';
    const currentCategory = form.category || (filteredCategories[0]?.name || '');
    const found = filteredCategories.find(c => c.name === currentCategory);
    return found?.type === 'jasa';
  }, [form.category, form.category_type, filteredCategories]);

  const handleBackToDashboard = () => {
    localStorage.setItem('pos_active_tab', 'dashboard');
    window.location.reload();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const uploadImageToStorage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${tenantId}_${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from('produk-images').upload(fileName, file, { upsert: true });
    if (error) {
      throw new Error("Gagal mengupload gambar. Pastikan Bucket 'produk-images' sudah aktif di Supabase Storage.");
    }
    const { data: urlData } = supabase.storage.from('produk-images').getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const generateRandomBarcode = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    setForm(prev => ({ ...prev, barcode: `KP-${randomNum}` }));
  };

  const triggerDelete = (type, id, title, table) => {
    setDeleteModal({ isOpen: true, type, idTarget: id, displayTitle: title, table });
  };

  const handleConfirmDelete = async () => {
    try {
      const { error } = await supabase.from(deleteModal.table).delete().eq('id', deleteModal.idTarget);
      if (error) throw error;
      setDeleteModal({ ...deleteModal, isOpen: false });
      setDetailProduct(null);
      showToast("Berhasil menghapus data dari sistem", "success");
      fetchAllData();
    } catch (err) {
      console.error(err.message);
      showToast(`Gagal menghapus: ${err.message}`);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return;
    setUploading(true);
    try {
      let imageUrl = form.image_url || '';
      if (imageFile) imageUrl = await uploadImageToStorage(imageFile);
      const payload = {
        tenant_id: tenantId,
        name: form.name,
        price: Number(form.price) || 0,
        category: form.category || (filteredCategories[0]?.name || 'Umum'),
        duration: isJasa ? (Number(form.duration) || 0) : 0,
        duration_type: isJasa ? (form.duration_type || 'Menit') : 'Menit',
        unit: isJasa ? (form.unit || 'Pcs') : (filteredProductUnits[0]?.name || 'Pcs'),
        min_qty: isJasa ? (Number(form.min_qty) || 1) : 1,
        image_url: imageUrl,
        barcode: form.barcode || '',
        outlet_id: selectedOutletId ? Number(selectedOutletId) : null
      };

      if (form.id) {
        const { error } = await supabase.from('products').update(payload).eq('id', form.id).eq('tenant_id', tenantId);
        if (error) {
          if (error.code === '42703') {
            throw new Error("Kolom 'barcode' belum ada di tabel 'products' Anda di Supabase. Silakan tambahkan kolom tersebut lewat SQL Editor.");
          }
          throw error;
        }
      } else {
        const { error } = await supabase.from('products').insert([payload]);
        if (error) {
          if (error.code === '42703') {
            throw new Error("Kolom 'barcode' belum ada di tabel 'products' Anda di Supabase. Silakan tambahkan kolom tersebut lewat SQL Editor.");
          }
          throw error;
        }
      }

      setForm({ id: null, name: '', price: '', category: filteredCategories[0]?.name || '', category_type: filteredCategories[0]?.type || 'ritel', duration: '', duration_type: filteredDurationUnits[0]?.name || 'Menit', unit: filteredProductUnits[0]?.name || 'Pcs', min_qty: '1', image_url: '', barcode: '' });
      setImageFile(null); setImagePreview(''); setCurrentView('katalog');
      showToast("Katalog produk berhasil disimpan", "success");
      fetchAllData();
    } catch (err) {
      console.error(err.message);
      showToast(`${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveMasterItem = async (table, payload, resetFn) => {
    if (!payload.name) return;
    const dataToSave = { 
      name: payload.name, 
      tenant_id: tenantId,
      outlet_id: selectedOutletId ? Number(selectedOutletId) : null
    };
    if (table === 'product_categories') { dataToSave.type = payload.type || 'ritel'; dataToSave.code = payload.name.toLowerCase().replace(/\s+/g, '-'); }
    try {
      if (payload.id) {
        const { error } = await supabase.from(table).update(dataToSave).eq('id', payload.id).eq('tenant_id', tenantId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert([dataToSave]);
        if (error) throw error;
      }
      resetFn();
      showToast("Data master berhasil diperbarui", "success");
      fetchAllData();
    } catch (err) {
      console.error(err.message);
      if (err.code === '42703' || String(err.message).includes('outlet_id')) {
        showToast("Kolom 'outlet_id' belum ada. Jalankan DDL migration di SQL Editor Supabase Anda.", "error");
      } else {
        showToast(`Gagal menyimpan data master: ${err.message}`);
      }
    }
  };

  const filteredProducts = products.filter(p => {
    // Filter Branch secara ketat
    if (selectedOutletId) {
      // Jika produk punya outlet_id, harus cocok dengan yang terpilih.
      // Jika produk outlet_id-nya null, kita tampilkan di outlet utama atau jika mode semua cabang.
      if (p.outlet_id) {
        if (String(p.outlet_id) !== String(selectedOutletId)) return false;
      } else {
        // Jika produk tidak punya outlet_id (produk global), 
        // kita tampilkan hanya di outlet utama.
        if (!isMainOutlet) return false;
      }
    }

    const pCat = String(p.category || 'Lainnya');
    const matchesCategory = selectedCategory === 'Semua' ? true : pCat === selectedCategory;

    const pName = String(p.name || '');
    const pBarcode = String(p.barcode || '');

    const matchesSearch = pName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pBarcode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
          {toast.message.includes('SQL Editor') && (
            <div className="bg-black/20 p-3 rounded-xl mt-1 text-left">
              <p className="text-[9px] font-bold text-white/90 mb-1">Salin & jalankan kode ini di SQL Editor Supabase Anda:</p>
              <code className="text-[10px] font-mono block bg-black/40 p-2 rounded border border-white/10 select-all">
                ALTER TABLE products ADD COLUMN barcode TEXT DEFAULT '';
              </code>
            </div>
          )}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {currentView === 'katalog' && (
          <>
            <div className="mb-6">
              <button onClick={handleBackToDashboard} className={UI.btnBack}>
                <IconChevronLeft />
                Kembali
              </button>
            </div>

            <header className={UI.pageHeader}>
              <div className={UI.pageTitleBlock}>
                <h2 className={UI.pageTitle}>Katalog</h2>
                <div className={UI.pageSubtitle}>Kelola Data Product Anda</div>
              </div>
              <button onClick={() => { setForm({ id: null, name: '', price: '', category: filteredCategories[0]?.name || '', category_type: filteredCategories[0]?.type || 'ritel', duration: '', duration_type: filteredDurationUnits[0]?.name || 'Menit', unit: filteredProductUnits[0]?.name || 'Pcs', min_qty: '1', image_url: '', barcode: '' }); setImageFile(null); setImagePreview(''); setCurrentView('form_produk'); }} className={UI.btnPrimary}>
                <IconPlus />
                Tambah Item
              </button>
            </header>

            <div className="bg-white p-2 rounded-[2.5rem] border border-slate-200 shadow-sm mb-6 grid grid-cols-3 gap-2">
              <button onClick={() => setCurrentView('manage_category')} className="py-5 hover:bg-teal-50/50 rounded-[2rem] flex flex-col items-center gap-2.5 transition-all group active:scale-95">
                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-700 shadow-sm group-hover:scale-110 transition-all"><svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></div>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Kategori</span>
              </button>
              <button onClick={() => setCurrentView('manage_duration')} className="py-5 hover:bg-teal-50/50 rounded-[2rem] flex flex-col items-center gap-2.5 transition-all group active:scale-95">
                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-700 shadow-sm group-hover:scale-110 transition-all"><svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Durasi</span>
              </button>
              <button onClick={() => setCurrentView('manage_unit')} className="py-5 hover:bg-teal-50/50 rounded-[2rem] flex flex-col items-center gap-2.5 transition-all group active:scale-95">
                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-700 shadow-sm group-hover:scale-110 transition-all"><svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></div>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Satuan</span>
              </button>
            </div>

            <div className="mb-6 relative">
              <input type="text" placeholder="Cari nama produk atau kode barcode..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={UI.search} />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-none">
              {['Semua', ...new Set(filteredProducts.map(p => String(p.category || 'Lainnya')))].map((cat) => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-8 py-3.5 rounded-full font-black text-[10px] uppercase tracking-wider border-2 ${selectedCategory === cat ? 'text-white border-transparent shadow-md bg-teal-600' : 'bg-white border-slate-200 text-slate-400'}`}>{cat}</button>
              ))}
            </div>

            <div className={UI.listWrap}>
              {loading ? <div className="text-center py-24 text-[11px] font-black text-slate-300 animate-pulse uppercase tracking-widest">Memuat...</div> : filteredProducts.map(p => (
                <div key={p.id} onClick={() => setDetailProduct(p)} className={UI.listRow}>
                  <div className={UI.listAvatar}>{p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" alt="X" /> : '📦'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900 truncate mb-1">{p.name || 'Tanpa Nama'}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{p.category || 'Lainnya'}</span>
                      {p.barcode && <span className="text-[7px] font-mono font-black text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">🔒 SCAN READY</span>}
                    </div>
                  </div>
                  <p className="text-sm font-black font-mono">{formatPrice(p.price)}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {currentView === 'form_produk' && (
          <div className="animate-in slide-in-from-right duration-300 space-y-6">
            <div className="bg-white p-5 rounded-[2.5rem] border border-slate-200/60 shadow-sm flex items-center justify-between">
              <button onClick={() => setCurrentView('katalog')} className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-800 active:scale-90 shadow-sm transition-all">
                <IconChevronLeft />
              </button>
              <div className="text-center">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1">Editor Katalog</h3>
                <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{form.id ? 'Ubah Item' : 'Tambah Baru'}</p>
              </div>
              <div className="w-11" />
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-6 pb-20">
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm space-y-3 flex flex-col items-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 self-start ml-1">Visual Produk</p>
                <label className="relative w-32 h-32 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-teal-300 hover:bg-teal-50/20 transition-all shadow-sm">
                  {imagePreview || form.image_url ? (
                    <>
                      <img src={imagePreview || form.image_url} className="w-full h-full object-cover" alt="X" />
                      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5">
                          <IconImage />
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-800">Ubah</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-slate-300 p-2 text-center">
                      <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-slate-400 border border-slate-100">
                        <IconImage />
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Upload Foto</p>
                        <p className="text-[6px] font-bold text-slate-300 mt-0.5">Max 2MB</p>
                      </div>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              </div>

              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Informasi Dasar</p>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-teal-600 transition-colors">Kategori</label>
                    <div className="relative">
                      <select
                        value={form.category || ''}
                        onChange={e => { const cat = filteredCategories.find(c => c.name === e.target.value); setForm({ ...form, category: e.target.value, category_type: cat?.type || 'ritel' }); }}
                        className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 pl-12 text-sm font-bold focus:border-teal-600 outline-none transition-all appearance-none"
                      >
                        {filteredCategories.map(c => <option key={c.id} value={c.name}>{c.name} {c.type === 'jasa' ? '(Jasa)' : '(Ritel)'}</option>)}
                      </select>
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></div>
                    </div>
                    <p className={`text-[9px] font-bold ml-1 ${isJasa ? 'text-teal-600' : 'text-emerald-500'}`}>
                      {isJasa ? '⚙️ Kategori Jasa — input durasi akan muncul di bawah' : '🛒 Kategori Ritel — produk fisik'}
                    </p>
                  </div>

                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-teal-600 transition-colors">Nama Produk / Layanan</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Contoh: Kopi Susu Aren..."
                        value={form.name || ''}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 pl-12 text-sm font-bold focus:border-teal-600 outline-none transition-all"
                        required
                      />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></div>
                    </div>
                  </div>

                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-teal-600 transition-colors">Harga Jual (Rupiah)</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0"
                        value={form.price !== null && form.price !== undefined ? form.price : ''}
                        onChange={e => setForm({ ...form, price: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 pl-12 text-sm font-mono font-black focus:border-teal-600 outline-none transition-all"
                        required
                      />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">IDR</div>
                    </div>
                  </div>

                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-teal-600 transition-colors flex justify-between items-center">
                      <span>Kode Barcode / SKU</span>
                      <button
                        type="button"
                        onClick={generateRandomBarcode}
                        className="text-teal-700 font-black text-[9px] uppercase tracking-widest bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100 hover:bg-teal-100 transition-all active:scale-95"
                      >
                        ⚡ Auto-Generate
                      </button>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="Contoh: KP-827192 (Alfanumerik Kapital)"
                        value={form.barcode || ''}
                        onChange={e => setForm({ ...form, barcode: e.target.value.toUpperCase().replace(/[^0-9A-Z-]/g, '') })}
                        className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 pl-12 text-sm font-bold focus:border-teal-600 outline-none transition-all font-mono"
                      />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><IconBarcode /></div>
                    </div>
                  </div>

                </div>
              </div>

              {isJasa && (
                <div className="space-y-4 animate-in zoom-in-95 duration-300">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600 ml-1">Detail Layanan Jasa</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="bg-white p-5 rounded-[2rem] border border-slate-200/60 shadow-sm space-y-3">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Estimasi Durasi</label>
                      <div className="flex bg-slate-50 rounded-2xl border border-slate-200/60 overflow-hidden focus-within:border-teal-500 transition-all">
                        <input type="number" placeholder="0" value={form.duration !== null && form.duration !== undefined ? form.duration : ''} onChange={e => setForm({ ...form, duration: e.target.value })} className="w-full p-4 text-xs font-mono font-black bg-transparent focus:outline-none" />
                        <select value={form.duration_type || filteredDurationUnits[0]?.name || 'Menit'} onChange={e => setForm({ ...form, duration_type: e.target.value })} className="bg-teal-50 p-3 text-[9px] font-black uppercase focus:outline-none border-l border-teal-100">
                          {filteredDurationUnits.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                      </div>
                    </div>
 
                    <div className="bg-white p-5 rounded-[2rem] border border-slate-200/60 shadow-sm space-y-3">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Satuan & Minimal Order</label>
                      <div className="flex bg-slate-50 rounded-2xl border border-slate-200/60 overflow-hidden focus-within:border-teal-500 transition-all">
                        <select value={form.unit || filteredProductUnits[0]?.name || 'Pcs'} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full p-4 text-[9px] font-black uppercase bg-transparent focus:outline-none">
                          {filteredProductUnits.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                        </select>
                        <div className="flex items-center px-4 bg-slate-50 border-l border-slate-200/60">
                          <input type="number" value={form.min_qty !== null && form.min_qty !== undefined ? form.min_qty : '1'} onChange={e => setForm({ ...form, min_qty: e.target.value })} className="w-12 text-center text-xs font-mono font-black bg-transparent focus:outline-none" />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm space-y-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className={UI.btnSubmit}
                >
                  {uploading ? 'Sedang Memproses...' : (form.id ? 'Perbarui Katalog' : 'Terbitkan Katalog')}
                </button>
                <button type="button" onClick={() => setCurrentView('katalog')} className={UI.btnCancel}>Batal</button>
              </div>
            </form>
          </div>
        )}

        {detailProduct && (() => {
          const catObj = categories.find(c => c.name === detailProduct.category);
          return (
            <div className="fixed inset-0 z-[100] flex flex-col bg-[#F8FAFC] animate-in slide-in-from-bottom duration-500 overflow-y-auto">
              <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-6 pt-10 pb-4 flex items-center justify-between border-b border-slate-100">
                <button onClick={() => setDetailProduct(null)} className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-800 active:scale-90 shadow-sm transition-all">
                  <IconChevronLeft />
                </button>
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Arsip Katalog</h3>
                <div className="w-11" />
              </div>

              <div className="p-6 space-y-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-32 h-32 bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm flex items-center justify-center relative shrink-0">
                    {detailProduct.image_url ? (
                      <img src={detailProduct.image_url} className="w-full h-full object-cover" alt="X" />
                    ) : (
                      <div className="text-4xl opacity-20">📦</div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur px-2 py-0.5 rounded-lg border border-slate-200 text-[7px] font-black uppercase text-slate-500 tracking-tighter scale-90">
                      #{detailProduct.id}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-center items-center">
                      <span className={`text-[8px] font-black uppercase px-2.5 py-0.5 rounded-full ${catObj?.type === 'jasa' ? 'bg-teal-100 text-teal-700 border border-teal-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200'}`}>
                        {catObj?.type === 'jasa' ? 'Layanan Jasa' : 'Produk Retail'}
                      </span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tight">
                      {detailProduct.name || 'Tanpa Nama'}
                    </h1>
                    <p className="text-slate-400 font-bold text-xs tracking-wide">Kategori: <span className="text-slate-600">{detailProduct.category || 'Lainnya'}</span></p>
                  </div>

                  <div className="w-full bg-slate-900 p-6 rounded-[2rem] text-center shadow-lg relative overflow-hidden">
                    <p className="text-teal-500 text-[8px] font-black uppercase tracking-[0.3em] mb-1.5">Harga Retail POS</p>
                    <h2 className="text-2xl font-black text-white font-mono tracking-tighter">
                      {formatPrice(detailProduct.price)}
                    </h2>
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-20 h-20 rounded-full bg-teal-600/10 blur-xl"></div>
                    <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-20 h-20 rounded-full bg-teal-600/10 blur-xl"></div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm space-y-4 flex flex-col items-center text-center">
                  <div className="flex items-center gap-2 border-b border-slate-50 pb-2 w-full justify-center">
                    <IconBarcode />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sistem Scan & SKU</span>
                  </div>
                  {detailProduct.barcode ? (
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 w-full flex justify-center items-center">
                      <BarcodeGenerator value={detailProduct.barcode} />
                    </div>
                  ) : (
                    <div className="py-2">
                      <p className="text-[10px] font-bold text-slate-400">Belum memiliki Barcode/SKU.</p>
                      <p className="text-[8px] text-slate-300 mt-0.5">Edit item ini untuk menambahkan barcode scan.</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200/60 flex flex-col gap-0.5">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Satuan / Unit</span>
                    <p className="text-sm font-black text-slate-800 uppercase">{detailProduct.unit || 'Pcs'}</p>
                  </div>
                  <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200/60 flex flex-col gap-0.5">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Min. Order</span>
                    <p className="text-sm font-black text-slate-800">{detailProduct.min_qty || 1}</p>
                  </div>
                  {catObj?.type === 'jasa' && (
                    <div className="bg-teal-50 p-5 rounded-[1.5rem] border border-teal-100 flex flex-col gap-0.5">
                      <span className="text-[8px] font-black text-teal-600 uppercase tracking-widest">Durasi</span>
                      <p className="text-sm font-black text-teal-800 uppercase">{detailProduct.duration} {detailProduct.duration_type}</p>
                    </div>
                  )}
                  <div className="bg-white p-5 rounded-[1.5rem] border border-slate-200/60 flex flex-col gap-0.5">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                    <p className="text-sm font-black text-emerald-500 uppercase">Aktif</p>
                  </div>
                </div>
              </div>

              <div className="mt-auto p-6 bg-white border-t border-slate-100 space-y-3 pb-12">
                <button
                  onClick={() => {
                    setForm({
                      id: detailProduct.id,
                      name: detailProduct.name || '',
                      price: detailProduct.price !== null && detailProduct.price !== undefined ? String(detailProduct.price) : '',
                      category: detailProduct.category || '',
                      // Ambil category_type dari data categories, bukan hardcode
                      category_type: filteredCategories.find(c => c.name === detailProduct.category)?.type || 'ritel',
                      duration: detailProduct.duration !== null && detailProduct.duration !== undefined ? String(detailProduct.duration) : '',
                      // ─── FIX UTAMA: Gunakan duration_type dari database, bukan default 'Menit' ───
                      duration_type: detailProduct.duration_type || filteredDurationUnits[0]?.name || 'Menit',
                      unit: detailProduct.unit || filteredProductUnits[0]?.name || 'Pcs',
                      min_qty: detailProduct.min_qty !== null && detailProduct.min_qty !== undefined ? String(detailProduct.min_qty) : '1',
                      image_url: detailProduct.image_url || '',
                      barcode: detailProduct.barcode || ''
                    });
                    setDetailProduct(null);
                    setImageFile(null);
                    setImagePreview('');
                    setCurrentView('form_produk');
                  }}
                  className="w-full py-5 rounded-[1.75rem] bg-teal-600 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:brightness-110 active:scale-[0.98] transition-all text-center"
                >
                  Ubah Profil Item
                </button>
                <button
                  onClick={() => triggerDelete('product', detailProduct.id, detailProduct.name || 'Tanpa Nama', 'products')}
                  className="w-full py-4 rounded-2xl bg-rose-50 text-rose-500 text-[10px] font-black uppercase tracking-widest text-center hover:bg-rose-100 active:scale-95 transition-all"
                >
                  Hapus Dari Sistem
                </button>
              </div>
            </div>
          );
        })()}

        {currentView !== 'katalog' && currentView !== 'form_produk' && (
          <div className="animate-in slide-in-from-right duration-300">
            <button onClick={() => setCurrentView('katalog')} className="mb-10 bg-white border border-slate-200 px-8 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
              <IconChevronLeft /> Kembali ke Katalog
            </button>

            {currentView === 'manage_category' && (
              <div className="space-y-4">
                <div className="bg-white p-8 rounded-[3.5rem] border space-y-4 shadow-xl">
                  <input type="text" placeholder="Nama Kategori..." value={categoryForm.name || ''} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} className="w-full bg-slate-50 border rounded-2xl p-4 text-sm font-bold outline-none" />
 
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jenis Bisnis</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCategoryForm({ ...categoryForm, type: 'ritel' })}
                        className={`py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest border-2 transition-all flex items-center justify-center gap-2 ${categoryForm.type === 'ritel' || !categoryForm.type ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                      >
                        🛒 Ritel
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategoryForm({ ...categoryForm, type: 'jasa' })}
                        className={`py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest border-2 transition-all flex items-center justify-center gap-2 ${categoryForm.type === 'jasa' ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                      >
                        ⚙️ Jasa
                      </button>
                    </div>
                    <p className="text-[9px] font-bold text-slate-300 ml-1">
                      {categoryForm.type === 'jasa' ? '✓ Akan muncul input durasi waktu pada produk' : '✓ Produk fisik / barang dagangan'}
                    </p>
                  </div>
 
                  <button onClick={() => handleSaveMasterItem('product_categories', categoryForm, () => setCategoryForm({ id: null, name: '', type: 'ritel' }))} className="w-full py-5 bg-teal-600 text-white font-black text-[11px] uppercase rounded-2xl shadow-xl">{categoryForm.id ? 'Perbarui' : 'Tambah Kategori'}</button>
                </div>
                {filteredCategories.map(c => (
                  <div key={c.id} className={`${UI.listRow} justify-between`}>
                    <div className="flex items-center gap-3 pl-3">
                      <p className="text-sm font-black text-slate-800 uppercase">{c.name || 'Tanpa Nama'}</p>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${c.type === 'jasa' ? 'bg-teal-100 text-teal-700 border border-teal-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200'}`}>
                        {c.type === 'jasa' ? '⚙️ Jasa' : '🛒 Ritel'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setCategoryForm(c)} className="p-3 text-teal-600 transition-all active:scale-90"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      <button onClick={() => triggerDelete('category', c.id, c.name || 'Tanpa Nama', 'product_categories')} className="p-3 text-rose-500 transition-all active:scale-90"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
 
            {currentView === 'manage_unit' && (
              <div className="space-y-4">
                <div className="bg-white p-8 rounded-[3.5rem] border flex gap-3 shadow-xl">
                  <input type="text" placeholder="Satuan (Pcs, Kg...)" value={unitForm.name || ''} onChange={e => setUnitForm({ ...unitForm, name: e.target.value })} className="flex-1 bg-slate-50 border rounded-2xl px-5 py-4 text-sm font-bold outline-none" />
                  <button onClick={() => handleSaveMasterItem('product_units', unitForm, () => setUnitForm({ id: null, name: '' }))} className="bg-teal-600 text-white px-8 rounded-2xl font-black uppercase text-[10px] shadow-lg">Save</button>
                </div>
                {filteredProductUnits.map(u => (
                  <div key={u.id} className={`${UI.listRow} justify-between`}>
                    <p className="text-sm font-black text-slate-800 uppercase pl-3">{u.name || 'Tanpa Nama'}</p>
                    <div className="flex gap-2">
                      <button onClick={() => setUnitForm(u)} className="p-3 text-teal-600 transition-all active:scale-90"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      <button onClick={() => triggerDelete('unit', u.id, u.name || 'Tanpa Nama', 'product_units')} className="p-3 text-rose-500 transition-all active:scale-90"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
 
            {currentView === 'manage_duration' && (
              <div className="space-y-4">
                <div className="bg-white p-8 rounded-[3.5rem] border flex gap-3 shadow-xl">
                  <input type="text" placeholder="Waktu (Menit...)" value={durationForm.name || ''} onChange={e => setDurationForm({ ...durationForm, name: e.target.value })} className="flex-1 bg-slate-50 border rounded-2xl px-5 py-4 text-sm font-bold outline-none" />
                  <button onClick={() => handleSaveMasterItem('duration_units', durationForm, () => setDurationForm({ id: null, name: '' }))} className="bg-teal-600 text-white px-8 rounded-2xl font-black uppercase text-[10px] shadow-lg">Save</button>
                </div>
                {filteredDurationUnits.map(d => (
                  <div key={d.id} className={`${UI.listRow} justify-between`}>
                    <p className="text-sm font-black text-slate-800 uppercase pl-3">{d.name || 'Tanpa Nama'}</p>
                    <div className="flex gap-2">
                      <button onClick={() => setDurationForm(d)} className="p-3 text-teal-600 transition-all active:scale-90"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      <button onClick={() => triggerDelete('duration', d.id, d.name || 'Tanpa Nama', 'duration_units')} className="p-3 text-rose-500 transition-all active:scale-90"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* CUSTOM DIALOG DELETE CENTERED */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-8 space-y-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto border border-rose-100 shadow-sm animate-bounce">
              <IconAlertTriangle />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Hapus Permanen?</h3>
              <p className="text-xs font-bold text-slate-400 leading-relaxed px-1">
                Apakah anda yakin ingin menghapus <span className="text-rose-600 font-black">"{deleteModal.displayTitle}"</span>? Item ini akan hilang selamanya dari database sistem.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })} className="w-full bg-slate-50 border border-slate-100 text-slate-500 font-black text-[10px] uppercase py-3.5 rounded-2xl active:scale-95 transition-all text-center">Batal</button>
              <button onClick={handleConfirmDelete} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase py-3.5 rounded-2xl active:scale-95 transition-all text-center shadow-lg shadow-rose-100">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}