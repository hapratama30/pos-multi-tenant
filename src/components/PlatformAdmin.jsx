// eslint-disable-next-line no-unused-vars
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function PlatformAdmin({ onBack }) {
  const [pin, setPin] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('platform_list_tenants', { p_pin: pin });
      if (rpcError) throw rpcError;
      setTenants(data || []);
      setAuthenticated(true);
    } catch (err) {
      setError(err.message || 'PIN tidak valid atau RPC belum dijalankan di Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (tenantId, suspend) => {
    try {
      const { error: rpcError } = await supabase.rpc('platform_update_tenant_status', {
        p_pin: pin,
        p_tenant_id: tenantId,
        p_status: suspend ? 'suspended' : 'active',
        p_reason: suspend ? 'Suspended by platform admin' : null,
      });
      if (rpcError) throw rpcError;
      loadTenants();
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePlanChange = async (tenantId, planId) => {
    try {
      const { error } = await supabase.from('tenant_subscriptions').upsert({
        tenant_id: tenantId,
        plan_id: planId,
        status: 'active',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id' });
      if (error) throw error;
      loadTenants();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
          <button onClick={onBack} className="text-[10px] font-black text-slate-400 uppercase mb-4">← Keluar</button>
          <h1 className="text-xl font-black text-slate-800 uppercase mb-2">Platform Admin</h1>
          <p className="text-xs text-slate-500 mb-4">Masukkan PIN platform (app_secrets.platform_admin_pin)</p>
          {error && <p className="text-xs text-rose-600 font-bold mb-3">{error}</p>}
          <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN Platform" className="w-full border rounded-xl px-4 py-3 font-bold mb-4" />
          <button onClick={loadTenants} disabled={loading || !pin} className="w-full py-3 bg-teal-600 text-white font-black rounded-xl text-xs uppercase">
            {loading ? 'Memverifikasi...' : 'Masuk Konsol'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="font-black uppercase text-sm">Platform Admin</h1>
          <p className="text-[10px] text-slate-400">{tenants.length} tenant terdaftar</p>
        </div>
        <button onClick={onBack} className="text-[10px] font-black uppercase bg-white/10 px-3 py-2 rounded-lg">Keluar</button>
      </header>
      <div className="p-4 space-y-3">
        {tenants.map((t) => (
          <div key={t.tenant_id} className="bg-white border rounded-2xl p-4">
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="font-black text-slate-800">{t.tenant_name}</p>
                <p className="text-[10px] font-mono text-slate-400">{t.tenant_id}</p>
                <p className="text-xs text-slate-500 mt-1">Plan: {t.plan_id} · Staff: {t.staff_count} · TX: {t.transaction_count}</p>
              </div>
              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${t.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{t.status}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <select defaultValue={t.plan_id} onChange={(e) => handlePlanChange(t.tenant_id, e.target.value)} className="text-[10px] font-bold border rounded-lg px-2 py-1">
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
              {t.status === 'active' ? (
                <button onClick={() => handleSuspend(t.tenant_id, true)} className="text-[10px] font-black uppercase bg-rose-50 text-rose-700 px-3 py-1 rounded-lg">Suspend</button>
              ) : (
                <button onClick={() => handleSuspend(t.tenant_id, false)} className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg">Aktifkan</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
