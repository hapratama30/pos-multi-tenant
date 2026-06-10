// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { formatRupiah } from '../../utils/platformAdmin';

// ─── MINI DIALOG: TAMBAH PELANGGAN BARU ──────────────────────────────────────
export function AddCustomerDialog({ onClose, onSaved, tenantId }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Nama pelanggan wajib diisi!'); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('customers').insert([{
        tenant_id: tenantId, name: form.name.trim(),
        phone: form.phone.trim() || null, email: form.email.trim() || null, points: 0
      }]).select().single();
      if (error) throw error;
      onSaved(data);
    } catch (err) { setErr(err.message || 'Gagal menyimpan pelanggan'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden" style={{ border: '1px solid #d1ede8' }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: 'var(--pos-teal)', color: 'white' }}>
          <p className="text-xs font-black uppercase tracking-wider">👤 Tambah Pelanggan Baru</p>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xs font-bold">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-3">
          {err && <div className="bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-bold p-2.5 rounded-xl">{err}</div>}
          <div>
            <label className="block text-[9px] font-black uppercase mb-1" style={{ color: 'var(--pos-teal)' }}>Nama Lengkap *</label>
            <input type="text" placeholder="Contoh: Budi Santoso" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} className="pos-input" required />
          </div>
          <div>
            <label className="block text-[9px] font-black uppercase mb-1" style={{ color: 'var(--pos-teal)' }}>No. Telepon</label>
            <input type="text" placeholder="08xxxxxxxxxx" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value.replace(/[^0-9+]/g, '') })} className="pos-input" />
          </div>
          <div>
            <label className="block text-[9px] font-black uppercase mb-1" style={{ color: 'var(--pos-teal)' }}>Email (Opsional)</label>
            <input type="email" placeholder="email@contoh.com" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} className="pos-input" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase border border-slate-200 text-slate-500 hover:bg-slate-50 transition">Batal</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase text-white transition pos-btn-teal disabled:opacity-50">
              {saving ? '⏳ Menyimpan...' : '✅ Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── MINI DIALOG: TAMBAH PRODUK BARU ─────────────────────────────────────────
export function AddProductDialog({ onClose, onSaved, tenantId }) {
  const [form, setForm] = useState({ name: '', price: '', category: '', barcode: '' });
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('product_categories')
          .select('*')
          .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
          .order('id', { ascending: true });
        const filtered = data || [];
        setCategories(filtered);
        if (filtered.length > 0) setForm(prev => ({ ...prev, category: filtered[0].name }));
      // eslint-disable-next-line no-empty
      } catch { }
    })();
  }, [tenantId]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) { setErr('Nama dan harga wajib diisi!'); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('products').insert([{
        tenant_id: tenantId, name: form.name.trim(), price: Number(form.price) || 0,
        category: form.category || 'Umum', barcode: form.barcode.toUpperCase() || '',
        is_active: true, duration: 0, duration_type: 'Menit', unit: 'Pcs', min_qty: 1
      }]).select().single();
      if (error) throw error;
      onSaved(data);
    } catch (err) { setErr(err.message || 'Gagal menyimpan produk'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden" style={{ border: '1px solid #d1ede8' }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: 'var(--pos-teal)', color: 'white' }}>
          <p className="text-xs font-black uppercase tracking-wider">📦 Tambah Produk Baru</p>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xs font-bold">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-3">
          {err && <div className="bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-bold p-2.5 rounded-xl">{err}</div>}
          <div>
            <label className="block text-[9px] font-black uppercase mb-1" style={{ color: 'var(--pos-teal)' }}>Nama Produk *</label>
            <input type="text" placeholder="Contoh: Kopi Susu..." value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} className="pos-input" required />
          </div>
          <div>
            <label className="block text-[9px] font-black uppercase mb-1" style={{ color: 'var(--pos-teal)' }}>Harga (Rp) *</label>
            <input type="number" placeholder="0" value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })} className="pos-input" required />
          </div>
          <div>
            <label className="block text-[9px] font-black uppercase mb-1" style={{ color: 'var(--pos-teal)' }}>Kategori</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="pos-input">
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              {categories.length === 0 && <option value="Umum">Umum</option>}
            </select>
          </div>
          <div>
            <label className="block text-[9px] font-black uppercase mb-1" style={{ color: 'var(--pos-teal)' }}>Barcode / SKU (Opsional)</label>
            <input type="text" placeholder="KP-XXXXXX" value={form.barcode}
              onChange={e => setForm({ ...form, barcode: e.target.value.toUpperCase().replace(/[^0-9A-Z-]/g, '') })} className="pos-input" />
          </div>
          <p className="text-[8px] text-slate-400 font-bold">💡 Untuk detail lengkap silakan edit di halaman Katalog Produk.</p>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase border border-slate-200 text-slate-500 hover:bg-slate-50 transition">Batal</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase text-white transition pos-btn-teal disabled:opacity-50">
              {saving ? '⏳ Menyimpan...' : '✅ Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── MINI DIALOG: PPOB CHECKOUT ──────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
export function PPOBDialog({ onClose, category, tenantId, onAddToCart }) {
  const [phone, setPhone] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const fetchProducts = React.useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ppob/price-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd: 'prepaid' })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      // Filter by category
      let filtered = data.data || [];
      const lowerCat = category.toLowerCase();
      if (lowerCat.includes('pulsa')) {
        filtered = filtered.filter(p => p.category === 'Pulsa');
      } else if (lowerCat.includes('data')) {
        filtered = filtered.filter(p => p.category === 'Data');
      } else if (lowerCat.includes('pln')) {
        filtered = filtered.filter(p => p.category === 'PLN');
      } else if (lowerCat.includes('wallet')) {
        filtered = filtered.filter(p => p.category === 'E-Money');
      }
      setProducts(filtered);
    } catch (err) {
      setErr(err.message || 'Gagal memuat produk PPOB');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSelect = (product) => {
    if (!phone) {
      setErr('Masukkan nomor tujuan/pelanggan terlebih dahulu');
      return;
    }
    // Add to cart with special PPOB flags
    const ppobItem = {
      id: `ppob_${product.buyer_sku_code}`,
      name: product.product_name,
      price: product.price, // Harga jual dari Digiflazz + margin global
      is_ppob: true,
      ppob_sku: product.buyer_sku_code,
      ppob_target: phone,
      quantity: 1,
      variant_price_modifier: 0
    };
    onAddToCart(ppobItem);
    onClose();
  };

  const getProviderInfo = (phoneNumber) => {
    if (!phoneNumber || phoneNumber.length < 4) return null;
    const prefix = phoneNumber.substring(0, 4);
    if (['0811','0812','0813','0821','0822','0852','0853','0823','0851'].includes(prefix)) return { name: 'Telkomsel', color: 'text-red-600', bg: 'bg-red-50', logo: 'T' };
    if (['0814','0815','0816','0855','0856','0857','0858'].includes(prefix)) return { name: 'Indosat', color: 'text-yellow-600', bg: 'bg-yellow-50', logo: 'im3' };
    if (['0817','0818','0819','0859','0877','0878'].includes(prefix)) return { name: 'XL', color: 'text-blue-600', bg: 'bg-blue-50', logo: 'XL' };
    if (['0831','0832','0833','0838'].includes(prefix)) return { name: 'Axis', color: 'text-purple-600', bg: 'bg-purple-50', logo: 'AXIS' };
    if (['0895','0896','0897','0898','0899'].includes(prefix)) return { name: 'Tri', color: 'text-orange-600', bg: 'bg-orange-50', logo: '3' };
    if (['0881','0882','0883','0884','0885','0886','0887','0888','0889'].includes(prefix)) return { name: 'Smartfren', color: 'text-rose-600', bg: 'bg-rose-50', logo: 'sf' };
    return { name: 'Unknown', color: 'text-slate-600', bg: 'bg-slate-50', logo: '?' };
  };

  const provider = getProviderInfo(phone);

  return (
    <div className="fixed inset-0 z-[9999999] flex flex-col bg-slate-50 animate-in slide-in-from-right duration-300 overflow-hidden">
      {/* HEADER ALA GOPAY */}
      <div className="flex items-center justify-between px-4 py-4 bg-slate-50 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <h2 className="text-xl font-bold text-slate-800">{category}</h2>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors">
          <span className="text-xs font-bold text-slate-700">Eksplor data</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="max-w-xl mx-auto space-y-6 mt-2">
          
          {/* INPUT CARD ALA GOPAY */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="flex justify-between items-center relative z-10">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Nomor Tujuan</label>
                <input 
                  type="text" 
                  placeholder="Misal: 0856xxxx" 
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))} 
                  className="w-full text-2xl font-bold text-slate-800 outline-none bg-transparent placeholder-slate-300"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {provider && phone.length >= 4 && (
                  <div className={`px-3 py-1.5 rounded-xl font-black text-lg ${provider.bg} ${provider.color} uppercase tracking-tighter italic border border-current opacity-80`}>
                    {provider.logo}
                  </div>
                )}
                <div className="w-10 h-10 bg-green-100 text-green-700 rounded-xl flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
              </div>
            </div>
            {err && <p className="text-[10px] bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg font-bold mt-4 inline-block">{err}</p>}
            
            {/* Promo banner inside card */}
            <div className="mt-5 bg-green-50 rounded-xl p-3 flex items-center gap-3 border border-green-100">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">i</div>
              <p className="text-xs text-green-800 font-medium">Punya nomor pascabayar? Klik di sini <span className="float-right font-bold">→</span></p>
            </div>
          </div>

          {/* PRODUCT LIST ALA GOPAY */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-slate-500">Mencari penawaran terbaik...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {products.map((p, idx) => {
                // Extract "5rb", "10rb" etc from product_name for display
                const nominalMatch = p.product_name.match(/(\d+)\s*(rb|ribu|k|gb|mb)/i);
                const displayNominal = nominalMatch ? `${nominalMatch[1]}${nominalMatch[2].toLowerCase()}` : p.product_name.split(' ')[0];
                
                // Randomly add "Muraaah" tag for aesthetic
                const isCheap = idx === 1 || idx === 3 || idx === 6;

                return (
                  <button
                    key={p.buyer_sku_code}
                    onClick={() => handleSelect(p)}
                    className="relative bg-white rounded-3xl p-5 text-left shadow-sm border border-slate-100 hover:border-teal-500 hover:shadow-md transition-all group flex flex-col justify-between h-[120px]"
                  >
                    {isCheap && (
                      <div className="absolute -top-3 left-4 bg-amber-700 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-t-lg rounded-br-lg z-10 shadow-sm">
                        Muraaah
                      </div>
                    )}
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-slate-800 group-hover:text-teal-600 transition-colors">{displayNominal}</h3>
                      {p.category === 'Data' && (
                        <span className="bg-slate-100 text-slate-500 text-[10px] font-medium px-2 py-1 rounded-full">30 hari</span>
                      )}
                    </div>
                    <div>
                      {isCheap && <p className="text-[10px] text-slate-400 line-through mb-0.5">{formatRupiah(p.price + 2000)}</p>}
                      <p className={`text-base font-bold ${isCheap ? 'text-amber-700' : 'text-slate-800'}`}>
                        {formatRupiah(p.price)}
                      </p>
                    </div>
                  </button>
                );
              })}
              {products.length === 0 && phone.length > 3 && (
                <div className="col-span-2 sm:col-span-3 text-center py-10 bg-white rounded-3xl border border-slate-200 border-dashed">
                  <p className="text-slate-400 font-medium">Pilih provider atau masukkan nomor yang benar.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line no-unused-vars
export function PPOBInlineView({ onClose, category, tenantId, onAddToCart }) {
  const [phone, setPhone] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const fetchProducts = React.useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ppob/price-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd: 'prepaid' })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      let filtered = data.data || [];
      const lowerCat = category.toLowerCase();
      if (lowerCat.includes('pulsa')) {
        filtered = filtered.filter(p => p.category === 'Pulsa');
      } else if (lowerCat.includes('data')) {
        filtered = filtered.filter(p => p.category === 'Data');
      } else if (lowerCat.includes('pln')) {
        filtered = filtered.filter(p => p.category === 'PLN');
      } else if (lowerCat.includes('wallet') || lowerCat.includes('e-wallet')) {
        filtered = filtered.filter(p => p.category === 'E-Money');
      } else if (lowerCat.includes('pdam')) {
        filtered = filtered.filter(p => p.category === 'PDAM' || p.category === 'Gas Negara');
      } else if (lowerCat.includes('game')) {
        filtered = filtered.filter(p => p.category === 'Games');
      } else if (lowerCat.includes('lainnya')) {
        filtered = filtered.filter(p => !['Pulsa','Data','PLN','E-Money','PDAM','Games'].includes(p.category));
      }
      setProducts(filtered);
    } catch (err) {
      setErr(err.message || 'Gagal memuat produk PPOB');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSelect = (product) => {
    if (!phone) {
      setErr('Masukkan nomor tujuan/pelanggan terlebih dahulu');
      return;
    }
    const ppobItem = {
      id: `ppob_${product.buyer_sku_code}`,
      name: product.product_name,
      price: product.price,
      is_ppob: true,
      ppob_sku: product.buyer_sku_code,
      ppob_target: phone,
      quantity: 1,
      variant_price_modifier: 0
    };
    onAddToCart(ppobItem);
    onClose();
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full flex-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      {/* HEADER INLINE */}
      <div className="relative p-5 bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-500 text-white shrink-0">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        
        <div className="relative flex items-center justify-between z-10 mb-4">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white transition-all backdrop-blur-sm active:scale-95">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl drop-shadow-sm">⚡</span>
              <p className="text-sm font-black uppercase tracking-widest drop-shadow-md">Transaksi {category}</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-1">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Masukkan No. Tujuan / Pelanggan (Cth: 0812xxxx)" 
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))} 
              className="w-full bg-white/10 border border-white/30 text-white placeholder-teal-100/70 rounded-2xl px-5 py-3.5 text-lg font-black tracking-widest outline-none focus:bg-white/20 focus:border-white/50 focus:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all" 
              autoFocus
              required 
            />
          </div>
          {err && <p className="text-[10px] bg-rose-500/80 text-white px-3 py-1.5 rounded-lg font-bold mt-2 inline-block backdrop-blur-sm">{err}</p>}
        </div>
      </div>

      {/* PRODUCT LIST */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 pos-scroll">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Memuat Produk...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {products.map((p, idx) => (
              <button
                key={p.buyer_sku_code}
                onClick={() => handleSelect(p)}
                className="group relative bg-white p-3.5 rounded-2xl border border-slate-200 text-left hover:border-teal-400 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                style={{ animation: `slideUp 0.3s ease forwards ${idx * 0.03}s`, opacity: 0 }}
              >
                <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                <div className="absolute top-0 right-0 w-12 h-12 bg-teal-50 rounded-bl-full -z-0 group-hover:scale-150 transition-transform duration-500 ease-out"></div>
                <div className="relative z-10 flex justify-between items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 leading-tight group-hover:text-teal-700 transition-colors truncate">{p.product_name}</p>
                    <span className="inline-block mt-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-wider rounded-md border border-slate-200 group-hover:bg-teal-50 group-hover:text-teal-600 group-hover:border-teal-200 transition-colors">
                      {p.brand}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-teal-600 tracking-tight">{formatRupiah(p.price)}</p>
                  </div>
                </div>
              </button>
            ))}
            {products.length === 0 && (
              <div className="col-span-1 sm:col-span-2 py-10 text-center">
                <div className="text-3xl mb-2 opacity-20">📭</div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produk tidak tersedia</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
