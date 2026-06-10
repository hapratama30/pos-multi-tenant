import React, { useState, useEffect } from 'react';

export default function SuperAdminPPOB({ showToast }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedBrand, setExpandedBrand] = useState(null);
  const [settings, setSettings] = useState({
    api_username: '',
    api_key: '',
    global_markup: 500,
  });

  useEffect(() => {
    fetchSettings();
    fetchProducts();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ppob/settings`);
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings({
          api_username: data.settings.api_username || '',
          api_key: data.settings.api_key || '',
          global_markup: data.settings.global_markup || 0,
        });
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat pengaturan PPOB', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchProducts() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ppob/products-admin`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const handleSync = async () => {
    if (!settings.api_username || !settings.api_key) {
      showToast('Simpan konfigurasi API Key terlebih dahulu!', 'error');
      return;
    }
    
    setSyncing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ppob/sync-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd: 'prepaid' })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Berhasil menarik ${data.count} produk dari Digiflazz!`, 'success');
        fetchProducts(); // Refresh table
      } else {
        // Here we show the raw error from Digiflazz directly to Super Admin
        showToast(data.error || 'Gagal sinkronisasi data', 'error');
        alert(`Error Digiflazz: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan saat sync', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const toggleProduct = async (sku_code, currentStatus) => {
    try {
      // Optimistic update
      setProducts(products.map(p => p.sku_code === sku_code ? { ...p, is_active: !currentStatus } : p));
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ppob/toggle-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku_code, is_active: !currentStatus })
      });
      const data = await res.json();
      if (!data.success) {
        showToast('Gagal mengubah status produk', 'error');
        // Revert
        setProducts(products.map(p => p.sku_code === sku_code ? { ...p, is_active: currentStatus } : p));
      }
    } catch (err) {
      console.error(err);
      setProducts(products.map(p => p.sku_code === sku_code ? { ...p, is_active: currentStatus } : p));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ppob/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Pengaturan PPOB berhasil disimpan', 'success');
      } else {
        showToast(data.error || 'Gagal menyimpan pengaturan', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Memuat konfigurasi...</div>;
  }

  return (
    <div className="w-full space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-2">Konfigurasi Digiflazz</h2>
        <p className="text-sm text-slate-500 mb-6">
          Masukkan API Key dari Digiflazz untuk mengaktifkan fitur penjualan pulsa, token listrik, dan tagihan (PPOB) ke seluruh tenant.
        </p>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Username Digiflazz</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                placeholder="Misal: agrapos123"
                value={settings.api_username}
                onChange={(e) => setSettings({ ...settings, api_username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">API Key (Production / Dev)</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                placeholder="dev-xxxxx-xxxxx"
                value={settings.api_key}
                onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Global Markup Platform (Rp)</label>
            <p className="text-xs text-slate-500 mb-3">
              Keuntungan tetap platform Anda dari setiap transaksi PPOB yang dilakukan tenant.
              Harga modal tenant = Harga Asli Digiflazz + Global Markup.
            </p>
            <div className="relative max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 text-sm font-medium">Rp</span>
              <input
                type="number"
                min="0"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                value={settings.global_markup}
                onChange={(e) => setSettings({ ...settings, global_markup: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
        <h3 className="text-sm font-bold text-amber-800 mb-2">Informasi Webhook Digiflazz</h3>
        <p className="text-xs text-amber-700 leading-relaxed">
          Agar status transaksi (Sukses/Gagal/SN) dapat otomatis ter-update di aplikasi POS, Anda wajib mendaftarkan Webhook URL berikut ke panel Digiflazz Anda:
        </p>
        <code className="block mt-3 p-3 bg-white/60 border border-amber-200 rounded-xl text-xs text-slate-800 font-mono">
          https://[DOMAIN_BACKEND_ANDA]/api/ppob/webhook
        </code>
      </div>

      {/* Product Catalog Management */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Katalog Produk PPOB</h2>
            <p className="text-xs text-slate-500">Tarik data dari Digiflazz dan atur produk apa saja yang tampil di aplikasi Tenant.</p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {syncing ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Menarik Data...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Tarik & Sync dari Digiflazz
              </>
            )}
          </button>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Cari nama produk, kategori, brand..."
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {products.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-xl">
              Belum ada produk. Klik tombol "Tarik & Sync" di atas.
            </div>
          ) : (
            (() => {
              // Filter products
              const filtered = products.filter(p => 
                p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                p.brand.toLowerCase().includes(searchTerm.toLowerCase()) || 
                p.category.toLowerCase().includes(searchTerm.toLowerCase())
              );

              if (filtered.length === 0) {
                return (
                  <div className="p-8 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-xl">
                    Produk tidak ditemukan.
                  </div>
                );
              }

              // Group by category, then brand
              const grouped = filtered.reduce((acc, p) => {
                if (!acc[p.category]) acc[p.category] = {};
                if (!acc[p.category][p.brand]) acc[p.category][p.brand] = [];
                acc[p.category][p.brand].push(p);
                return acc;
              }, {});

              const getCategoryIcon = (cat) => {
                const lower = cat.toLowerCase();
                if (lower.includes('pulsa')) return <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>;
                if (lower.includes('data')) return <svg className="w-6 h-6 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>;
                if (lower.includes('e-money') || lower.includes('wallet')) return <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>;
                if (lower.includes('game')) return <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>;
                if (lower.includes('pln') || lower.includes('listrik')) return <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>;
                return <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>;
              };

              return Object.entries(grouped).map(([category, brands]) => (
                <div key={category} className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden transition-all hover:shadow-md">
                  <button 
                    onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                    className="w-full px-6 py-5 bg-gradient-to-r from-slate-50 to-white hover:from-indigo-50/30 flex justify-between items-center transition-all text-left border-b border-slate-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-slate-100 rounded-xl shadow-inner">
                        {getCategoryIcon(category)}
                      </div>
                      <div>
                        <span className="block font-bold text-slate-800 text-lg">{category}</span>
                        <span className="block text-xs text-slate-500 mt-0.5">{Object.keys(brands).length} Provider / Brand</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                        {Object.values(brands).flat().length} Produk
                      </span>
                      <div className={`p-1.5 rounded-full bg-slate-100 text-slate-500 transform transition-transform duration-300 ${expandedCategory === category ? 'rotate-180 bg-indigo-100 text-indigo-600' : ''}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </button>
                  
                  {expandedCategory === category && (
                    <div className="p-6 bg-slate-50/50 space-y-4">
                      {Object.entries(brands).map(([brand, items]) => (
                        <div key={brand} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                          <button 
                            onClick={() => setExpandedBrand(expandedBrand === brand ? null : brand)}
                            className="w-full px-5 py-4 hover:bg-slate-50 flex justify-between items-center transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase shadow-sm">
                                {brand.substring(0, 2)}
                              </div>
                              <span className="font-bold text-slate-700">{brand}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-medium text-slate-500">{items.length} produk</span>
                              <svg className={`w-4 h-4 text-slate-400 transform transition-transform ${expandedBrand === brand ? 'rotate-180 text-indigo-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                          </button>
                          
                          {expandedBrand === brand && (
                            <div className="p-0 border-t border-slate-100">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                  <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                                    <tr>
                                      <th className="px-5 py-3 border-b border-slate-200 w-24">Kode</th>
                                      <th className="px-5 py-3 border-b border-slate-200">Nama Produk</th>
                                      <th className="px-5 py-3 border-b border-slate-200 w-32 text-right">Harga Modal</th>
                                      <th className="px-5 py-3 border-b border-slate-200 w-32 text-center">Tampilkan?</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {items.map(p => (
                                      <tr key={p.sku_code} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="px-5 py-3 font-mono text-xs text-slate-400 group-hover:text-indigo-500 transition-colors">{p.sku_code}</td>
                                        <td className="px-5 py-3 font-medium text-slate-800">{p.product_name}</td>
                                        <td className="px-5 py-3 font-mono text-right font-semibold text-slate-700">Rp {Number(p.base_price).toLocaleString('id-ID')}</td>
                                        <td className="px-5 py-3 flex justify-center">
                                          <button
                                            onClick={() => toggleProduct(p.sku_code, p.is_active)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${p.is_active ? 'bg-teal-500 shadow-inner' : 'bg-slate-200'}`}
                                          >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${p.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ));
            })()
          )}
        </div>
      </div>
    </div>
  );
}
