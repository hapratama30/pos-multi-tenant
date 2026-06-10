import React, { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { fetchPlatformStats, fetchPlatformTenants, formatRupiah, whatsAppUrl } from '../../utils/platformAdmin';

const PLAN_COLORS = { free: '#94a3b8', pro: '#6366f1', enterprise: '#8b5cf6', trialing: '#f59e0b' };

function KpiCard({ label, value, sub, icon, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
          <p className={`text-3xl font-bold mt-2 tabular-nums ${accent}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent.replace('text-', 'bg-').replace('-700', '-100').replace('-600', '-100')}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SuperAdminOverview({ showToast, onNavigateTenants }) {
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statData, tenantRows, gmvRes] = await Promise.all([
          fetchPlatformStats(),
          fetchPlatformTenants(),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/saas/gmv`).then(r => r.json()).catch(() => ({}))
        ]);
        if (!cancelled) {
          setStats({ ...statData, gmvData: gmvRes });
          setTenants(tenantRows || []);
        }
      } catch (err) {
        if (!cancelled) showToast?.(err.message || 'Gagal memuat dashboard', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showToast]);

  const planChart = useMemo(() => {
    const counts = { free: 0, pro: 0, enterprise: 0 };
    tenants.forEach((t) => {
      const p = t.plan_id || 'free';
      if (counts[p] !== undefined) counts[p] += 1;
      else counts.free += 1;
    });
    return [
      { name: 'Free', value: counts.free, color: PLAN_COLORS.free },
      { name: 'Pro', value: counts.pro, color: PLAN_COLORS.pro },
      { name: 'Enterprise', value: counts.enterprise, color: PLAN_COLORS.enterprise },
    ].filter((d) => d.value > 0);
  }, [tenants]);

  const recentTenants = useMemo(
    () => [...tenants].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6),
    [tenants],
  );

  const needsFollowUp = useMemo(
    () => tenants.filter((t) => !t.owner_phone && t.status === 'active').length,
    [tenants],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-10 h-10 border-[3px] border-teal-100 border-t-teal-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 mt-4 font-medium">Memuat dashboard...</p>
      </div>
    );
  }

  const total = stats?.total_tenants ?? 0;
  const active = stats?.active_tenants ?? 0;
  const suspended = stats?.suspended_tenants ?? 0;
  const regMonth = stats?.registrations_this_month ?? 0;

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {needsFollowUp > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 rounded-2xl bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 text-lg">📞</div>
            <div>
              <p className="text-sm font-semibold text-amber-900">{needsFollowUp} tenant belum punya nomor HP</p>
              <p className="text-xs text-amber-700/80">Tenant lama — follow-up manual via email jika perlu.</p>
            </div>
          </div>
          {onNavigateTenants && (
            <button
              type="button"
              onClick={onNavigateTenants}
              className="text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 px-4 py-2 rounded-xl transition-colors"
            >
              Lihat Tenant →
            </button>
          )}
        </div>
      )}

      {/* KPI row */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Total Tenant"
          value={total}
          sub={`${regMonth} pendaftaran bulan ini`}
          accent="text-teal-700"
          icon={
            <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
          }
        />
        <KpiCard
          label="Tenant Aktif"
          value={active}
          sub={total ? `${Math.round((active / total) * 100)}% dari total` : '—'}
          accent="text-emerald-700"
          icon={
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KpiCard
          label="Langganan Berbayar"
          value={(stats?.pro_subscribers ?? 0) + (stats?.enterprise_subscribers ?? 0)}
          sub={`Pro: ${stats?.pro_subscribers ?? 0} · Ent: ${stats?.enterprise_subscribers ?? 0}`}
          accent="text-indigo-700"
          icon={
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
        />
        <KpiCard
          label="Total Transaksi (GMV)"
          value={formatRupiah(stats?.gmvData?.gmv || 0)}
          sub="Platform Gross Merchandise Value"
          accent="text-emerald-700"
          icon={
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KpiCard
          label="Total Profit PPOB"
          value={formatRupiah(stats?.gmvData?.ppob_profit || 0)}
          sub="Keuntungan pasif dari margin PPOB"
          accent="text-amber-700"
          icon={
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Plan distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800">Distribusi Paket</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">Breakdown langganan tenant</p>
          {planChart.length > 0 ? (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={planChart} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {planChart.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [`${v} tenant`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {planChart.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 py-12 text-center">Belum ada data tenant</p>
          )}
        </div>

        {/* Pricing reference */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800">Paket Langganan</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">Referensi harga — ubah per tenant di menu Tenant</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { id: 'free', name: 'Free', price: 0, features: '1 outlet · 3 staff · 100 produk' },
              { id: 'pro', name: 'Pro', price: 99000, features: '3 outlet · 10 staff · Laporan & Xendit' },
              { id: 'enterprise', name: 'Enterprise', price: 299000, features: 'Unlimited · Semua modul' },
            ].map((plan) => (
              <div key={plan.id} className="rounded-xl border border-slate-100 p-4 bg-slate-50/50 hover:border-teal-200 transition-colors">
                <p className="text-xs font-bold text-teal-600 uppercase tracking-wide">{plan.name}</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{formatRupiah(plan.price)}<span className="text-xs font-normal text-slate-400">/bln</span></p>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{plan.features}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent registrations */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Pendaftaran Terbaru</h3>
            <p className="text-xs text-slate-500">Tenant yang baru mendaftar — siap di-follow up</p>
          </div>
          {onNavigateTenants && (
            <button type="button" onClick={onNavigateTenants} className="text-xs font-semibold text-teal-600 hover:text-teal-700">
              Lihat semua →
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Toko</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Owner</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Kontak</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Paket</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Daftar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTenants.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-slate-400">Belum ada tenant terdaftar</td></tr>
              ) : recentTenants.map((t) => {
                const wa = whatsAppUrl(t.owner_phone);
                return (
                  <tr key={t.tenant_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{t.tenant_name}</p>
                      <p className="text-[10px] font-mono text-slate-400">{t.tenant_id}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-slate-700">{t.owner_name || '—'}</p>
                      <p className="text-xs text-slate-400">{t.owner_email || '—'}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      {t.owner_phone ? (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600">{t.owner_phone}</span>
                          {wa && (
                            <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100">
                              WA
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Belum diisi</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700">{t.plan_id}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{formatDate(t.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
