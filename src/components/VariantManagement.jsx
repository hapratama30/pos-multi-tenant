// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';

/**
 * VariantManagement.jsx
 * - Atur varian produk (seperti ukuran, rasa, topping) per tenant.
 * - [DYNAMIC TENANT] Varian diisolasi secara ketat menggunakan tenantId masing-masing.
 * - Desain premium menggunakan tema warna Blue POS.
 * - Custom Toast Notification & Dialog Konfirmasi Hapus Centered.
 * - [FITUR HYBRID DROPDOWN] Nama kelompok bisa dipilih dari dropdown kelompok yang sudah ada atau di-input manual.
 * - [SECURITY FIX] Tipe Karakteristik otomatis terkunci hanya saat mode Edit (isEdit) untuk menjaga integritas data DB.
 * - Menggunakan Bahasa Indonesia sepenuhnya pada UI dan komentar kode.
 */

// =====================================================================
// KOMPONEN IKON SVG MURNI (Konsisten, Ringan & Bebas Crash)
// =====================================================================
const IconPlus = () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconSearch = () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const IconX = () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const IconChevronLeft = () => <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const IconAlertTriangle = () => <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;

const UI = {
  btnBack: 'flex items-center gap-2 bg-white border border-slate-200 px-6 py-3.5 rounded-[1.5rem] shadow-sm text-[10px] font-black text-slate-800 active:scale-95 transition-all uppercase tracking-widest hover:border-slate-300',
  btnPrimary: 'text-white font-black text-[11px] uppercase tracking-[0.1em] px-6 sm:px-8 py-3.5 sm:py-4 rounded-[1.25rem] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 bg-gradient-to-br from-[#0f8b6b] to-teal-600 w-full sm:w-auto shrink-0',
  btnSubmit: 'w-full py-5 rounded-[1.75rem] bg-teal-600 text-white text-[11px] font-black uppercase tracking-[0.25em] shadow-xl shadow-teal-100 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-3',
  btnCancel: 'w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest text-center hover:text-slate-600 transition-all',
  search: 'w-full bg-white border border-slate-200 rounded-3xl p-4 pl-12 text-sm font-bold shadow-sm focus:border-teal-600 outline-none transition-all',
  listWrap: 'space-y-4',
  listRow: 'bg-white px-5 py-4 rounded-[2rem] border border-slate-200/80 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:border-teal-300/60 cursor-pointer active:scale-[0.99]',
  listAvatar: 'w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 shrink-0 font-black text-sm uppercase text-teal-700',
  emptyState: 'text-center py-16 border border-dashed border-slate-200 rounded-[2rem] bg-white',
  pageHeader: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-10',
  pageTitleBlock: 'min-w-0',
  pageTitle: 'text-xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight uppercase',
  pageSubtitle: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2',
};

