// eslint-disable-next-line no-unused-vars
import React, { useEffect, useState } from 'react';
import { ALL_MODULES, MODULE_CATEGORIES, PLAN_PRESETS } from '../../config/platformModules';
import { fetchSubscriptionPlans, formatRupiah, updateSubscriptionPlan, deleteSubscriptionPlan } from '../../utils/platformAdmin';

export default function SuperAdminPlans({ showToast }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // plan object to delete
  // eslint-disable-next-line no-unused-vars
  const [errors, setErrors] = useState({});

  const loadPlans = async () => {
    try {
      const rows = await fetchSubscriptionPlans();
      setPlans(rows);
    } catch (err) {
      showToast?.(err.message || 'Gagal memuat paket', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPlans();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEdit = (plan) => {
    setErrors({});
    setEditingPlan({
      ...plan,
      features: Array.isArray(plan.features) ? plan.features : [],
      active_days: plan.active_days ?? 30
    });
  };

  const toggleModule = (modId) => {
    if (!editingPlan) return;
    const current = editingPlan.features;
    if (current.includes(modId)) {
      setEditingPlan({ ...editingPlan, features: current.filter(id => id !== modId) });
    } else {
      setEditingPlan({ ...editingPlan, features: [...current, modId] });
    }
  };

  const toggleCategory = (catId) => {
    if (!editingPlan) return;
    const modsInCat = ALL_MODULES.filter(m => m.category === catId).map(m => m.id);
    const current = editingPlan.features;
    const allInCatActive = modsInCat.every(id => current.includes(id));

    if (allInCatActive) {
      // Hapus semua modul di kategori ini
      setEditingPlan({ ...editingPlan, features: current.filter(id => !modsInCat.includes(id)) });
    } else {
      // Tambah semua modul di kategori ini (tanpa duplikat)
      const newFeatures = [...new Set([...current, ...modsInCat])];
      setEditingPlan({ ...editingPlan, features: newFeatures });
    }
  };

  const handleSave = async () => {
    if (!editingPlan) return;
    
    const newErrors = {};
    if (!editingPlan.name?.trim()) newErrors.name = true;
    if (isNaN(editingPlan.price_monthly) || editingPlan.price_monthly < 0) newErrors.price = true;
    if (isNaN(editingPlan.max_outlets) || editingPlan.max_outlets < 0) newErrors.max_outlets = true;
    if (isNaN(editingPlan.max_staff) || editingPlan.max_staff < 0) newErrors.max_staff = true;
    if (isNaN(editingPlan.max_products) || editingPlan.max_products < 0) newErrors.max_products = true;
    if (isNaN(editingPlan.active_days) || editingPlan.active_days < 1) newErrors.active_days = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return showToast?.('Mohon perbaiki kesalahan pada input', 'error');
    }

    setSaving(true);
    try {
      // Pastikan tipe data benar sebelum dikirim ke RPC (Numeric untuk semua angka)
      const payload = {
        ...editingPlan,
        price_monthly: Number(editingPlan.price_monthly || 0),
        price_original: Number(editingPlan.price_original || 0),
        max_outlets: Number(editingPlan.max_outlets || 0),
        max_staff: Number(editingPlan.max_staff || 0),
        max_products: Number(editingPlan.max_products || 0),
        active_days: Number(editingPlan.active_days || 30),
      };
      
      await updateSubscriptionPlan(editingPlan.id, payload);
      showToast?.(`Paket ${editingPlan.name} berhasil diperbarui`, 'success');
      setEditingPlan(null);
      await loadPlans();
    } catch (err) {
      showToast?.(err.message || 'Gagal memperbarui paket', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (plan) => {
    setShowDeleteConfirm(plan);
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;
    const plan = showDeleteConfirm;
    
    setDeletingId(plan.id);
    setShowDeleteConfirm(null);
    try {
      await deleteSubscriptionPlan(plan.id);
      showToast?.(`Paket ${plan.name} berhasil dihapus`, 'success');
      await loadPlans();
    } catch (err) {
      showToast?.(err.message || 'Gagal menghapus paket', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddNewPlan = () => {
    setErrors({});
    setEditingPlan({
      id: '',
      name: '',
      price_monthly: 0,
      price_original: 0,
      max_outlets: 1,
      max_staff: 1,
      max_products: 100,
      active_days: 30,
      features: [],
      is_new: true
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-10 h-10 border-[3px] border-teal-100 border-t-teal-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 mt-4">Memuat paket langganan...</p>
      </div>
    );
  }

  const planRows = plans.length ? plans : [
    { id: 'free', name: 'Free', price_monthly: 0, max_outlets: 1, max_staff: 3, max_products: 100, features: PLAN_PRESETS.free.modules },
    { id: 'pro', name: 'Pro', price_monthly: 99000, max_outlets: 3, max_staff: 10, max_products: 1000, features: PLAN_PRESETS.pro.modules },
    { id: 'enterprise', name: 'Enterprise', price_monthly: 299000, max_outlets: 99, max_staff: 99, max_products: 99999, features: ['all'] },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 flex-1">
          <h3 className="text-sm font-bold text-indigo-900">Matriks Paket & Modul Platform</h3>
          <p className="text-xs text-indigo-700/80 mt-1 leading-relaxed">
            Setiap tenant bisa di-assign paket dari tab Tenant. Tombol <strong>Paket + Modul</strong> otomatis menerapkan preset modul di bawah.
            Override modul per tenant tetap bisa dilakukan manual di panel detail tenant.
          </p>
        </div>
        <button 
          onClick={handleAddNewPlan}
          className="px-6 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-sm font-black uppercase tracking-wider shadow-lg shadow-teal-500/20 transition-all active:scale-95 flex items-center gap-2 shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Paket
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {planRows.map((plan) => {
          const moduleIds = plan.features?.includes?.('all') ? ALL_MODULES.map((m) => m.id) : (plan.features || []);
          return (
            <div key={plan.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative group">
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
                <button 
                  onClick={() => handleEdit(plan)}
                  className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-lg transition-colors"
                  title="Edit Paket"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button 
                  onClick={() => handleDeleteClick(plan)}
                  disabled={deletingId === plan.id}
                  className="p-2 bg-red-500/20 hover:bg-red-500/40 text-white rounded-lg transition-colors disabled:opacity-50"
                  title="Hapus Paket"
                >
                  {deletingId === plan.id ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>

              <div className={`px-5 py-4 ${plan.id === 'enterprise' ? 'bg-violet-600' : plan.id === 'pro' ? 'bg-teal-600' : 'bg-slate-700'} text-white`}>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">{plan.id}</p>
                <p className="text-xl font-bold mt-0.5">{plan.name}</p>
                <div className="mt-2">
                  {plan.price_original > plan.price_monthly && (
                    <p className="text-xs line-through opacity-60 decoration-white/50">{formatRupiah(plan.price_original)}</p>
                  )}
                  <p className="text-2xl font-bold">{formatRupiah(plan.price_monthly)}<span className="text-sm font-normal opacity-70">/bln</span></p>
                </div>
              </div>
              <div className="px-5 py-4 border-b border-slate-100 grid grid-cols-4 gap-2 text-center">
                {[
                  { l: 'Outlet', v: plan.max_outlets },
                  { l: 'Staff', v: plan.max_staff },
                  { l: 'Produk', v: plan.max_products },
                  { l: 'Durasi', v: `${plan.active_days || 30} hr` },
                ].map((q) => (
                  <div key={q.l}>
                    <p className="text-base font-bold text-slate-800">{q.v}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-semibold">{q.l}</p>
                  </div>
                ))}
              </div>
              <div className="flex-1 p-5 space-y-4">
                {MODULE_CATEGORIES.map((cat) => {
                  const mods = ALL_MODULES.filter((m) => m.category === cat.id);
                  return (
                    <div key={cat.id}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">{cat.label}</p>
                      <div className="space-y-1">
                        {mods.map((mod) => {
                          const included = plan.features?.includes('all') || moduleIds.includes(mod.id);
                          return (
                            <div key={mod.id} className={`flex items-center gap-2 text-xs ${included ? 'text-slate-700' : 'text-slate-300'}`}>
                              <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${included ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-300'}`}>
                                {included ? '✓' : '—'}
                              </span>
                              <span>{mod.icon} {mod.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Edit Paket */}
      {editingPlan && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !saving && setEditingPlan(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Edit Paket {editingPlan.id}</h3>
                <p className="text-xs text-slate-500 font-medium">Sesuaikan harga, limit, dan modul aktif</p>
              </div>
              <button onClick={() => setEditingPlan(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Informasi Dasar */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plan ID (Slug)</label>
                  <input 
                    type="text"
                    value={editingPlan.id}
                    disabled={!editingPlan.is_new}
                    onChange={(e) => {
                      setEditingPlan({ ...editingPlan, id: e.target.value.toLowerCase().replace(/\s+/g, '-') });
                    }}
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 outline-none transition-all ${
                      editingPlan.is_new ? 'border-slate-200 focus:ring-teal-500/20 focus:border-teal-500' : 'border-slate-100 opacity-60 cursor-not-allowed'
                    }`}
                    placeholder="Contoh: basic-pack"
                  />
                  {editingPlan.is_new && <p className="text-[9px] text-slate-400 ml-1">ID unik paket, tidak bisa diubah nanti</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Tampilan</label>
                  <input 
                    type="text"
                    value={editingPlan.name}
                    onChange={(e) => {
                      setEditingPlan({ ...editingPlan, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: false });
                    }}
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 outline-none transition-all ${
                      errors.name ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:ring-teal-500/20 focus:border-teal-500'
                    }`}
                    placeholder="Contoh: Pro"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Harga Bulanan (Rp)</label>
                  <input 
                    type="number"
                    value={editingPlan.price_monthly}
                    onChange={(e) => {
                      setEditingPlan({ ...editingPlan, price_monthly: parseInt(e.target.value) || 0 });
                      if (errors.price) setErrors({ ...errors, price: false });
                    }}
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 outline-none transition-all ${
                      errors.price ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:ring-teal-500/20 focus:border-teal-500'
                    }`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Harga Coret (Rp)</label>
                  <input 
                    type="number"
                    value={editingPlan.price_original || 0}
                    onChange={(e) => {
                      setEditingPlan({ ...editingPlan, price_original: parseInt(e.target.value) || 0 });
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                    placeholder="Opsional"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Durasi Paket (Hari)</label>
                  <input 
                    type="number"
                    value={editingPlan.active_days || 30}
                    onChange={(e) => {
                      setEditingPlan({ ...editingPlan, active_days: parseInt(e.target.value) || 1 });
                      if (errors.active_days) setErrors({ ...errors, active_days: false });
                    }}
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 outline-none transition-all ${
                      errors.active_days ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:ring-teal-500/20 focus:border-teal-500'
                    }`}
                  />
                </div>
              </div>

              {/* Limit Kuota */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: 'max_outlets', label: 'Max Outlet', errKey: 'max_outlets' },
                  { key: 'max_staff', label: 'Max Staff', errKey: 'max_staff' },
                  { key: 'max_products', label: 'Max Produk', errKey: 'max_products' },
                ].map((item) => (
                  <div key={item.key} className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{item.label}</label>
                    <input 
                      type="number"
                      value={editingPlan[item.key]}
                      onChange={(e) => {
                        setEditingPlan({ ...editingPlan, [item.key]: parseInt(e.target.value) || 0 });
                        if (errors[item.errKey]) setErrors({ ...errors, [item.errKey]: false });
                      }}
                      className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm font-bold text-slate-700 focus:ring-2 outline-none transition-all ${
                        errors[item.errKey] ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:ring-teal-500/20 focus:border-teal-500'
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Pemilihan Modul */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Konfigurasi Modul</label>
                  <button 
                    onClick={() => {
                      const allIds = ALL_MODULES.map(m => m.id);
                      const isAll = editingPlan.features.length === allIds.length || editingPlan.features.includes('all');
                      setEditingPlan({ ...editingPlan, features: isAll ? [] : ['all'] });
                    }}
                    className="text-[10px] font-bold text-teal-600 uppercase hover:underline"
                  >
                    {editingPlan.features.includes('all') ? 'Hapus Semua' : 'Pilih Semua (All)'}
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6 bg-slate-50 rounded-3xl p-6">
                  {MODULE_CATEGORIES.map((cat) => {
                    const mods = ALL_MODULES.filter(m => m.category === cat.id);
                    const isAll = editingPlan.features.includes('all');
                    const allInCatActive = isAll || mods.every(m => editingPlan.features.includes(m.id));

                    return (
                      <div key={cat.id} className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cat.label}</p>
                          <button 
                            onClick={() => !isAll && toggleCategory(cat.id)}
                            disabled={isAll}
                            className={`text-[9px] font-bold uppercase transition-colors ${
                              allInCatActive ? 'text-teal-600' : 'text-slate-400 hover:text-teal-500'
                            } ${isAll ? 'cursor-not-allowed opacity-50' : ''}`}
                          >
                            {allInCatActive ? 'Aktif Semua' : 'Pilih Semua'}
                          </button>
                        </div>
                        <div className="space-y-2">
                          {mods.map((mod) => {
                            const active = isAll || editingPlan.features.includes(mod.id);
                            return (
                              <button
                                key={mod.id}
                                onClick={() => !isAll && toggleModule(mod.id)}
                                disabled={isAll}
                                className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all ${
                                  active 
                                    ? 'bg-white border-teal-200 shadow-sm' 
                                    : 'bg-white/50 border-transparent opacity-60 grayscale'
                                } ${isAll ? 'cursor-not-allowed' : 'hover:border-teal-300 hover:shadow-sm'}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{mod.icon}</span>
                                  <span className="text-xs font-bold text-slate-700">{mod.label}</span>
                                </div>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-teal-500 text-white' : 'bg-slate-200'}`}>
                                  {active && (
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => setEditingPlan(null)}
                disabled={saving}
                className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase hover:text-slate-700 disabled:opacity-50"
              >
                Batal
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Menyimpan...
                  </>
                ) : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Kustom */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6">
                🗑️
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Hapus Paket?</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Anda yakin ingin menghapus paket <span className="font-bold text-slate-800">"{showDeleteConfirm.name}"</span>? 
                Tindakan ini permanen dan tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex border-t border-slate-100">
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-6 py-5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-6 py-5 text-xs font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors border-l border-slate-100"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Katalog Modul Lengkap ({ALL_MODULES.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-2 text-xs font-semibold text-slate-500">Modul</th>
                <th className="px-4 py-2 text-xs font-semibold text-slate-500">Kategori</th>
                <th className="px-4 py-2 text-xs font-semibold text-slate-500">Min. Paket</th>
                <th className="px-4 py-2 text-xs font-semibold text-slate-500 text-center">Free</th>
                <th className="px-4 py-2 text-xs font-semibold text-slate-500 text-center">Pro</th>
                <th className="px-4 py-2 text-xs font-semibold text-slate-500 text-center">Ent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ALL_MODULES.map((mod) => (
                <tr key={mod.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">{mod.icon} {mod.label}</td>
                  <td className="px-4 py-2 text-slate-500 capitalize">{mod.category}</td>
                  <td className="px-4 py-2 capitalize">{mod.minPlan}</td>
                  {['free', 'pro', 'enterprise'].map((pid) => {
                    const plan = planRows.find(p => p.id === pid);
                    const ok = plan?.features?.includes('all') || plan?.features?.includes(mod.id);
                    return (
                      <td key={pid} className="px-4 py-2 text-center">{ok ? '✅' : '—'}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
