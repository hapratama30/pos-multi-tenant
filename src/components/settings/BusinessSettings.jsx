// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);
const IconStore = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IconPhone = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.09 6.09l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const IconMapPin = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);

export default function BusinessSettings({ tenantId, selectedOutletId, onBack }) {
  const [namaToko, setNamaToko] = useState('');
  const [alamat, setAlamat] = useState('');
  const [telepon, setTelepon] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const fetchBusinessData = useCallback(async () => {
    try {
      setLoading(true);
      if (selectedOutletId) {
        const { data, error } = await supabase
          .from('outlets')
          .select('name, address, phone')
          .eq('tenant_id', tenantId)
          .eq('id', selectedOutletId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setNamaToko(data.name || '');
          setAlamat(data.address || '');
          setTelepon(data.phone || '');
        }
      } else {
        const { data, error } = await supabase
          .from('tenants')
          .select('tenant_name, address, phone')
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setNamaToko(data.tenant_name || '');
          setAlamat(data.address || '');
          setTelepon(data.phone || '');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, selectedOutletId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBusinessData();
  }, [fetchBusinessData]);

  const handleSaveBusiness = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      if (selectedOutletId) {
        const { error } = await supabase
          .from('outlets')
          .update({
            name: namaToko,
            address: alamat,
            phone: telepon
          })
          .eq('tenant_id', tenantId)
          .eq('id', selectedOutletId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tenants')
          .update({
            tenant_name: namaToko,
            address: alamat,
            phone: telepon
          })
          .eq('tenant_id', tenantId);

        if (error) throw error;
      }
      setMsg({ type: 'success', text: 'Informasi bisnis berhasil diperbarui!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Gagal menyimpan data bisnis' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="pb-32 bg-[#F8FAFC] min-h-screen font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Memuat Data Bisnis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32 bg-[#F8FAFC] min-h-screen font-sans">

      <div className="px-4 sm:px-6 pt-6 space-y-6">

        {/* TOMBOL BACK */}
        <div>
          <button onClick={onBack} className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-3.5 rounded-[1.5rem] shadow-sm text-[10px] font-black text-slate-800 active:scale-95 transition-all uppercase tracking-widest hover:border-slate-300">
            <IconChevronLeft />
            Kembali
          </button>
        </div>

        {/* PAGE HEADER */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight uppercase">Nama Usaha & Toko</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Kelola identitas outlet utama Anda</p>
          </div>
        </header>

        {/* STAT CARDS - INFO TOKO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-700 border border-teal-100 shrink-0">
              <IconStore />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Nama Toko</span>
              <p className="text-sm font-black text-slate-800 uppercase tracking-tight mt-0.5 truncate">{namaToko || '—'}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 border border-orange-100 shrink-0">
              <IconPhone />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">No. Telepon</span>
              <p className="text-sm font-black text-slate-800 mt-0.5 truncate">{telepon || '—'}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-700 border border-teal-100 shrink-0">
              <IconMapPin />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Alamat</span>
              <p className="text-xs font-black text-slate-800 mt-0.5 line-clamp-2">{alamat || '—'}</p>
            </div>
          </div>
        </div>

        {/* FORM SECTION */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm space-y-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">🏪 Edit Informasi Toko</p>

          {msg && (
            <div className={`p-4 rounded-2xl text-xs font-black shadow-sm border flex items-center gap-2 ${
              msg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {msg.type === 'success' ? '✓' : '✕'} {msg.text}
            </div>
          )}

          <form onSubmit={handleSaveBusiness} className="space-y-4">
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-teal-600 transition-colors">Nama Toko / Laundry</label>
              <div className="relative">
                <input
                  type="text"
                  value={namaToko}
                  onChange={(e) => setNamaToko(e.target.value)}
                  placeholder="Contoh: Laundry Bersih Berseri"
                  className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 pl-12 text-sm font-bold focus:border-teal-600 outline-none transition-all"
                  required
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><IconStore /></div>
              </div>
            </div>

            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-teal-600 transition-colors">Nomor Telepon Toko</label>
              <div className="relative">
                <input
                  type="text"
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 pl-12 text-sm font-bold focus:border-teal-600 outline-none transition-all"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><IconPhone /></div>
              </div>
            </div>

            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-teal-600 transition-colors">Alamat Lengkap Toko</label>
              <div className="relative">
                <textarea
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  rows="3"
                  placeholder="Nama jalan, kota, kode pos..."
                  className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 pl-12 text-sm font-bold focus:border-teal-600 outline-none resize-none transition-all"
                />
                <div className="absolute left-4 top-4 text-slate-400"><IconMapPin /></div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-5 rounded-[1.75rem] bg-teal-600 text-white text-[11px] font-black uppercase tracking-[0.25em] shadow-xl shadow-teal-100 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {saving ? '⏳ Menyimpan Toko...' : '🏪 Simpan Informasi Bisnis'}
              </button>
              <button type="button" onClick={onBack} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest text-center hover:text-slate-600 transition-all">
                Batal
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}