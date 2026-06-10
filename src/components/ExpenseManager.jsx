/* eslint-disable */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { formatRupiah } from '../utils/platformAdmin';

const THEME = { teal: '#0d9488', tealDark: '#0f766e', tealLight: '#e0f5f1', orange: '#F47920', orangeLight: '#fff3e8' };

const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="3" fill="none">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);
const IconPlus = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconSearch = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const UI = {
  btnBack: 'flex items-center gap-2 bg-white border border-slate-200 px-6 py-3.5 rounded-[1.5rem] shadow-sm text-[10px] font-black text-slate-800 active:scale-95 transition-all uppercase tracking-widest hover:border-slate-300',
  btnPrimary: 'text-white font-black text-[11px] uppercase tracking-[0.1em] px-6 sm:px-8 py-3.5 sm:py-4 rounded-[1.25rem] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 bg-gradient-to-br from-[#0f8b6b] to-teal-600 w-full sm:w-auto shrink-0',
  btnSubmit: 'flex-1 py-5 rounded-[1.75rem] bg-teal-600 text-white text-[11px] font-black uppercase tracking-[0.25em] shadow-xl shadow-teal-100 hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50',
  btnCancel: 'flex-1 py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest text-center hover:text-slate-600 transition-all border border-slate-200 rounded-[1.75rem] bg-white',
  search: 'w-full bg-white border border-slate-200 rounded-3xl p-4 pl-12 text-sm font-bold shadow-sm focus:border-teal-600 outline-none transition-all',
  listWrap: 'space-y-4',
  listRow: 'bg-white px-5 py-4 rounded-[2rem] border border-slate-200/80 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:border-teal-300/60 active:scale-[0.99]',
  emptyState: 'text-center py-16 border border-dashed border-slate-200 rounded-[2rem] bg-white',
  pageHeader: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-10',
  pageTitleBlock: 'min-w-0',
  pageTitle: 'text-xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight uppercase',
  pageSubtitle: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2',
  filterActive: 'px-8 py-3.5 rounded-full font-black text-[10px] uppercase tracking-wider border-2 text-white border-transparent shadow-md bg-teal-600',
  filterIdle: 'px-8 py-3.5 rounded-full font-black text-[10px] uppercase tracking-wider border-2 bg-white border-slate-200 text-slate-400',
};

const CATEGORIES_PEMBELIAN = [
  { value: 'supplier_bahan', label: 'Supplier Bahan Baku' },
  { value: 'supplier_produk', label: 'Supplier Produk Jadi' },
  { value: 'supplier_lain', label: 'Supplier Lainnya' },
];

const CATEGORIES_PENGELUARAN = [
  { value: 'listrik', label: 'Listrik & Utilitas' },
  { value: 'sewa', label: 'Sewa Tempat' },
  { value: 'gaji', label: 'Gaji & Upah' },
  { value: 'transport', label: 'Transport & BBM' },
  { value: 'atk', label: 'ATK & Operasional' },
  { value: 'lainnya', label: 'Lainnya' },
];

const PAYMENT_METHODS = ['Tunai', 'QRIS', 'Transfer', 'Virtual Account'];

const formatRp = (n) => formatRupiah(n);

const formatDateTime = (iso) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const getCategoryLabel = (recordType, category) => {
  const list = recordType === 'pembelian' ? CATEGORIES_PEMBELIAN : CATEGORIES_PENGELUARAN;
  return list.find((c) => c.value === category)?.label || category;
};

