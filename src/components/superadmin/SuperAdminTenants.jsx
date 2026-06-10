import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { normalizeEnabledModules } from '../../config/platformModules';
import {
  fetchPlatformTenants,
  fetchSubscriptionPlans,
  whatsAppUrl,
} from '../../utils/platformAdmin';
import SuperAdminTenantDetail from './SuperAdminTenantDetail';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getSisaHari(currentPeriodEnd) {
  if (!currentPeriodEnd) return '—';
  const now = new Date();
  const end = new Date(currentPeriodEnd);
  const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endZero = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diffTime = endZero - nowZero;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Expired';
  return `${diffDays} hari`;
}

function PlanBadge({ planId }) {
  const colors = { free: 'bg-slate-100 text-slate-700', pro: 'bg-indigo-100 text-indigo-800', enterprise: 'bg-violet-100 text-violet-800' };
  return <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${colors[planId] || colors.free}`}>{planId}</span>;
}

export default function SuperAdminTenants({ showToast }) {
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');
  const [selectedTenant, setSelectedTenant] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tenantRows, planRows] = await Promise.all([fetchPlatformTenants(), fetchSubscriptionPlans()]);
      setTenants(tenantRows);
      setPlans(planRows);
      if (selectedTenant) {
        const fresh = tenantRows.find((t) => t.tenant_id === selectedTenant.tenant_id);
        if (fresh) setSelectedTenant(fresh);
      }
    } catch (err) {
      showToast?.(err.message || 'Gagal memuat tenant', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, selectedTenant]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tenants.filter((t) => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterPlan !== 'all' && t.plan_id !== filterPlan) return false;
      if (!q) return true;
      return (
        t.tenant_name?.toLowerCase().includes(q)
        || t.tenant_id?.toLowerCase().includes(q)
        || t.owner_email?.toLowerCase().includes(q)
        || t.owner_name?.toLowerCase().includes(q)
        || t.owner_phone?.includes(q)
      );
    });
  }, [tenants, search, filterStatus, filterPlan]);

  const summary = useMemo(() => ({
    total: tenants.length,
    active: tenants.filter((t) => t.status === 'active').length,
    proPlus: tenants.filter((t) => ['pro', 'enterprise'].includes(t.plan_id)).length,
    noPhone: tenants.filter((t) => !t.owner_phone).length,
  }), [tenants]);

  if (loading && tenants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-10 h-10 border-[3px] border-teal-100 border-t-teal-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 mt-4 font-medium">Memuat daftar tenant...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Tenant', value: summary.total, cls: 'text-slate-800' },
            { label: 'Aktif', value: summary.active, cls: 'text-emerald-700' },
            { label: 'Pro / Enterprise', value: summary.proPlus, cls: 'text-indigo-700' },
            { label: 'Perlu Follow-up HP', value: summary.noPhone, cls: 'text-amber-700' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200/80 px-4 py-3 shadow-sm">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold tabular-nums ${s.cls}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="Cari toko, email, HP..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button type="button" onClick={load} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50">Refresh</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {[{ id: 'all', label: 'Semua' }, { id: 'active', label: 'Aktif' }, { id: 'suspended', label: 'Suspended' }].map((f) => (
              <button key={f.id} type="button" onClick={() => setFilterStatus(f.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterStatus === f.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{f.label}</button>
            ))}
            <span className="w-px h-6 bg-slate-200 self-center" />
            {['all', 'free', 'pro', 'enterprise'].map((p) => (
              <button key={p} type="button" onClick={() => setFilterPlan(p)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${filterPlan === p ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700'}`}>{p === 'all' ? 'Semua paket' : p}</button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Toko</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Paket & Modul</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Vertikal</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Kontak</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-16 text-center text-slate-400">Tidak ada tenant ditemukan</td></tr>
                ) : filtered.map((t) => {
                  const wa = whatsAppUrl(t.owner_phone);
                  const modCount = normalizeEnabledModules(t.enabled_modules).length;
                  const effectiveStart = t.current_period_start || t.created_at;
                  const effectiveEnd = t.current_period_end || (() => {
                    if (t.plan_id === 'free') return null;
                    const d = new Date(t.created_at);
                    d.setDate(d.getDate() + 30);
                    return d.toISOString();
                  })();
                  return (
                    <tr key={t.tenant_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{t.tenant_name}</p>
                        <p className="text-[10px] font-mono text-slate-400">{t.tenant_id}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{t.staff_count} staff · {t.transaction_count} tx · {formatDate(t.created_at)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-1">
                          <PlanBadge planId={t.plan_id} />
                          {t.plan_id !== 'free' && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                              getSisaHari(effectiveEnd) === 'Expired' 
                                ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                                : 'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}>
                              {getSisaHari(effectiveEnd) === 'Expired' ? 'Expired' : `Tersisa ${getSisaHari(effectiveEnd)} lagi`}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold">{modCount} modul aktif</p>
                        {t.plan_id === 'free' ? (
                          <p className="text-[9px] text-slate-400 mt-1 font-medium">Daftar: {formatDate(t.created_at)}</p>
                        ) : (
                          <>
                            <p className="text-[9px] text-slate-400 mt-1 font-medium">Mulai: {formatDate(effectiveStart)}</p>
                            <p className="text-[9px] text-slate-400 font-medium">Expired: {formatDate(effectiveEnd)}</p>
                          </>
                        )}
                        {t.xendit_qris_status === 'Aktif' && <p className="text-[9px] text-emerald-600 font-semibold mt-1">Xendit ✓</p>}
                      </td>
                      <td className="px-5 py-4 capitalize text-xs font-semibold text-slate-600">{t.business_vertical || 'general'}</td>
                      <td className="px-5 py-4">
                        <p className="text-xs text-slate-600 truncate max-w-[140px]">{t.owner_email || '—'}</p>
                        {t.owner_phone ? (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] font-medium">{t.owner_phone}</span>
                            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded">WA</a>}
                          </div>
                        ) : <span className="text-[10px] text-amber-600">No HP</span>}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${t.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button type="button" onClick={() => setSelectedTenant(t)} className="text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 px-4 py-2 rounded-xl transition-colors">
                          Kelola →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
            {filtered.length} dari {tenants.length} tenant · klik <strong>Kelola</strong> untuk langganan, modul, limit & pembayaran
          </div>
        </div>
      </div>

      {selectedTenant && (
        <SuperAdminTenantDetail
          tenant={selectedTenant}
          plans={plans}
          onClose={() => setSelectedTenant(null)}
          onSaved={load}
          showToast={showToast}
        />
      )}
    </>
  );
}
