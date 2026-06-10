// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { insertStaffRow } from '../utils/staffLookup';

const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);
const IconPlus = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
const IconAlertTriangle = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const ALL_PERMISSIONS = [
  { id: 'pos', label: 'Transaksi Kasir' },
  { id: 'history', label: 'Riwayat Transaksi' },
  { id: 'reports', label: 'Laporan Penjualan' },
  { id: 'settings', label: 'Pengaturan & Staff' },
  { id: 'catalog', label: 'Katalog Produk' },
  { id: 'variants', label: 'Varian & Ekstra' },
  { id: 'stock', label: 'Stok Bahan/Gudang' },
  { id: 'customers', label: 'Database Pelanggan' },
  { id: 'discounts', label: 'Diskon & Promo' },
  { id: 'expenses', label: 'Catat Pengeluaran' }
];

const DEFAULT_PERMISSIONS = ['pos', 'history', 'catalog', 'variants', 'stock', 'customers', 'discounts', 'expenses'];

export default function StaffManager({ onBack, currentUser, selectedOutletId }) {
  const rawLocalUser = localStorage.getItem('pos_current_user');
  const parsedLocalUser = rawLocalUser ? JSON.parse(rawLocalUser) : {};
  const activeUser = currentUser || parsedLocalUser || {};

  const tenantId =
    activeUser?.tenant_id ||
    activeUser?.tenants?.id ||
    activeUser?.user?.tenant_id ||
    parsedLocalUser?.tenant_id ||
    parsedLocalUser?.tenants?.id;

  const userRole = activeUser?.role || parsedLocalUser?.role || 'Admin';

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });
  const [outlets, setOutlets] = useState([]);

  const [form, setForm] = useState({
    id: '',
    name: '',
    email: '',
    password: '',
    role: 'Kasir',
    status: 'Aktif',
    permissions: DEFAULT_PERMISSIONS,
    outlet_id: ''
  });

  useEffect(() => {
    if (tenantId) {
      supabase.from('outlets').select('id, name, is_main').eq('tenant_id', tenantId)
        .then(({ data }) => setOutlets(data || []));
    }
  }, [tenantId]);

  const fetchStaff = useCallback(async () => {
    if (!tenantId) {
      setErrorMsg('Gagal memuat: ID Toko tidak terdeteksi. Silakan Relogin.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setErrorMsg(null);
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setStaffList(data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal mengambil daftar staff: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStaff();
  }, [fetchStaff]);

  const handleOpenAddModal = () => {
    setForm({ id: '', name: '', email: '', password: '', role: 'Kasir', status: 'Aktif', permissions: DEFAULT_PERMISSIONS, outlet_id: selectedOutletId || '' });
    setErrorMsg(null); setSuccessMsg(null); setShowModal(true);
  };

  const handleEditClick = (staff) => {
    setForm({
      id: staff.id,
      name: staff.name || '',
      email: staff.email || '',
      password: '',
      role: staff.role || 'Kasir',
      status: staff.status || 'Aktif',
      permissions: Array.isArray(staff.permissions) ? staff.permissions : DEFAULT_PERMISSIONS,
      outlet_id: staff.outlet_id || ''
    });
    setErrorMsg(null); setSuccessMsg(null); setShowModal(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      if (!tenantId) {
        throw new Error('Sistem kehilangan sesi ID Toko (Tenant ID). Silakan refresh halaman atau login ulang.');
      }

      if (form.id) {
        const updatePayload = {
          name: form.name,
          role: form.role,
          status: form.status,
          permissions: form.permissions,
          outlet_id: form.outlet_id ? Number(form.outlet_id) : null
        };

        let updateError = null;
        ({ error: updateError } = await supabase
          .from('staff')
          .update(updatePayload)
          .eq('id', form.id)
          .eq('tenant_id', tenantId));

        // Jika error karena kolom belum ada, hapus kolom opsional dan coba lagi
        if (updateError && /does not exist/i.test(updateError.message || '')) {
          const optionalCols = ['permissions', 'outlet_id'];
          for (const col of optionalCols) {
            if (updateError && new RegExp(col + '\\b.*does not exist', 'i').test(updateError.message || '')) {
              delete updatePayload[col];
              ({ error: updateError } = await supabase
                .from('staff')
                .update(updatePayload)
                .eq('id', form.id)
                .eq('tenant_id', tenantId));
            }
          }
          // Fallback: hapus semua kolom opsional
          if (updateError && /does not exist/i.test(updateError.message || '')) {
            for (const col of optionalCols) delete updatePayload[col];
            ({ error: updateError } = await supabase
              .from('staff')
              .update(updatePayload)
              .eq('id', form.id)
              .eq('tenant_id', tenantId));
          }
        }

        if (updateError) throw updateError;
        setSuccessMsg('Data staff berhasil diperbarui!');
      } else {
        const staffEmail = form.email.trim().toLowerCase();
        if (!staffEmail || !staffEmail.includes('@')) {
          throw new Error('Email wajib diisi dengan format yang benar!');
        }
        if (!form.password || form.password.length < 6) {
          throw new Error('Password wajib diisi minimal 6 karakter!');
        }

        let authUserId = null;
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: staffEmail,
          password: form.password,
          options: {
            data: { name: form.name, role: form.role, tenant_id: tenantId }
          }
        });

        if (authError) {
          // Jika user sudah ada di auth.users, kita tetap bisa menambahkannya ke tabel staff toko ini.
          // Login berikutnya akan menggunakan staffLookup fallback (by email) untuk memulihkan session.
          if (authError.message.includes('already registered') || authError.status === 422) {
            console.log("Info: User auth sudah ada, melanjutkan insert ke tabel staff.");
            // authUserId dibiarkan null, nanti akan diisi otomatis saat user tersebut login
          } else {
            throw authError;
          }
        } else if (authData?.user) {
          authUserId = authData.user.id;
          
          // CATATAN PENTING: signUp di client side sering otomatis mengubah session login ke user baru.
          // Untuk mencegah admin ter-logout, idealnya kita pakai edge function atau admin API.
          // Sebagai workaround sementara untuk POS ini, admin mungkin harus login ulang jika ter-logout.
        }

        const { error: insertError } = await insertStaffRow({
          tenant_id: tenantId,
          auth_user_id: authUserId,
          name: form.name,
          email: staffEmail,
          role: form.role,
          status: form.status,
          permissions: form.permissions,
          outlet_id: form.outlet_id ? Number(form.outlet_id) : null
        });

        if (insertError) {
          console.error("Supabase Insert Error:", insertError);
          throw new Error('Gagal menyimpan profil staff: ' + insertError.message);
        }

        setSuccessMsg(`Staff baru "${form.name}" sukses ditambahkan ke toko ini!`);
      }

      await fetchStaff();
      setTimeout(() => setShowModal(false), 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async () => {
    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', deleteModal.id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
      setDeleteModal({ isOpen: false, id: null, name: '' });
      setSuccessMsg('Staff berhasil dihapus dari sistem.');
      fetchStaff();
    } catch (err) {
      setErrorMsg('Gagal menghapus staff: ' + err.message);
      setDeleteModal({ isOpen: false, id: null, name: '' });
    }
  };

  const mainOutlet = outlets.find(o => o.is_main);
  
  // NOTE: selectedOutletId comes from props now
  const displayedStaff = staffList.filter(staff => {
    if (!selectedOutletId) return true;
    const sOutlet = staff.outlet_id ? String(staff.outlet_id) : null;
    if (sOutlet === String(selectedOutletId)) return true;
    if (sOutlet === null && mainOutlet && String(mainOutlet.id) === String(selectedOutletId)) return true;
    return false;
  });

  const activeCount = displayedStaff.filter(s => s.status === 'Aktif').length;
  const adminCount = displayedStaff.filter(s => s.role === 'Admin' || s.role === 'Owner').length;

  return (
    <div className="pb-32 bg-[#F8FAFC] min-h-screen font-sans">

      <div className="px-4 sm:px-6 pt-6 space-y-6">

        {/* TOMBOL BACK */}
        <div className="mb-2">
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-3.5 rounded-[1.5rem] shadow-sm text-[10px] font-black text-slate-800 active:scale-95 transition-all uppercase tracking-widest hover:border-slate-300"
          >
            <IconChevronLeft />
            Kembali
          </button>
        </div>

        {/* PAGE HEADER + TOMBOL TAMBAH */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight uppercase">Manajemen Staff</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Atur otoritas akun login karyawan toko</p>
          </div>
          {(userRole === 'Admin' || userRole === 'Owner') && (
            <button
              onClick={handleOpenAddModal}
              className="text-white font-black text-[11px] uppercase tracking-[0.1em] px-6 sm:px-8 py-3.5 sm:py-4 rounded-[1.25rem] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 bg-gradient-to-br from-[#0f8b6b] to-teal-600 w-full sm:w-auto shrink-0"
            >
              <IconPlus />
              Tambah Staff Baru
            </button>
          )}
        </header>
        

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-2xl border border-teal-100 shrink-0">👥</div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Staff</span>
              <p className="text-2xl font-black text-teal-700 mt-0.5">{displayedStaff.length} <span className="text-sm text-slate-400 font-bold">akun</span></p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl border border-emerald-100 shrink-0">✅</div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Akun Aktif</span>
              <p className="text-2xl font-black text-emerald-700 mt-0.5">{displayedStaff.filter(s => s.status === 'Aktif').length} <span className="text-sm text-slate-400 font-bold">staff</span></p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-2xl border border-orange-100 shrink-0">🎖️</div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Admin / Owner</span>
              <p className="text-2xl font-black text-orange-600 mt-0.5">{displayedStaff.filter(s => s.role === 'Admin' || s.role === 'Owner').length} <span className="text-sm text-slate-400 font-bold">akun</span></p>
            </div>
          </div>
        </div>

        {/* PESAN ERROR / SUCCESS */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl font-bold text-xs tracking-wide shadow-sm flex items-center gap-2">
            ⚠️ {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl font-bold text-xs tracking-wide shadow-sm flex items-center gap-2">
            ✅ {successMsg}
          </div>
        )}

        {/* DAFTAR STAFF */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">👤 Daftar Karyawan Aktif</p>
            <span className="text-[10px] font-black bg-teal-50 text-teal-700 border border-teal-100 px-3 py-1 rounded-full uppercase tracking-wider">
              {displayedStaff.length} Total Akun
            </span>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Memuat database staff...</p>
            </div>
          ) : displayedStaff.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
              {displayedStaff.map((staff, idx) => (
                <div
                  key={staff.id || idx}
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between hover:shadow-md hover:border-teal-200 transition-all duration-200 cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 text-white font-black rounded-2xl flex items-center justify-center text-sm shadow-md shadow-teal-600/20 shrink-0">
                      {(staff.name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-black text-slate-800 tracking-tight truncate">{staff.name}</p>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase shrink-0 ${
                          staff.status === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {staff.status}
                        </span>
                      </div>
                      <span className="inline-block mt-1 text-[8px] font-black bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                        💼 {staff.role}
                      </span>
                      {staff.outlet_id && outlets.some(o => o.id === staff.outlet_id) && (
                        <span className="inline-block mt-1 ml-1 text-[8px] font-black bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                          🏪 {outlets.find(o => o.id === staff.outlet_id)?.name}
                        </span>
                      )}
                      {staff.email && (
                        <p className="text-[9px] text-slate-400 font-medium mt-0.5 truncate">{staff.email}</p>
                      )}
                    </div>
                  </div>

                  {(userRole === 'Admin' || userRole === 'Owner') && (
                    <div className="flex flex-col gap-1.5 shrink-0 ml-2">
                      <button
                        onClick={() => handleEditClick(staff)}
                        className="text-[9px] font-black text-teal-700 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-200 px-3 py-2 rounded-xl transition-all active:scale-95"
                      >
                        EDIT
                      </button>
                      <button
                        onClick={() => setDeleteModal({ isOpen: true, id: staff.id, name: staff.name })}
                        className="text-[9px] font-black text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-3 py-2 rounded-xl transition-all active:scale-95"
                      >
                        HAPUS
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
              <div className="text-4xl mb-3 opacity-30">👥</div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Belum ada staff terdaftar</p>
              <p className="text-slate-300 text-[9px] font-bold mt-1">Klik "Tambah Staff" untuk mendaftarkan karyawan baru</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL FORM TAMBAH / EDIT STAFF */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Form Staff</p>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mt-0.5">
                  {form.id ? '✏️ Edit Data Staff' : '➕ Daftarkan Staff Baru'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-black text-sm transition-all active:scale-95">✕</button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl font-bold text-xs">
                  ⚠️ {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-2xl font-bold text-xs">
                  ✅ {successMsg}
                </div>
              )}

              <form onSubmit={handleSaveStaff} className="space-y-4">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-teal-600 transition-colors">Nama Lengkap</label>
                  <input
                    type="text" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Contoh: Rian Kasir"
                    className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-sm font-bold focus:border-teal-600 outline-none transition-all"
                    required
                  />
                </div>

                {!form.id && (
                  <>
                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-teal-600 transition-colors">Alamat Email Login</label>
                      <input
                        type="email" value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="Contoh: kasir@tokoanda.com"
                        className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-sm font-bold focus:border-teal-600 outline-none transition-all"
                        required
                      />
                    </div>
                    <div className="space-y-2 group">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-teal-600 transition-colors">Kata Sandi (Min 6 Karakter)</label>
                      <input
                        type="password" value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        placeholder="Masukkan password aman staff"
                        className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-sm font-bold focus:border-teal-600 outline-none transition-all"
                        required
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-teal-600 transition-colors">Jabatan (Role)</label>
                    <select
                      value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-sm font-bold focus:border-teal-600 outline-none transition-all appearance-none"
                    >
                      <option value="Kasir">Kasir</option>
                      <option value="Admin">Admin Toko</option>
                      <option value="Operator Gudang">Logistik Gudang</option>
                      {form.role === 'Owner' && <option value="Owner">Owner / Pemilik</option>}
                    </select>
                  </div>
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-teal-600 transition-colors">Status Akun</label>
                    <select
                      value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-sm font-bold focus:border-teal-600 outline-none transition-all appearance-none"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-teal-600 transition-colors">Tugas Cabang / Lokasi</label>
                  <select
                    value={form.outlet_id || ''}
                    onChange={e => setForm({ ...form, outlet_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-sm font-bold focus:border-teal-600 outline-none transition-all appearance-none"
                  >
                    <option value="">Semua Lokasi (Akses Multi-cabang)</option>
                    {outlets.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hak Akses Menu (Permissions)</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 max-h-48 overflow-y-auto">
                    {ALL_PERMISSIONS.map((perm) => {
                      const isChecked = form.permissions.includes(perm.id);
                      return (
                        <label key={perm.id} className="flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer select-none hover:text-teal-700 transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setForm((prev) => {
                                const current = prev.permissions || [];
                                const updated = checked
                                  ? [...current, perm.id]
                                  : current.filter((x) => x !== perm.id);
                                return { ...prev, permissions: updated };
                              });
                            }}
                            className="w-3.5 h-3.5 accent-teal-600 rounded"
                          />
                          {perm.label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-5 rounded-[1.75rem] bg-teal-600 text-white text-[11px] font-black uppercase tracking-[0.25em] shadow-xl shadow-teal-100 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-2"
                >
                  {saving ? '⏳ Sedang Memproses...' : form.id ? '💾 Simpan Perubahan' : '🚀 Daftarkan Akun Resmi'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest text-center hover:text-slate-600 transition-all">
                  Batal
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE MODAL */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setDeleteModal({ isOpen: false, id: null, name: '' })} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-8 space-y-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto border border-rose-100 shadow-sm animate-bounce">
              <IconAlertTriangle />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Hapus Permanen?</h3>
              <p className="text-xs font-bold text-slate-400 leading-relaxed px-1">
                Apakah anda yakin ingin menghapus staff <span className="text-rose-600 font-black">"{deleteModal.name}"</span>? Akun ini akan hilang selamanya dari database sistem.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setDeleteModal({ isOpen: false, id: null, name: '' })}
                className="w-full bg-slate-50 border border-slate-100 text-slate-500 font-black text-[10px] uppercase py-3.5 rounded-2xl active:scale-95 transition-all text-center"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteStaff}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase py-3.5 rounded-2xl active:scale-95 transition-all text-center shadow-lg shadow-rose-100"
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