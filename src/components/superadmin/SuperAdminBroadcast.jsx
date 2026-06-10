import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function SuperAdminBroadcast({ showToast }) {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', message: '', type: 'info', show_as_popup: false, image: '', button_text: '', button_url: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        showToast?.('Ukuran file maksimal 2MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  async function fetchBroadcasts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('broadcast_messages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setBroadcasts(data || []);
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.message) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/saas/broadcasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      showToast?.('Pengumuman berhasil ditambahkan!', 'success');
      setForm({ title: '', message: '', type: 'info', show_as_popup: false, image: '', button_text: '', button_url: '' });
      fetchBroadcasts();
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hentikan pengumuman ini?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/saas/broadcasts/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      showToast?.('Pengumuman dihentikan', 'success');
      fetchBroadcasts();
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  };

  const getTypeStyle = (type) => {
    if (type === 'promo') return 'bg-purple-100 text-purple-700 border-purple-200';
    if (type === 'warning') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  return (
    <div className="space-y-6">
      {/* Form Buat Broadcast */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Buat Pengumuman Baru</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Judul</label>
              <input 
                type="text" 
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Cth: Maintenance Server / Promo Merdeka"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Tipe Notifikasi</label>
              <select 
                value={form.type}
                onChange={e => setForm({...form, type: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="info">ℹ️ Informasi Umum (Biru)</option>
                <option value="promo">🎉 Promo Spesial (Ungu)</option>
                <option value="warning">⚠️ Peringatan Penting (Kuning)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Isi Pesan / Marquee</label>
            <textarea 
              value={form.message}
              onChange={e => setForm({...form, message: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 min-h-[80px]"
              placeholder="Tuliskan pesan yang akan berjalan di dashboard kasir..."
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="show_as_popup"
              checked={form.show_as_popup}
              onChange={e => setForm({...form, show_as_popup: e.target.checked})}
              className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
            />
            <label htmlFor="show_as_popup" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
              Tampilkan sebagai Pop-up di Halaman Tenant (Akan muncul sebagai modal tengah layar)
            </label>
          </div>

          {form.show_as_popup && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-4 animate-in fade-in duration-250">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Konfigurasi Pop-up Kustom (Lazada / Shopee Style)</h4>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Upload Gambar */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-slate-400">Gambar Pop-up (Format Gambar, Maks 2MB)</label>
                  {!form.image ? (
                    <label className="border-2 border-dashed border-slate-200 hover:border-teal-500 bg-white hover:bg-teal-50/5 transition-all rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer group">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400 group-hover:text-teal-600 mb-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-[10px] font-bold text-slate-500 group-hover:text-teal-700">Pilih File Banner/Promo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                      <img src={form.image} alt="Preview Banner" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, image: '' }))}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg cursor-pointer"
                        >
                          Hapus Gambar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tombol Aksi Kustom */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Teks Tombol Aksi (Opsional)</label>
                    <input 
                      type="text" 
                      value={form.button_text}
                      onChange={e => setForm({...form, button_text: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Cth: Cek Sekarang / Klaim Voucher"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Link Tombol Aksi (Opsional)</label>
                    <input 
                      type="text" 
                      value={form.button_url}
                      onChange={e => setForm({...form, button_url: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Cth: /ppob-topup atau https://site.com"
                    />
                    <p className="text-[9px] text-slate-400 font-medium mt-1">Gunakan <strong>/ppob-topup</strong> untuk link internal POS atau <strong>https://</strong> untuk link luar.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <button 
            type="submit" 
            disabled={submitting}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {submitting ? 'Mengirim...' : 'Kirim Broadcast Sekarang'}
          </button>
        </form>
      </div>

      {/* Riwayat Broadcast */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Riwayat Pengumuman</h3>
        {loading ? (
          <p className="text-xs text-slate-500">Memuat data...</p>
        ) : broadcasts.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Belum ada pengumuman.</p>
        ) : (
          <div className="grid gap-3">
            {broadcasts.map(b => (
              <div key={b.id} className={`p-4 rounded-xl border flex items-center justify-between ${b.is_active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase border ${getTypeStyle(b.type)}`}>
                      {b.type}
                    </span>
                    {b.show_as_popup && (
                      <span className="px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase bg-purple-100 text-purple-700 border border-purple-200">
                        ✨ Pop-up
                      </span>
                    )}
                    {b.show_as_popup && b.image && (
                      <span className="px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase bg-emerald-105 text-emerald-700 border border-emerald-200">
                        🖼️ Gambar
                      </span>
                    )}
                    {b.show_as_popup && b.button_text && (
                      <span className="px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase bg-blue-105 text-blue-700 border border-blue-200">
                        🔗 Tombol
                      </span>
                    )}
                    <span className="text-sm font-bold text-slate-800">{b.title}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{b.message}</p>
                  <p className="text-[10px] text-slate-400">{new Date(b.created_at).toLocaleString('id-ID')}</p>
                </div>
                <div>
                  {b.is_active ? (
                    <button onClick={() => handleDelete(b.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors">
                      Berhentikan
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Nonaktif</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
