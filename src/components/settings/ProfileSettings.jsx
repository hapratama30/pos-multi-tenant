// eslint-disable-next-line no-unused-vars
import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);
const IconUser = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconMail = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
  </svg>
);
const IconLock = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export default function ProfileSettings({ currentUser, onBack }) {
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const updateData = { name, email };
      if (password.trim() !== '') {
        updateData.password = password;
      }

      const { error } = await supabase
        .from('staff')
        .update(updateData)
        .eq('id', currentUser.id);

      if (error) throw error;
      setMsg({ type: 'success', text: 'Profil Anda berhasil diperbarui!' });
      setPassword('');
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Gagal memperbarui profil' });
    } finally {
      setLoading(false);
    }
  };

  const userRole = currentUser?.role || 'Staff';
  const initials = (currentUser?.name || 'U').charAt(0).toUpperCase();

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
            <h1 className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight uppercase">Profile Pengguna</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Kelola data login akun aktif Anda</p>
          </div>
        </header>

        {/* STAT CARDS - INFO PENGGUNA */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-700 font-black text-2xl border border-teal-100 shrink-0">
              {initials}
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Nama Aktif</span>
              <p className="text-sm font-black text-slate-800 uppercase tracking-tight mt-0.5">{currentUser?.name || 'Pengguna'}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 border border-orange-100 shrink-0">
              <IconMail />
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Email Login</span>
              <p className="text-xs font-black text-slate-800 mt-0.5 truncate max-w-[150px]">{currentUser?.email || '-'}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center border border-teal-100 shrink-0">
              <span className="text-xl">🎖️</span>
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Role Akun</span>
              <p className="text-sm font-black text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-lg inline-block uppercase tracking-wider mt-1 text-[10px]">{userRole}</p>
            </div>
          </div>
        </div>

        {/* FORM SECTION */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm space-y-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">✏️ Edit Informasi Akun</p>

          {msg && (
            <div className={`p-4 rounded-2xl text-xs font-black shadow-sm border flex items-center gap-2 ${
              msg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {msg.type === 'success' ? '✓' : '✕'} {msg.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-teal-600 transition-colors">Nama Lengkap</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 pl-12 text-sm font-bold focus:border-teal-600 outline-none transition-all"
                  required
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><IconUser /></div>
              </div>
            </div>

            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-teal-600 transition-colors">Email Aktif</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 pl-12 text-sm font-bold focus:border-teal-600 outline-none transition-all"
                  required
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><IconMail /></div>
              </div>
            </div>

            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-teal-600 transition-colors">Password Baru <span className="normal-case text-slate-300">(Kosongkan jika tidak diganti)</span></label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 pl-12 text-sm font-bold focus:border-teal-600 outline-none transition-all"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><IconLock /></div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 rounded-[1.75rem] bg-teal-600 text-white text-[11px] font-black uppercase tracking-[0.25em] shadow-xl shadow-teal-100 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? '⏳ Menyimpan...' : '💾 Simpan Profil Saya'}
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