export default function ExpenseManager({ onBack, tenantId: propTenantId, currentUser, selectedOutletId, outlets = [] }) {
  const tenantId = propTenantId;  const actorName = currentUser?.name || currentUser?.email || 'Staff';

  const isMainOutlet = useMemo(() => {
    if (!selectedOutletId) return true;
    const current = outlets.find(o => String(o.id) === String(selectedOutletId));
    return current ? current.is_main : false;
  }, [outlets, selectedOutletId]);
  const staffId = currentUser?.staff_id ?? currentUser?.id ?? null;

  const [expenses, setExpenses] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const emptyForm = {
    id: null,
    record_type: 'pengeluaran',
    category: 'lainnya',
    title: '',
    supplier_name: '',
    total: '',
    payment_method: 'Tunai',
    notes: '',
    link_stock: false,
    stock_item_id: '',
    stock_qty: '',
  };
  const [form, setForm] = useState(emptyForm);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type }), 3500);
  }, []);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setExpenses(data || []);
    } catch (err) {
      if (err.message?.includes('expenses') && err.message?.includes('does not exist')) {
        showToast("Tabel 'expenses' belum ada. Jalankan SQL di supabase/migrations/", 'error');
      } else {
        showToast(err.message || 'Gagal memuat data', 'error');
      }
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, showToast]);

  const fetchStockItems = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('stock_items')
        .select('id, name, unit, current_stock')
        .eq('tenant_id', tenantId)
        .order('name');
      setStockItems(data || []);
    } catch {
      setStockItems([]);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchExpenses();
    fetchStockItems();
  }, [fetchExpenses, fetchStockItems]);

  const syncStockFromPurchase = async (stockItemId, qty, note) => {
    const item = stockItems.find((s) => String(s.id) === String(stockItemId));
    if (!item) throw new Error('Bahan gudang tidak ditemukan');

    const stockBefore = Number(item.current_stock) || 0;
    const newStock = stockBefore + Number(qty);

    const { error: updErr } = await supabase
      .from('stock_items')
      .update({ current_stock: newStock })
      .eq('id', item.id)
      .eq('tenant_id', tenantId);
    if (updErr) throw updErr;

    const { error: logErr } = await supabase.from('stock_logs').insert([{
      tenant_id: tenantId,
      stock_item_id: Number(item.id),
      stock_item_name: item.name,
      type: 'masuk',
      qty: Number(qty),
      note: note || 'Dari pembelian & pengeluaran',
      stock_before: stockBefore,
      stock_after: newStock,
      actor_name: actorName,
    }]);
    if (logErr && !logErr.message?.includes('does not exist')) throw logErr;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return showToast('Judul / keterangan wajib diisi', 'error');
    const totalNum = Number(form.total);
    if (!totalNum || totalNum <= 0) return showToast('Nominal harus lebih dari 0', 'error');

    if (form.link_stock && form.record_type === 'pembelian') {
      if (!form.stock_item_id) return showToast('Pilih bahan gudang untuk update stok', 'error');
      if (!form.stock_qty || Number(form.stock_qty) <= 0) return showToast('Qty stok wajib diisi', 'error');
    }

    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        record_type: form.record_type,
        category: form.category,
        title: form.title.trim(),
        supplier_name: form.supplier_name.trim() || null,
        total: totalNum,
        payment_method: form.payment_method,
        notes: form.notes.trim() || null,
        staff_id: staffId,
        cashier_name: actorName,
        stock_item_id: form.link_stock && form.stock_item_id ? Number(form.stock_item_id) : null,
        stock_qty: form.link_stock && form.stock_qty ? Number(form.stock_qty) : null,
        stock_synced: false,
        outlet_id: selectedOutletId ? Number(selectedOutletId) : null,
      };

      let expenseId = form.id;

      if (form.id) {
        const { error } = await supabase.from('expenses').update(payload).eq('id', form.id).eq('tenant_id', tenantId);
        if (error) throw error;
        showToast('Data berhasil diperbarui');
      } else {
        const { data, error } = await supabase.from('expenses').insert([payload]).select().single();
        if (error) throw error;
        expenseId = data.id;

        if (form.link_stock && form.record_type === 'pembelian') {
          await syncStockFromPurchase(
            form.stock_item_id,
            form.stock_qty,
            `Pembelian #${expenseId}: ${form.title}`
          );
          await supabase.from('expenses').update({ stock_synced: true }).eq('id', expenseId);
          await fetchStockItems();
        }
        showToast(form.link_stock ? 'Pembelian tersimpan & stok gudang diupdate' : 'Tersimpan');
      }

      setForm(emptyForm);
      setIsFormOpen(false);
      fetchExpenses();
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Hapus "${row.title}"?\n(Stok gudang tidak otomatis dikurangi)`)) return;
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', row.id).eq('tenant_id', tenantId);
      if (error) throw error;
      showToast('Data dihapus');
      fetchExpenses();
    } catch (err) {
      showToast(err.message || 'Gagal hapus', 'error');
    }
  };

  const filtered = useMemo(() => {
    let list = expenses;
    if (selectedOutletId) {
      list = list.filter((x) => {
        const xOutlet = x.outlet_id ? String(x.outlet_id) : null;
        const matchesOutlet = xOutlet === String(selectedOutletId);
        const isGlobal = !x.outlet_id || String(x.outlet_id) === 'null';
        return matchesOutlet || (isMainOutlet && isGlobal);
      });
    }
    if (filterType !== 'all') list = list.filter((x) => x.record_type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (x) =>
          x.title?.toLowerCase().includes(q) ||
          x.supplier_name?.toLowerCase().includes(q) ||
          x.notes?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [expenses, filterType, search, selectedOutletId, isMainOutlet]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const month = now.getMonth();
    const year = now.getFullYear();
    let todayTotal = 0;
    let monthTotal = 0;
    let pembelianMonth = 0;
    let pengeluaranMonth = 0;

    const outletFiltered = selectedOutletId
      ? expenses.filter((x) => {
          const xOutlet = x.outlet_id ? String(x.outlet_id) : null;
          const matchesOutlet = xOutlet === String(selectedOutletId);
          const isGlobal = !x.outlet_id || String(x.outlet_id) === 'null';
          return matchesOutlet || (isMainOutlet && isGlobal);
        })
      : expenses;

    outletFiltered.forEach((x) => {
      const d = x.created_at ? new Date(x.created_at) : null;
      if (!d) return;
      const t = Number(x.total) || 0;
      if (d.toDateString() === todayStr) todayTotal += t;
      if (d.getMonth() === month && d.getFullYear() === year) {
        monthTotal += t;
        if (x.record_type === 'pembelian') pembelianMonth += t;
        else pengeluaranMonth += t;
      }
    });
    return { todayTotal, monthTotal, pembelianMonth, pengeluaranMonth, count: outletFiltered.length };
  }, [expenses, selectedOutletId, isMainOutlet]);

  const categoryOptions = form.record_type === 'pembelian' ? CATEGORIES_PEMBELIAN : CATEGORIES_PENGELUARAN;

  return (
    <div className="relative min-h-[calc(100vh-140px)] pb-28 -mx-4 -mt-4 sm:-mx-4" style={{ background: '#F8FAFC' }}>
      {toast.show && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[99999] px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-wide shadow-lg"
          style={{
            background: toast.type === 'error' ? '#fef2f2' : THEME.tealLight,
            color: toast.type === 'error' ? '#b91c1c' : THEME.tealDark,
            border: `1px solid ${toast.type === 'error' ? '#fecaca' : THEME.teal}40`,
          }}
        >
          {toast.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-4 space-y-4">
        <div className="mb-2">
          <button type="button" onClick={onBack} className={UI.btnBack}>
            <IconChevronLeft /> Kembali
          </button>
        </div>

        <header className={`${UI.pageHeader} bg-white border border-slate-200 rounded-2xl px-4 py-4`}>
          <div className={UI.pageTitleBlock}>
            <h2 className={UI.pageTitle}>Pembelian & Pengeluaran</h2>
            <p className={UI.pageSubtitle}>Keuangan operasional · terpisah dari gudang & penjualan kasir</p>
            <p className="text-[10px] font-bold mt-2" style={{ color: THEME.teal }}>
              👤 {actorName}
            </p>
          </div>
          {!isFormOpen && (
            <button
              type="button"
              onClick={() => { setForm(emptyForm); setIsFormOpen(true); }}
              className={UI.btnPrimary}
            >
              <IconPlus /> Catat Baru
            </button>
          )}
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-white rounded-xl p-3 border border-slate-100">
            <p className="text-[8px] font-black text-slate-400 uppercase">Hari Ini</p>
            <p className="text-sm font-black" style={{ color: THEME.orange }}>{formatRp(stats.todayTotal)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-100">
            <p className="text-[8px] font-black text-slate-400 uppercase">Bulan Ini</p>
            <p className="text-sm font-black" style={{ color: THEME.teal }}>{formatRp(stats.monthTotal)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-100">
            <p className="text-[8px] font-black text-slate-400 uppercase">Pembelian</p>
            <p className="text-xs font-black text-slate-700">{formatRp(stats.pembelianMonth)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-100">
            <p className="text-[8px] font-black text-slate-400 uppercase">Pengeluaran</p>
            <p className="text-xs font-black text-slate-700">{formatRp(stats.pengeluaranMonth)}</p>
          </div>
        </div>

        {!isFormOpen && (
          <>
            <div className="flex flex-wrap gap-2 pb-2">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'pembelian', label: 'Pembelian' },
                { id: 'pengeluaran', label: 'Pengeluaran' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterType(f.id)}
                  className={filterType === f.id ? UI.filterActive : UI.filterIdle}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative mb-2">
              <input
                type="search"
                placeholder="Cari judul, supplier, catatan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={UI.search}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <IconSearch />
              </div>
            </div>
          </>
        )}

        {isFormOpen && (
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl border p-4 sm:p-5 space-y-3 shadow-lg"
            style={{ borderColor: `${THEME.teal}40` }}
          >
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: THEME.teal }}>
              {form.id ? 'Edit Catatan' : 'Catat Pembelian / Pengeluaran'}
            </p>

            <div className="grid grid-cols-2 gap-2">
              {['pembelian', 'pengeluaran'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      record_type: type,
                      category: type === 'pembelian' ? 'supplier_bahan' : 'lainnya',
                      link_stock: type === 'pembelian' ? prev.link_stock : false,
                    }))
                  }
                  className="py-2.5 rounded-xl text-[10px] font-black uppercase border"
                  style={
                    form.record_type === type
                      ? type === 'pembelian'
                        ? { background: THEME.tealLight, borderColor: THEME.teal, color: THEME.tealDark }
                        : { background: THEME.orangeLight, borderColor: THEME.orange, color: '#c2410c' }
                      : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8' }
                  }
                >
                  {type === 'pembelian' ? '📦 Pembelian' : '💸 Pengeluaran'}
                </button>
              ))}
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase">Kategori</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
              >
                {categoryOptions.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase">Judul / Keterangan *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Contoh: Beli tepung 50kg / Bayar listrik Mei"
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase">Supplier (opsional)</label>
                <input
                  value={form.supplier_name}
                  onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase">Nominal (Rp) *</label>
                <input
                  type="number"
                  min="1"
                  value={form.total}
                  onChange={(e) => setForm({ ...form, total: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-black font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase">Metode Bayar</label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {form.record_type === 'pembelian' && !form.id && (
              <div className="rounded-xl p-3 space-y-2" style={{ background: THEME.tealLight, border: `1px solid ${THEME.teal}30` }}>
                <label className="flex items-center gap-2 text-[10px] font-black uppercase" style={{ color: THEME.tealDark }}>
                  <input
                    type="checkbox"
                    checked={form.link_stock}
                    onChange={(e) => setForm({ ...form, link_stock: e.target.checked })}
                  />
                  Sekalian update stok gudang (Stock Manager)
                </label>
                {form.link_stock && (
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={form.stock_item_id}
                      onChange={(e) => setForm({ ...form, stock_item_id: e.target.value })}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                    >
                      <option value="">Pilih bahan...</option>
                      {stockItems.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.current_stock} {s.unit})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      placeholder="Qty masuk"
                      value={form.stock_qty}
                      onChange={(e) => setForm({ ...form, stock_qty: e.target.value })}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold"
                    />
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase">Catatan</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => { setIsFormOpen(false); setForm(emptyForm); }} className={UI.btnCancel}>
                Batal
              </button>
              <button type="submit" disabled={saving} className={UI.btnSubmit}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        )}

        {!isFormOpen && (
          <div className={`${UI.listWrap} pb-4`}>
            {loading ? (
              <p className="text-center text-slate-400 text-sm py-12 font-bold uppercase tracking-widest animate-pulse">Memuat...</p>
            ) : filtered.length === 0 ? (
              <div className={UI.emptyState}>
                <p className="text-slate-500 text-sm font-bold">Belum ada catatan</p>
                <p className="text-slate-400 text-xs mt-1">Tekan Catat Baru untuk mulai</p>
              </div>
            ) : (
              filtered.map((row) => (
                <div key={row.id} className={`${UI.listRow} justify-between flex-col sm:flex-row sm:items-center`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md"
                        style={
                          row.record_type === 'pembelian'
                            ? { background: THEME.tealLight, color: THEME.tealDark }
                            : { background: THEME.orangeLight, color: '#c2410c' }
                        }
                      >
                        {row.record_type === 'pembelian' ? 'Pembelian' : 'Pengeluaran'}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">
                        {getCategoryLabel(row.record_type, row.category)}
                      </span>
                      {row.stock_synced && (
                        <span className="text-[8px] font-black text-emerald-600">✓ Gudang</span>
                      )}
                    </div>
                    <p className="text-sm font-black text-slate-800 truncate">{row.title}</p>
                    {row.supplier_name && (
                      <p className="text-[11px] text-slate-500 font-medium">Supplier: {row.supplier_name}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatDateTime(row.created_at)} · {row.payment_method}
                      {row.cashier_name ? ` · ${row.cashier_name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-base font-black" style={{ color: THEME.orange }}>
                      {formatRp(row.total)}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setForm({
                          id: row.id,
                          record_type: row.record_type,
                          category: row.category,
                          title: row.title || '',
                          supplier_name: row.supplier_name || '',
                          total: String(row.total),
                          payment_method: row.payment_method || 'Tunai',
                          notes: row.notes || '',
                          link_stock: false,
                          stock_item_id: '',
                          stock_qty: '',
                        });
                        setIsFormOpen(true);
                      }}
                      className="text-[9px] font-black uppercase px-2 py-1.5 rounded-lg border border-slate-200 text-slate-600"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      className="text-[9px] font-black uppercase px-2 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
