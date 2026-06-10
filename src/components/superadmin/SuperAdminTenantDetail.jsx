import React, { useEffect, useMemo, useState } from 'react';
import {
  ALL_MODULES,
  BUSINESS_VERTICALS,
  MODULE_CATEGORIES,
  PLAN_PRESETS,
  normalizeEnabledModules,
} from '../../config/platformModules';
import {
  applyPlanPreset,
  formatRupiah,
  updateTenantLimits,
  updateTenantModules,
  updateTenantPlan,
  updateTenantStatus,
  whatsAppUrl,
} from '../../utils/platformAdmin';

const TABS = [
  { id: 'summary', label: 'Ringkasan' },
  { id: 'subscription', label: 'Langganan' },
  { id: 'modules', label: 'Modul' },
  { id: 'limits', label: 'Limit & Kuota' },
  { id: 'payment', label: 'Pembayaran' },
];

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SuperAdminTenantDetail({ tenant, plans, onClose, onSaved, showToast }) {
  const [tab, setTab] = useState('summary');
  const [busy, setBusy] = useState(false);
  const [vertical, setVertical] = useState(tenant?.business_vertical || 'general');
  const [enabledModules, setEnabledModules] = useState(() => normalizeEnabledModules(tenant?.enabled_modules));
  const [limits, setLimits] = useState({
    maxOutlets: tenant?.max_outlets_override ?? '',
    maxStaff: tenant?.max_staff_override ?? '',
    maxProducts: tenant?.max_products_override ?? '',
  });
  const [activeDays, setActiveDays] = useState(30);

  useEffect(() => {
    if (!tenant) return;
    setVertical(tenant.business_vertical || 'general');
    setEnabledModules(normalizeEnabledModules(tenant.enabled_modules));
    setLimits({
      maxOutlets: tenant.max_outlets_override ?? '',
      maxStaff: tenant.max_staff_override ?? '',
      maxProducts: tenant.max_products_override ?? '',
    });
    setTab('summary');
  }, [tenant]);

  const effectiveLimits = useMemo(() => ({
    outlets: tenant?.max_outlets_override ?? tenant?.max_outlets ?? 1,
    staff: tenant?.max_staff_override ?? tenant?.max_staff ?? 3,
    products: tenant?.max_products_override ?? tenant?.max_products ?? 100,
  }), [tenant]);

  const modulesByCategory = useMemo(() => {
    const map = {};
    MODULE_CATEGORIES.forEach((c) => { map[c.id] = ALL_MODULES.filter((m) => m.category === c.id); });
    return map;
  }, []);

  if (!tenant) return null;

  const wa = whatsAppUrl(tenant.owner_phone);
  const allEnabled = enabledModules.length === ALL_MODULES.length;

  const toggleModule = (id) => {
    setEnabledModules((prev) => {
      if (prev.includes(id)) return prev.filter((m) => m !== id);
      return [...prev, id];
    });
  };

  const enableAllModules = () => setEnabledModules(ALL_MODULES.map((m) => m.id));
  const applyPresetForPlan = (planId) => {
    const preset = PLAN_PRESETS[planId];
    if (preset) setEnabledModules([...preset.modules]);
  };

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
      showToast?.('Perubahan disimpan.');
      onSaved?.();
    } catch (err) {
      showToast?.(err.message || 'Gagal menyimpan', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveModules = () => run(async () => {
    const payload = allEnabled ? ['all'] : enabledModules;
    await updateTenantModules(tenant.tenant_id, vertical, payload);
  });

  const handleSaveLimits = () => run(async () => {
    await updateTenantLimits(tenant.tenant_id, {
      maxOutlets: limits.maxOutlets === '' ? null : Number(limits.maxOutlets),
      maxStaff: limits.maxStaff === '' ? null : Number(limits.maxStaff),
      maxProducts: limits.maxProducts === '' ? null : Number(limits.maxProducts),
    });
  });

  const handleApplyPlan = (planId, withModules) => run(async () => {
    if (withModules) {
      await applyPlanPreset(tenant.tenant_id, planId, true, activeDays);
    } else {
      await updateTenantPlan(tenant.tenant_id, planId, 'active', null, activeDays);
    }
  });

  const handleSuspend = async (suspend) => {
    if (suspend && !window.confirm('Suspend tenant ini? User tidak bisa login.')) return;
    setBusy(true);
    try {
      await updateTenantStatus(tenant.tenant_id, suspend);
      showToast?.(suspend ? 'Tenant disuspend.' : 'Tenant diaktifkan.');
      onSaved?.();
    } catch (err) {
      showToast?.(err.message || 'Gagal ubah status', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-label="Tutup" />
      <div className="relative w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right">
        {/* Header */}
        <div className="shrink-0 border-b border-slate-200 px-5 py-4 bg-slate-50">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Detail Tenant</p>
              <h2 className="text-lg font-bold text-slate-900 truncate">{tenant.tenant_name}</h2>
              <p className="text-[10px] font-mono text-slate-400 mt-0.5">{tenant.tenant_id}</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-200 text-slate-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg ${tenant.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{tenant.status}</span>
            <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800">{tenant.plan_id}</span>
            <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">{vertical}</span>
            <span className="text-[10px] font-medium text-slate-500 px-2.5 py-1">{enabledModules.length}/{ALL_MODULES.length} modul</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex gap-1 px-4 py-2 border-b border-slate-100 overflow-x-auto bg-white">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {tab === 'summary' && (
            <>
              <section className="rounded-xl border border-slate-200 p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Owner & Kontak</h3>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div><p className="text-slate-400 text-xs">Nama</p><p className="font-semibold">{tenant.owner_name || '—'}</p></div>
                  <div><p className="text-slate-400 text-xs">Email</p><p className="font-semibold break-all">{tenant.owner_email || '—'}</p></div>
                  <div><p className="text-slate-400 text-xs">HP / WhatsApp</p>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{tenant.owner_phone || '—'}</p>
                      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-1 rounded-md">WA</a>}
                    </div>
                  </div>
                  <div><p className="text-slate-400 text-xs">Terdaftar</p><p className="font-semibold">{formatDate(tenant.created_at)}</p></div>
                </div>
              </section>
              <section className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Metrik</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { l: 'Staff', v: tenant.staff_count },
                    { l: 'Transaksi', v: tenant.transaction_count },
                    { l: 'Modul aktif', v: enabledModules.length },
                  ].map((m) => (
                    <div key={m.l} className="text-center p-3 rounded-xl bg-slate-50">
                      <p className="text-2xl font-bold text-slate-800">{m.v}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">{m.l}</p>
                    </div>
                  ))}
                </div>
              </section>
              <div className="flex flex-wrap gap-2">
                {tenant.status === 'active' ? (
                  <button type="button" disabled={busy} onClick={() => handleSuspend(true)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-100 text-rose-700 hover:bg-rose-200 disabled:opacity-50">Suspend Tenant</button>
                ) : (
                  <button type="button" disabled={busy} onClick={() => handleSuspend(false)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50">Aktifkan Tenant</button>
                )}
              </div>
            </>
          )}

          {tab === 'subscription' && (
            <>
              <section className="rounded-xl border border-slate-200 p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Paket Saat Ini</h3>
                <p className="text-2xl font-bold text-slate-900 capitalize">{tenant.plan_id}</p>
                <p className="text-sm text-slate-500">Status langganan: <strong>{tenant.subscription_status}</strong></p>
                {tenant.trial_ends_at && <p className="text-sm text-amber-700">Trial berakhir: {formatDate(tenant.trial_ends_at)}</p>}
              </section>

              <section className="rounded-xl border border-slate-200 p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">⚙️ Pengaturan Durasi Masa Aktif</h3>
                <div>
                  <label className="text-xs text-slate-600 font-semibold">Durasi Aktif Paket Baru (Hari):</label>
                  <input
                    type="number"
                    min="1"
                    value={activeDays}
                    onChange={(e) => setActiveDays(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold focus:border-teal-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                    Saat memperbarui paket di bawah, masa aktif baru akan disetel sesuai dengan durasi hari ini.
                  </p>
                </div>
              </section>
              <section className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ubah Paket</h3>
                {(plans.length ? plans : Object.keys(PLAN_PRESETS).map((id) => ({ id, name: id }))).map((p) => (
                  <div key={p.id} className={`rounded-xl border p-4 ${tenant.plan_id === p.id ? 'border-teal-300 bg-teal-50/50' : 'border-slate-200'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-900 capitalize">{p.name || p.id}</p>
                        <p className="text-xs text-slate-500">{PLAN_PRESETS[p.id]?.modules.length || '—'} modul default · {formatRupiah(p.price_monthly || PLAN_PRESETS[p.id]?.limits ? (p.id === 'pro' ? 99000 : p.id === 'enterprise' ? 299000 : 0) : 0)}/bln</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" disabled={busy} onClick={() => handleApplyPlan(p.id, false)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50">Paket saja</button>
                        <button type="button" disabled={busy} onClick={() => handleApplyPlan(p.id, true)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">Paket + Modul</button>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="text-xs font-bold text-amber-800 uppercase mb-2">Trial Pro</h3>
                <button type="button" disabled={busy} onClick={() => run(async () => {
                  const ends = new Date(); ends.setDate(ends.getDate() + 14);
                  await updateTenantPlan(tenant.tenant_id, 'pro', 'trialing', ends.toISOString());
                  await applyPlanPreset(tenant.tenant_id, 'pro', true);
                })} className="text-xs font-semibold px-4 py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">
                  Aktifkan Trial Pro 14 Hari (+ modul Pro)
                </button>
              </section>
            </>
          )}

          {tab === 'modules' && (
            <>
              <div className="flex flex-wrap gap-2">
                <select value={vertical} onChange={(e) => setVertical(e.target.value)} className="text-sm border border-slate-200 rounded-xl px-3 py-2 font-semibold">
                  {BUSINESS_VERTICALS.map((v) => <option key={v.id} value={v.id}>{v.icon} {v.label}</option>)}
                </select>
                <button type="button" onClick={enableAllModules} className="text-xs font-semibold px-3 py-2 rounded-xl bg-violet-100 text-violet-800">Aktifkan Semua</button>
                {['free', 'pro', 'enterprise'].map((pid) => (
                  <button key={pid} type="button" onClick={() => applyPresetForPlan(pid)} className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 text-slate-700 capitalize">Preset {pid}</button>
                ))}
              </div>
              {MODULE_CATEGORIES.map((cat) => (
                <section key={cat.id} className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-800">{cat.label}</p>
                    <p className="text-xs text-slate-500">{cat.desc}</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {modulesByCategory[cat.id]?.map((mod) => {
                      const on = enabledModules.includes(mod.id);
                      return (
                        <label key={mod.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50">
                          <input type="checkbox" checked={on} onChange={() => toggleModule(mod.id)} className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                          <span className="text-lg">{mod.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{mod.label}</p>
                            <p className="text-xs text-slate-500">{mod.desc}</p>
                          </div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">min {mod.minPlan}</span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))}
              <button type="button" disabled={busy} onClick={handleSaveModules} className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50">
                {busy ? 'Menyimpan...' : 'Simpan Konfigurasi Modul'}
              </button>
            </>
          )}

          {tab === 'limits' && (
            <>
              <section className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Kuota Efektif (paket + override)</h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { l: 'Max Outlet', v: effectiveLimits.outlets },
                    { l: 'Max Staff', v: effectiveLimits.staff },
                    { l: 'Max Produk', v: effectiveLimits.products },
                  ].map((m) => (
                    <div key={m.l} className="p-3 rounded-xl bg-slate-50">
                      <p className="text-xl font-bold">{m.v}</p>
                      <p className="text-[10px] text-slate-500 uppercase">{m.l}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">Kosongkan override untuk kembali ke limit default paket.</p>
              </section>
              <section className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Override Limit (opsional)</h3>
                {[
                  { key: 'maxOutlets', label: 'Max Outlet' },
                  { key: 'maxStaff', label: 'Max Staff' },
                  { key: 'maxProducts', label: 'Max Produk' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-slate-600">{label}</label>
                    <input
                      type="number"
                      min="0"
                      placeholder={`Default: ${tenant[`max_${key.replace('max', '').toLowerCase()}`] || '—'}`}
                      value={limits[key]}
                      onChange={(e) => setLimits((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full mt-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                ))}
              </section>
              <button type="button" disabled={busy} onClick={handleSaveLimits} className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-50">
                {busy ? 'Menyimpan...' : 'Simpan Override Limit'}
              </button>
            </>
          )}

          {tab === 'payment' && (
            <section className="rounded-xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Xendit Payment Gateway</h3>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div><p className="text-slate-400 text-xs">Merchant ID</p><p className="font-mono text-xs font-semibold break-all">{tenant.xendit_merchant_id || 'Belum terdaftar'}</p></div>
                <div><p className="text-slate-400 text-xs">Status QRIS</p><p className="font-semibold">{tenant.xendit_qris_status}</p></div>
                <div><p className="text-slate-400 text-xs">Status VA</p><p className="font-semibold">{tenant.xendit_va_status}</p></div>
                <div><p className="text-slate-400 text-xs">Modul xendit</p><p className="font-semibold">{enabledModules.includes('xendit') ? '✅ Diaktifkan' : '❌ Nonaktif'}</p></div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-100">
                Aktifkan modul <strong>xendit</strong> di tab Modul agar tenant bisa mengajukan QRIS/VA. Proses KYC tetap melalui Xendit setelah sub-akun dibuat.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
