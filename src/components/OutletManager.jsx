import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function OutletManager({ tenantId, onBack, onUpdated, currentUser }) {
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '' });
  const [msg, setMsg] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const canManage = currentUser?.role === 'Owner' || currentUser?.role === 'Admin';

  const showToast = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const fetchOutlets = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { data, error } = await supabase
        .from('outlets')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('is_main', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      setOutlets(data || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchOutlets(); }, [fetchOutlets]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    
    if (!form.name.trim()) {
      showToast('Nama cabang wajib diisi', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('outlets')
          .update({
            name: form.name.trim(),
            address: form.address.trim(),
            phone: form.phone.trim(),
          })
          .eq('id', editingId);
        if (error) throw error;
        showToast('Cabang berhasil diperbarui');
      } else {
        const { error } = await supabase.from('outlets').insert([{
          tenant_id: tenantId,
          name: form.name.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          is_main: outlets.length === 0,
          is_active: true
        }]);
        if (error) throw error;
        showToast('Cabang baru berhasil ditambahkan');
      }
      
      setForm({ name: '', address: '', phone: '' });
      setEditingId(null);
      await fetchOutlets();
      if (onUpdated) onUpdated();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (outlet) => {
    setEditingId(outlet.id);
    setForm({
      name: outlet.name || '',
      address: outlet.address || '',
      phone: outlet.phone || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ name: '', address: '', phone: '' });
  };

  const handleDelete = async (id) => {
    if (!canManage) return;
    if (!window.confirm('Yakin ingin menghapus cabang ini secara permanen? Data transaksi yang terkait dengan cabang ini mungkin akan terdampak.')) return;
    try {
      const { error } = await supabase.from('outlets').delete().eq('id', id).eq('tenant_id', tenantId);
      if (error) throw error;
      showToast('Cabang berhasil dihapus');
      await fetchOutlets();
      if (onUpdated) onUpdated();
    } catch (err) {
      showToast('Gagal menghapus cabang: ' + err.message, 'error');
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    if (!canManage) return;
    try {
      const { error } = await supabase
        .from('outlets')
        .update({ is_active: !currentStatus })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
      await fetchOutlets();
      if (onUpdated) onUpdated();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) return <div className="p-8 text-center text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Memuat data cabang...</div>;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pb-24 animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Cabang & Outlet</h2>
            <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Kelola multi-lokasi bisnis Anda</p>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4 ${msg.type === 'success' ? 'bg-teal-600 text-white' : 'bg-rose-600 text-white'}`}>
          <span className="text-lg">{msg.type === 'success' ? '✅' : '⚠️'}</span>
          <span className="text-xs font-black tracking-wide uppercase">{msg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* KOLOM KIRI: DAFTAR CABANG */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                Daftar Outlet ({outlets.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {outlets.length === 0 ? (
                <div className="col-span-full text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  <div className="text-4xl mb-2">🏢</div>
                  <p className="text-xs font-bold uppercase tracking-wider">Belum ada cabang terdaftar.</p>
                </div>
              ) : (
                outlets.map((o) => (
                  <div key={o.id} className={`group relative bg-white border ${editingId === o.id ? 'border-teal-400 ring-2 ring-teal-50' : 'border-slate-100'} rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all hover:border-slate-200 hover:shadow-md`}>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-base font-black text-slate-800 tracking-tight uppercase">{o.name}</p>
                        {o.is_main && (
                          <span className="text-[8px] bg-gradient-to-r from-orange-400 to-orange-500 text-white px-2 py-0.5 rounded-md font-black uppercase tracking-widest shadow-sm">
                            Pusat
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 font-medium flex items-start gap-1.5">
                          <span className="text-slate-300 mt-0.5">📍</span> {o.address || <span className="italic opacity-50">Alamat belum diatur</span>}
                        </p>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                          <span className="text-slate-300">📞</span> {o.phone || <span className="italic opacity-50">Telepon belum diatur</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-3">
                      {canManage && (
                        <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
                          <button 
                            onClick={() => handleToggleActive(o.id, o.is_active)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${o.is_active ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            Aktif
                          </button>
                          <button 
                            onClick={() => handleToggleActive(o.id, o.is_active)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${!o.is_active ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            Nonaktif
                          </button>
                        </div>
                      )}

                      {canManage && !o.is_main && (
                        <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(o)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            title="Edit Cabang"
                          >
                            <EditOutlinedIcon sx={{ fontSize: 16 }} />
                          </button>
                          <button 
                            onClick={() => handleDelete(o.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                            title="Hapus Cabang"
                          >
                            <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                          </button>
                        </div>
                      )}
                      
                      {/* Tombol edit untuk Pusat (Hanya edit, tidak bisa dihapus) */}
                      {canManage && o.is_main && (
                        <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                            onClick={() => handleEdit(o)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            title="Edit Cabang"
                          >
                            <EditOutlinedIcon sx={{ fontSize: 16 }} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: FORM TAMBAH / EDIT */}
        {canManage && (
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xl shadow-slate-200/40 sticky top-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${editingId ? 'bg-blue-50 text-blue-600' : 'bg-teal-50 text-teal-600'}`}>
                  {editingId ? <EditOutlinedIcon sx={{ fontSize: 18 }} /> : <span className="font-black text-lg leading-none">+</span>}
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                  {editingId ? 'Edit Cabang' : 'Cabang Baru'}
                </h3>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nama Cabang <span className="text-rose-500">*</span></label>
                  <input 
                    required 
                    placeholder="Contoh: AgraPOS - Sudirman" 
                    value={form.name} 
                    onChange={(e) => setForm({ ...form, name: e.target.value })} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Alamat Lengkap</label>
                  <textarea 
                    placeholder="Jl. Raya Sudirman No. 123..." 
                    value={form.address} 
                    onChange={(e) => setForm({ ...form, address: e.target.value })} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none resize-none h-24" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nomor Telepon</label>
                  <input 
                    placeholder="Contoh: 08123456789" 
                    value={form.phone} 
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none" 
                  />
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className={`w-full py-3.5 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 ${isSaving ? 'opacity-70 cursor-wait' : 'hover:scale-[1.02] active:scale-95'} ${editingId ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/30'}`}
                  >
                    {isSaving ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Tambah Cabang')}
                  </button>

                  {editingId && (
                    <button 
                      type="button"
                      onClick={handleCancelEdit}
                      className="w-full py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 font-black rounded-xl text-[10px] uppercase tracking-widest transition-all"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