export default function VariantManagement({ onBack, tenantId: propTenantId, selectedOutletId }) {
  const tenantId = propTenantId;
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // VIEW SWITCHER STATES
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isSubOptionLayerOpen, setIsSubOptionLayerOpen] = useState(false);

  // MANAJEMEN MODE EDIT ATAU TAMBAH
  const [isEdit, setIsEdit] = useState(false);

  // HYBRID DROPDOWN MODE STATE
  // 'manual' = Tulis Manual Kelompok Baru, 'select' = Pilih Kelompok Yang Sudah Ada
  const [groupInputMode, setGroupInputMode] = useState('manual');

  // TOAST NOTIFICATION STATE
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

  // CUSTOM DIALOG DELETE STATE
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    idTarget: null,
    typeTarget: 'variant', // 'variant' atau 'option'
    optionIndex: null,
    displayTitle: ''
  });

  // Form State Varian / Ekstra
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    type: 'variant', // 'variant' atau 'extra'
    options: []
  });

  // State Input Sub-Opsi Internal
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState('');

  // Tampilkan Notifikasi Toast Premium
  const showToast = useCallback((message, type = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 4000);
  }, []);

  // 1. Ambil Data dari Supabase (Terisolasi per Tenant secara ketat)
  const fetchVariants = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('variants')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      if (error) {
        if (error.code === '42703') {
           // Ignore outlet_id errors if we are selecting it, but we are doing select('*')
        }
        throw error;
      }
      setVariants(data || []);
    } catch (err) {
      console.error('Error fetching variants:', err.message);
      showToast(`Gagal mengambil data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [tenantId, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchVariants();
  }, [fetchVariants]);

  // Fungsi Filter Pencarian & Outlet (Tabel variants tidak memiliki kolom outlet_id di DB, sehingga bersifat global/shared)
  const filteredVariants = useMemo(() => {
    return variants.filter(v => {
      if (!searchQuery) return true;
      return v.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [variants, searchQuery]);

  // Menghasilkan daftar nama kelompok unik yang sudah ada di database untuk tenant ini
  const uniqueGroupNames = useMemo(() => {
    const names = variants.map(v => v.name);
    return [...new Set(names)];
  }, [variants]);

  // 2. Atur Navigasi Back HP / Browser
  useEffect(() => {
    if (isFormOpen || selectedVariant || isSubOptionLayerOpen || deleteModal.isOpen) {
      window.history.pushState({ noBackExitsForm: true }, '');
    }

    const handlePopState = () => {
      if (deleteModal.isOpen) {
        setDeleteModal({ isOpen: false, idTarget: null, typeTarget: 'variant', optionIndex: null, displayTitle: '' });
      } else if (isSubOptionLayerOpen) {
        setIsSubOptionLayerOpen(false);
      } else if (isFormOpen) {
        setIsFormOpen(false);
      } else if (selectedVariant) {
        setSelectedVariant(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isFormOpen, selectedVariant, isSubOptionLayerOpen, deleteModal.isOpen]);

  // Atur Buka Form Tambah Baru (MODE TAMBAH)
  const handleOpenCreate = () => {
    setNewOptionName('');
    setNewOptionPrice('');
    setIsEdit(false); // KUNCI UTAMA: BUKAN MODE EDIT COK!

    // Jika sudah ada kelompok varian yang terdaftar, arahkan ke mode select secara default
    if (uniqueGroupNames.length > 0) {
      setGroupInputMode('select');
      const firstGroup = uniqueGroupNames[0];
      const matchingVar = variants.find(v => v.name === firstGroup);
      if (matchingVar) {
        setFormData({
          id: matchingVar.id,
          name: matchingVar.name,
          type: matchingVar.type,
          options: Array.isArray(matchingVar.options) ? matchingVar.options : []
        });
      }
    } else {
      setGroupInputMode('manual');
      setFormData({ id: null, name: '', type: 'variant', options: [] });
    }
    
    setIsFormOpen(true);
  };

  // Tambah Sub-Opsi ke Daftar Form Utama
  const handleAddOption = () => {
    if (!newOptionName.trim()) {
      showToast("Nama sub-pilihan wajib diisi!");
      return;
    }
    
    const newOpt = {
      name: newOptionName.trim(),
      price: formData.type === 'extra' ? (parseFloat(newOptionPrice) || 0) : 0
    };

    setFormData(prev => ({
      ...prev,
      options: [...prev.options, newOpt]
    }));
    setNewOptionName('');
    setNewOptionPrice('');
    setIsSubOptionLayerOpen(false);
    showToast("Opsi varian berhasil ditambahkan ke draf", "success");
  };

  // PEMICU CUSTOM MODAL UNTUK MENGHAPUS ATRIBUT UTAMA
  const triggerDeleteVariant = (id, name) => {
    setDeleteModal({
      isOpen: true,
      idTarget: id,
      typeTarget: 'variant',
      optionIndex: null,
      displayTitle: name
    });
  };

  // PEMICU CUSTOM MODAL UNTUK MENGHAPUS JALUR OPTION INTERNAL DI FORM
  const triggerDeleteOption = (index, name) => {
    setDeleteModal({
      isOpen: true,
      idTarget: null,
      typeTarget: 'option',
      optionIndex: index,
      displayTitle: name
    });
  };

  // EKSEKUSI MENGHAPUS ASLINYA
  const handleConfirmDelete = async () => {
    if (deleteModal.typeTarget === 'variant') {
      try {
        const { error } = await supabase
          .from('variants')
          .delete()
          .eq('id', deleteModal.idTarget)
          .eq('tenant_id', tenantId);

        if (error) throw error;
        setSelectedVariant(null);
        setDeleteModal({ isOpen: false, idTarget: null, typeTarget: 'variant', optionIndex: null, displayTitle: '' });
        showToast("Varian produk berhasil dihapus secara permanen", "success");
        fetchVariants();
      } catch (err) {
        showToast(`Gagal menghapus data: ${err.message}`);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        options: prev.options.filter((_, idx) => idx !== deleteModal.optionIndex)
      }));
      setDeleteModal({ isOpen: false, idTarget: null, typeTarget: 'variant', optionIndex: null, displayTitle: '' });
      showToast("Opsi draf berhasil dihapus", "success");
    }
  };

  // Simpan Data (Insert atau Update) ke Supabase
  const handleSaveVariants = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Nama kelompok varian wajib diisi!");
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        options: formData.options,
        tenant_id: tenantId // Memastikan tenant_id tersimpan dalam bentuk TEXT
      };

      if (isEdit && formData.id) {
        // Update data jika id kelompok sudah ada
        const { error } = await supabase
          .from('variants')
          .update(payload)
          .eq('id', formData.id)
          .eq('tenant_id', tenantId);
        if (error) throw error;
        showToast("Varian produk berhasil diperbarui", "success");
      } else {
        // Cek apakah mode select, jika ya maka update ke data id yang dipilih
        if (groupInputMode === 'select' && formData.id) {
          const { error } = await supabase
            .from('variants')
            .update(payload)
            .eq('id', formData.id)
            .eq('tenant_id', tenantId);
          if (error) throw error;
          showToast("Varian produk berhasil diperbarui", "success");
        } else {
          // Insert baru jika membuat kelompok baru
          const { error } = await supabase
            .from('variants')
            .insert([payload]);
          if (error) throw error;
          showToast("Varian produk baru berhasil ditambahkan", "success");
        }
      }

      setIsFormOpen(false);
      fetchVariants();
    } catch (err) {
      showToast(`Gagal menyimpan varian: ${err.message}`);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] relative">

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

      {/* =====================================================================
          VIEW SWITCHER LOGIC COMPONENTS
          ===================================================================== */}

      {/* LAYER INTERAKSI FORM UTAMA */}
      {isFormOpen && !isSubOptionLayerOpen ? (
        <div className="w-full bg-white flex flex-col justify-between animate-in fade-in duration-200 max-w-7xl mx-auto">
          <div>
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="mb-3">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className={UI.btnBack}
                >
                  <IconChevronLeft />
                  Kembali
                </button>
              </div>
              <h2 className="text-2xl font-black text-slate-700 tracking-tight">
                {isEdit ? 'Ubah Atribut' : 'Tambah Atribut'}
              </h2>
              <span className="text-[9px] font-black tracking-[0.2em] text-slate-400 uppercase block mt-0.5">Input Katalog</span>
            </div>

            <div className="p-6 space-y-5">
              
              {/* TABS MODE INPUT KELOMPOK VARIAN */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Nama Kelompok Varian / Extra</label>
                
                {/* Sembunyikan switch tab jika sedang mengedit item sedia ada (isEdit ada) demi kerapian */}
                {uniqueGroupNames.length > 0 && !isEdit && (
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        setGroupInputMode('select');
                        // Pilih kelompok pertama yang terdaftar
                        const matchingVar = variants.find(v => v.name === uniqueGroupNames[0]);
                        if (matchingVar) {
                          setFormData({
                            id: matchingVar.id,
                            name: matchingVar.name,
                            type: matchingVar.type,
                            options: Array.isArray(matchingVar.options) ? matchingVar.options : []
                          });
                        }
                      }}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border-2 transition-all ${
                        groupInputMode === 'select'
                          ? 'bg-teal-600 text-white border-transparent shadow-md shadow-teal-100'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      Pilih Kelompok Yang Ada
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGroupInputMode('manual');
                        setFormData({ id: null, name: '', type: 'variant', options: [] });
                      }}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border-2 transition-all ${
                        groupInputMode === 'manual'
                          ? 'bg-teal-600 text-white border-transparent shadow-md shadow-teal-100'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      Tulis Kelompok Baru
                    </button>
                  </div>
                )}

                {/* DROP DOWN PILIHAN KELOMPOK ATAU INPUT MANDIRI */}
                {groupInputMode === 'select' && uniqueGroupNames.length > 0 && !isEdit ? (
                  <div className="relative">
                    <select
                      className="w-full p-4 bg-slate-50/60 border border-slate-100 rounded-2xl outline-none font-black text-xs text-slate-700 focus:border-teal-300 focus:bg-white transition-all shadow-inner appearance-none"
                      value={formData.name}
                      onChange={e => {
                        const selectedName = e.target.value;
                        const matchingVar = variants.find(v => v.name === selectedName);
                        if (matchingVar) {
                          setFormData({
                            id: matchingVar.id,
                            name: matchingVar.name,
                            type: matchingVar.type,
                            options: Array.isArray(matchingVar.options) ? matchingVar.options : []
                          });
                        }
                      }}
                    >
                      <option value="" disabled>-- Pilih Kelompok Varian --</option>
                      {uniqueGroupNames.map((name, index) => (
                        <option key={index} value={name}>{name}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    disabled={isEdit} // Kunci nama kelompok jika sedang edit item sedia ada
                    className={`w-full p-4 border rounded-2xl outline-none font-bold text-xs text-slate-700 focus:border-teal-300 focus:bg-white transition-all ${
                      isEdit ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-400 shadow-none' : 'bg-slate-50/60 border-slate-100 shadow-inner'
                    }`}
                    placeholder="Contoh: Parfum, Rasa, Topping, Ukuran Gelas"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                )}
              </div>

              {/* TIPE KARAKTERISTIK */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Tipe Karakteristik</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={groupInputMode === 'select' || isEdit} // KUNCI TOMBOL JIKA MODE SELECT ATAU SEDANG EDIT (ISEDIT TRUE)
                    onClick={() => setFormData({ ...formData, type: 'variant', options: [] })}
                    className={`p-4 rounded-2xl border font-black text-xs uppercase tracking-wider transition-all text-center ${
                      formData.type === 'variant' ? 'bg-teal-50 border-teal-200 text-teal-600' : 'bg-slate-50/50 border-slate-100 text-slate-400 opacity-60'
                    } ${(groupInputMode === 'select' || isEdit) ? 'cursor-not-allowed opacity-80' : ''}`}
                  >
                    Varian
                    <span className="block text-[9px] font-medium text-slate-400 lowercase mt-0.5">Pilih salah satu</span>
                  </button>
                  <button
                    type="button"
                    disabled={groupInputMode === 'select' || isEdit} // KUNCI TOMBOL JIKA MODE SELECT ATAU SEDANG EDIT (ISEDIT TRUE)
                    onClick={() => setFormData({ ...formData, type: 'extra', options: [] })}
                    className={`p-4 rounded-2xl border font-black text-xs uppercase tracking-wider transition-all text-center ${
                      formData.type === 'extra' ? 'bg-teal-50 border-teal-200 text-teal-600' : 'bg-slate-50/50 border-slate-100 text-slate-400 opacity-60'
                    } ${(groupInputMode === 'select' || isEdit) ? 'cursor-not-allowed opacity-80' : ''}`}
                  >
                    Extra
                    <span className="block text-[9px] font-medium text-slate-400 lowercase mt-0.5">Bisa multi-pilih</span>
                  </button>
                </div>
                {(groupInputMode === 'select' || isEdit) && (
                  <p className="text-[8px] font-bold text-slate-400 mt-1 italic ml-1">
                    {isEdit 
                      ? '*Tipe karakteristik dikunci saat mengubah varian yang sudah terdaftar.' 
                      : '*Tipe karakteristik dikunci karena memilih kelompok yang sudah ada.'}
                  </p>
                )}
              </div>

              {/* LIST SUB OPSI YANG SUDAH TERBENTUK */}
              <div className="bg-slate-50/50 p-5 rounded-[1.5rem] border border-slate-100 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Daftar Pilihan Sub-Opsi</label>
                  <span className="bg-white border border-slate-100 text-slate-500 font-bold text-[10px] px-2 py-0.5 rounded-full shadow-sm">
                    {formData.options.length} Item
                  </span>
                </div>

                {formData.options.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {formData.options.map((opt, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                        <div>
                          <p className="text-xs font-black text-slate-700">{opt.name}</p>
                          {formData.type === 'extra' && <p className="text-[10px] font-bold text-emerald-600">+Rp {(opt.price || 0).toLocaleString()}</p>}
                        </div>
                        <button 
                          type="button" 
                          onClick={() => triggerDeleteOption(index, opt.name)} 
                          className="w-7 h-7 flex items-center justify-center bg-rose-50 rounded-lg text-rose-500 active:scale-90 transition-all"
                        >
                          <IconX />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[11px] font-medium text-slate-400 py-2 italic">Belum ada pilihan yang dibuat.</p>
                )}

                <button
                  type="button"
                  onClick={() => setIsSubOptionLayerOpen(true)}
                  className="w-full py-4 border border-dashed border-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:border-teal-300 hover:text-teal-600 transition-all bg-white shadow-sm"
                >
                  + Tambah Pilihan Opsi
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border-t border-slate-50 space-y-2 w-full">
            <button
              type="button"
              onClick={handleSaveVariants}
              className={UI.btnSubmit}
            >
              Simpan Data Kelompok
            </button>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className={UI.btnCancel}
            >
              Batal
            </button>
          </div>
        </div>
      ) : isSubOptionLayerOpen ? (
        /* LAYER 4 FULLSCREEN KHUSUS INPUT OPSI */
        <div className="fixed inset-0 bg-white z-[9999] flex flex-col justify-between overflow-y-auto animate-in-fade duration-200">
          <div>
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="mb-3">
                <button 
                  type="button"
                  onClick={() => setIsSubOptionLayerOpen(false)}
                  className={UI.btnBack}
                >
                  <IconChevronLeft />
                  Kembali
                </button>
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Tambah Sub Pilihan</h2>
              <span className="text-[10px] font-black tracking-[0.15em] text-slate-400 uppercase block mt-0.5">Atur Elemen Opsi Atribut ({formData.name || 'Grup'})</span>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Nama Sub-Opsi</label>
                <input
                  type="text"
                  className="w-full p-4 bg-slate-50/60 border border-slate-100 rounded-2xl outline-none font-bold text-xs text-slate-700 focus:border-teal-300 focus:bg-white transition-all shadow-inner"
                  placeholder="Contoh: Rasa Sakura, Rasa Lavender, Keju, Large"
                  value={newOptionName}
                  onChange={e => setNewOptionName(e.target.value)}
                />
              </div>

              {formData.type === 'extra' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Biaya Tambahan Harga (+)</label>
                  <input
                    type="number"
                    className="w-full p-4 bg-slate-50/60 border border-slate-100 rounded-2xl outline-none font-bold text-xs text-slate-700 focus:border-teal-300 focus:bg-white transition-all shadow-inner"
                    placeholder="Masukkan nominal, misal: 3000"
                    value={newOptionPrice}
                    onChange={e => setNewOptionPrice(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-white border-t border-slate-50 space-y-2 w-full pb-12">
            <button
              type="button"
              onClick={handleAddOption}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-[0.15em] py-4 rounded-2xl active:scale-[0.98] transition-all text-center shadow-md"
            >
              Masukkan Opsi Sekarang
            </button>
            <button
              type="button"
              onClick={() => setIsSubOptionLayerOpen(false)}
              className="w-full text-slate-400 font-bold text-xs uppercase tracking-widest py-2 text-center"
            >
              Batalkan
            </button>
          </div>
        </div>
      ) : (
        /* LAYER DAFTAR LIST UTAMA */
        <div className={`w-full pb-32 transition-all duration-200 max-w-7xl mx-auto px-4 sm:px-6 ${selectedVariant ? 'hidden' : 'block'}`}>

          <div className="mb-6 pt-6">
            <button type="button" onClick={() => onBack && onBack()} className={UI.btnBack}>
              <IconChevronLeft />
              Kembali
            </button>
          </div>

          <header className={UI.pageHeader}>
            <div className={UI.pageTitleBlock}>
              <h1 className={UI.pageTitle}>Varian & Ekstra</h1>
              <p className={UI.pageSubtitle}>Atur Atribut Produk</p>
            </div>
            <button type="button" onClick={handleOpenCreate} className={UI.btnPrimary}>
              <IconPlus />
              Tambah Atribut
            </button>
          </header>

          <div className="mb-6 relative">
            <input
              type="text"
              className={UI.search}
              placeholder="Cari nama varian atau karakteristik..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <IconSearch />
            </div>
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                <IconX />
              </button>
            )}
          </div>

          <div className={UI.listWrap}>
            {loading ? (
              <div className="text-center py-24">
                <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sedang Memuat Atribut...</p>
              </div>
            ) : filteredVariants.length > 0 ? (
              filteredVariants.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setSelectedVariant(v)}
                  className={UI.listRow}
                >
                  <div className={UI.listAvatar}>
                    {v.name.charAt(0)}
                  </div>

                  <div className="space-y-0.5 flex-1 min-w-0">
                    <h3 className="text-sm font-black text-slate-800 tracking-tight truncate">
                      {v.name}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Tipe: {v.type === 'variant' ? 'Varian (Pilih 1)' : 'Extra Add-on'}
                    </p>
                  </div>

                  <div className="bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-xl text-[10px] font-black text-teal-700 uppercase shrink-0">
                    {Array.isArray(v.options) ? v.options.length : 0} Opsi
                  </div>
                </div>
              ))
            ) : (
              <div className={UI.emptyState}>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Tidak Ada Data</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          STRUKTUR LAYER 2 DIALOG DETAIL (MENUTUPI TAB MENU BAWAH TOTAL)
          ===================================================================== */}
      {selectedVariant && !isFormOpen && (
        <div className="fixed inset-0 bg-white z-[9999] flex flex-col justify-between overflow-y-auto animate-in fade-in duration-200">
          <div>
            <div className="px-6 pt-6 pb-4">
              <button 
                type="button"
                onClick={() => setSelectedVariant(null)}
                className={UI.btnBack}
              >
                <IconChevronLeft />
                Kembali
              </button>
            </div>

            <div className="px-6 pb-6 border-b border-slate-100">
              <div className="flex items-baseline gap-3.5">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                  {selectedVariant.name}
                </h2>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                  selectedVariant.type === 'variant' 
                    ? 'bg-teal-50 border-teal-100 text-teal-600' 
                    : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                }`}>
                  {selectedVariant.type === 'variant' ? 'Varian' : 'Extra'}
                </span>
              </div>
              <span className="text-[10px] font-black tracking-[0.15em] text-slate-400 uppercase block mt-1">
                Karakteristik Atribut
              </span>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Sub-Pilihan yang Tersedia</p>
              <div className="space-y-2.5">
                {Array.isArray(selectedVariant.options) && selectedVariant.options.length > 0 ? (
                  selectedVariant.options.map((opt, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                      <span className="text-xs font-black text-slate-700 tracking-tight">{opt.name}</span>
                      {selectedVariant.type === 'extra' ? (
                        <span className="text-xs font-black text-emerald-600 tracking-tight">+Rp {(opt.price || 0).toLocaleString()}</span>
                      ) : (
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-100/50 px-2 py-0.5 rounded-md">Pilihan Utama</span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs italic text-slate-400 p-2">Belum ada item sub-pilihan di dalam varian ini.</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border-t border-slate-50 space-y-2 w-full pb-12">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  id: selectedVariant.id,
                  name: selectedVariant.name,
                  type: selectedVariant.type,
                  options: Array.isArray(selectedVariant.options) ? selectedVariant.options : []
                });
                setIsEdit(true); // KUNCI UTAMA: INI MODE EDIT COK!
                setGroupInputMode('manual'); // Supaya menampilkan input teks langsung
                setIsFormOpen(true);
              }}
              className={UI.btnSubmit}
            >
              Edit Atribut Varian
            </button>
            
            <button
              type="button"
              onClick={() => triggerDeleteVariant(selectedVariant.id, selectedVariant.name)}
              className="w-full text-rose-600 font-black text-xs uppercase tracking-[0.15em] py-4 rounded-2xl hover:bg-rose-50/50 active:scale-[0.98] transition-all text-center"
            >
              Hapus Atribut
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          STRUKTUR FIX: DIALOG KONFIRMASI HAPUS SEKARANG PAS DI TENGAH-TENGAH LAYAR
          ===================================================================== */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          
          {/* Background Overlay Click to Cancel */}
          <div 
            className="absolute inset-0" 
            onClick={() => setDeleteModal({ isOpen: false, idTarget: null, typeTarget: 'variant', optionIndex: null, displayTitle: '' })}
          />

          {/* Dialog Box Body */}
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 space-y-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            
            {/* Ikon Segitiga Alert */}
            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-100/60 shadow-sm animate-bounce">
              <IconAlertTriangle />
            </div>

            {/* Konten Teks Dialog */}
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Hapus Permanen?</h3>
              <p className="text-xs font-bold text-slate-400 leading-relaxed px-1">
                Apakah anda yakin ingin menghapus <span className="text-rose-500 font-black">"{deleteModal.displayTitle}"</span>? Data ini akan musnah selamanya dan tidak bisa dikembalikan.
              </p>
            </div>

            {/* Barisan Tombol Konfirmasi */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal({ isOpen: false, idTarget: null, typeTarget: 'variant', optionIndex: null, displayTitle: '' })}
                className="w-full bg-slate-50 border border-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl active:scale-[0.98] transition-all"
              >
                Batal
              </button>
              
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-rose-100"
              >
                Ya, Hapus
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}