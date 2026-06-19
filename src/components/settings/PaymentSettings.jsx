/*eslint-disable*/
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { registerXenditTenant, getXenditStaticQR, getXenditFixedVAs } from '../../utils/api';
import QrisStandarFrame from './QrisStandarFrame';

// ─── ICONS ────────────────────────────────────────────────────────────────────
const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);
const IconPlus = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconTrash = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6" /><path d="M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const BANK_LIST = ['BCA', 'BNI', 'BRI', 'Mandiri', 'CIMB Niaga', 'Permata', 'Danamon', 'BTN', 'Maybank', 'OCBC', 'Lainnya'];
const EWALLET_LIST = ['GoPay', 'Dana', 'OVO', 'ShopeePay', 'LinkAja', 'Jenius', 'Lainnya'];

const TABS = [
  { key: 'saklar', label: '⚙️ Channel Aktif', color: 'teal' },
  { key: 'qris', label: '📱 QRIS Xendit', color: 'emerald' },
  { key: 'va', label: '🏦 Virtual Account', color: 'blue' },
  { key: 'transfer', label: '💳 Transfer Bank', color: 'indigo' },
  { key: 'ewallet', label: '📲 e-Wallet', color: 'purple' },
  { key: 'settlements', label: '💰 Pencairan QRIS & VA', color: 'orange' },
];

// ─── EMPTY STATE PLACEHOLDER ──────────────────────────────────────────────────
function EmptySlot({ icon, label, hint }) {
  return (
    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
      <p className="text-3xl mb-2">{icon}</p>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-[10px] text-slate-300 font-bold mt-1">{hint}</p>
    </div>
  );
}

// SettleConfirmModal removed (simulations cleaned up)

// ─── CUSTOM ALERT MODAL ──────────────────────────────────────────────────────
function CustomAlertModal({ show, title, message, type, onClose }) {
  if (!show) return null;
  const isError = type === 'error';
  const icon = isError ? '⚠️' : '✅';
  const iconBg = isError ? 'linear-gradient(135deg, #fff5f5, #ffe3e3)' : 'linear-gradient(135deg, #f0fdf4, #dcfce7)';
  const iconBorder = isError ? '#fecaca' : '#bbf7d0';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        animation: 'fadeInOverlay 0.2s ease'
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUpModal { from { opacity: 0; transform: translateY(24px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '24px',
          padding: '32px 28px 28px',
          maxWidth: '380px',
          width: '100%',
          boxShadow: '0 32px 64px rgba(15,23,42,0.2), 0 0 0 1px rgba(15,23,42,0.05)',
          animation: 'slideUpModal 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          textAlign: 'center'
        }}
      >
        <div style={{
          width: '64px', height: '64px',
          background: iconBg,
          borderRadius: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '28px',
          border: `1px solid ${iconBorder}`
        }}>
          {icon}
        </div>
        <h3 style={{
          margin: '0 0 8px',
          fontSize: '18px',
          fontWeight: 900,
          color: '#0f172a',
          letterSpacing: '-0.02em',
          textTransform: 'uppercase'
        }}>
          {title}
        </h3>
        <p style={{
          margin: '0 0 28px',
          fontSize: '13px',
          color: '#64748b',
          fontWeight: 500,
          lineHeight: 1.6
        }}>
          {message}
        </p>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '13px 0',
            background: isError ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            border: 'none',
            borderRadius: '14px',
            fontWeight: 900,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            cursor: 'pointer',
            boxShadow: isError ? '0 8px 20px rgba(239,68,68,0.3)' : '0 8px 20px rgba(16,185,129,0.3)'
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}

// ─── DYNAMIC PAYMENT ROW ──────────────────────────────────────────────────────
function PayRow({ item, index, onUpdate, onRemove, selectKey, selectOptions, selectLabel }) {
  return (
    <div className="flex gap-2 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 group">
      <div className="text-[9px] font-black text-slate-300 w-4 shrink-0 text-center">{index + 1}</div>
      <select
        value={item[selectKey]}
        onChange={e => onUpdate(index, selectKey, e.target.value)}
        className="bg-white border border-slate-200 rounded-xl px-2.5 py-2.5 text-[10px] font-black text-slate-700 outline-none focus:border-teal-500 transition-colors shrink-0 w-28"
      >
        {selectOptions.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <input
        type="text"
        value={item.number}
        onChange={e => onUpdate(index, 'number', e.target.value)}
        placeholder="Nomor"
        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[10px] font-mono font-bold text-slate-700 outline-none focus:border-teal-500 transition-colors min-w-0"
      />
      <input
        type="text"
        value={item.name}
        onChange={e => onUpdate(index, 'name', e.target.value)}
        placeholder="Atas Nama"
        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[10px] font-bold text-slate-700 outline-none focus:border-teal-500 transition-colors min-w-0"
      />
      <button
        onClick={() => onRemove(index)}
        className="p-2.5 bg-rose-50 text-rose-400 rounded-xl hover:bg-rose-100 hover:text-rose-600 transition-all shrink-0 border border-rose-100 opacity-0 group-hover:opacity-100"
      >
        <IconTrash />
      </button>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function PaymentSettings({ tenantId, selectedOutletId, onBack, onTriggerUpgrade }) {
  const [activeTab, setActiveTab] = useState('saklar');

  // Saklar channel
  const [methods, setMethods] = useState({
    cash: true,
    qris: false,
    virtual_account: false,
    transfer_bank: false,
    ewallet: false,
  });

  // Dynamic payment info
  const [vaNumbers, setVaNumbers] = useState([]);   // [{bank, number, name}]
  const [transferBanks, setTransferBanks] = useState([]);   // [{bank, number, name}]
  const [ewalletNumbers, setEwalletNumbers] = useState([]); // [{provider, number, name}]

  // Xendit (QRIS)
  const [businessName, setBusinessName] = useState('');
  const [emailBisnis, setEmailBisnis] = useState('');
  const [xenditAccountId, setXenditAccountId] = useState('');
  const [xenditVaStatus, setXenditVaStatus] = useState('Belum Terdaftar');
  const [xenditQrisStatus, setXenditQrisStatus] = useState('Belum Terdaftar');
  const [activationUrl, setActivationUrl] = useState('');
  const [manualAccountId, setManualAccountId] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // Settlement Tracking States
  const [settlementTx, setSettlementTx] = useState([]);
  const [settleLoading, setSettleLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info' });

  const [staticQrString, setStaticQrString] = useState('');
  const [fixedVAs, setFixedVAs] = useState([]);
  const [loadingVA, setLoadingVA] = useState(false);
  const [qrisNmid, setQrisNmid] = useState('');
  const [qrisTid, setQrisTid] = useState('');
  
  // Modul check
  const [hasXenditModule, setHasXenditModule] = useState(false);

  useEffect(() => {
    if (xenditAccountId && xenditAccountId !== 'ID-AGRAPOS-BYPASS') {
      getXenditStaticQR({ tenantId })
        .then(res => {
          if (res.success && res.qrString) {
            setStaticQrString(res.qrString);
          }
        })
        .catch(err => {
          console.error('Error fetching static QRIS string:', err);
        });

      setLoadingVA(true);
      getXenditFixedVAs({ tenantId })
        .then(res => {
          if (res.success && res.vas) {
            setFixedVAs(res.vas);
          }
        })
        .catch(err => {
          console.error('Error fetching fixed VAs:', err);
        })
        .finally(() => setLoadingVA(false));
    } else {
      setStaticQrString('');
      setFixedVAs([]);
    }
  }, [xenditAccountId, tenantId]);

  // ─── FETCH ────────────────────────────────────────────────────────────────
  const fetchPaymentData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch settings (menggunakan kolom boolean relasional)
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('outlet_id', selectedOutletId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setMethods({
          cash: data.payment_cash_enabled !== false,
          qris: data.payment_qris_enabled === true,
          virtual_account: data.payment_va_enabled === true,
          transfer_bank: data.payment_transfer_enabled === true,
          ewallet: data.payment_ewallet_enabled === true,
        });
        setXenditAccountId(data.xendit_merchant_id || '');
        setXenditVaStatus(data.xendit_va_status || 'Belum Terdaftar');
        setXenditQrisStatus(data.xendit_qris_status || 'Belum Terdaftar');
        setQrisNmid(data.qris_nmid || 'ID1020304050607');
        setQrisTid(data.qris_tid || 'A01');
      }

      // Selalu fetch modules dari tenant untuk mengecek akses QRIS
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('tenant_name, enabled_modules')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (tenantData) {
        if (!selectedOutletId) {
          setBusinessName(tenantData.tenant_name || '');
        }
        const modules = tenantData.enabled_modules || [];
        setHasXenditModule(modules.includes('xendit') || modules.includes('all'));
      }

      if (selectedOutletId) {
        const { data: outletData } = await supabase
          .from('outlets')
          .select('name')
          .eq('tenant_id', tenantId)
          .eq('id', selectedOutletId)
          .maybeSingle();
        if (outletData) {
          setBusinessName(outletData.name || '');
        }
      }

      // Fetch accounts secara relasional
      const { data: accounts, error: accountsErr } = await supabase
        .from('payment_accounts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('outlet_id', selectedOutletId);

      if (accountsErr) throw accountsErr;
      if (accounts) {
        setVaNumbers(accounts.filter(a => a.type === 'va').map(a => ({ bank: a.provider, number: a.number, name: a.name })));
        setTransferBanks(accounts.filter(a => a.type === 'transfer').map(a => ({ bank: a.provider, number: a.number, name: a.name })));
        setEwalletNumbers(accounts.filter(a => a.type === 'ewallet').map(a => ({ provider: a.provider, number: a.number, name: a.name })));
      } else {
        setVaNumbers([]);
        setTransferBanks([]);
        setEwalletNumbers([]);
      }
    } catch (err) {
      console.error('Gagal mengambil data payment:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, selectedOutletId]);

  useEffect(() => { fetchPaymentData(); }, [fetchPaymentData]);

  // ─── HANDLERS ─────────────────────────────────────────────────────────────
  const toggleMethod = (key) => setMethods(prev => ({ ...prev, [key]: !prev[key] }));

  const addVA = () => setVaNumbers(p => [...p, { bank: 'BCA', number: '', name: '' }]);
  const removeVA = (i) => setVaNumbers(p => p.filter((_, idx) => idx !== i));
  const updateVA = (i, field, val) => setVaNumbers(p => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const addTransfer = () => setTransferBanks(p => [...p, { bank: 'BCA', number: '', name: '' }]);
  const removeTransfer = (i) => setTransferBanks(p => p.filter((_, idx) => idx !== i));
  const updateTransfer = (i, field, val) => setTransferBanks(p => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const addEwallet = () => setEwalletNumbers(p => [...p, { provider: 'GoPay', number: '', name: '' }]);
  const removeEwallet = (i) => setEwalletNumbers(p => p.filter((_, idx) => idx !== i));
  const updateEwallet = (i, field, val) => setEwalletNumbers(p => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  // ─── SAVE ALL ─────────────────────────────────────────────────────────────
  const saveAll = async () => {
    setSaving(true);
    setMsg(null);
    try {
      // 1. Simpan settings boolean channel pembayaran ke payment_settings
      const { error: settingsErr } = await supabase.from('payment_settings').upsert({
        tenant_id: tenantId,
        outlet_id: selectedOutletId,
        payment_cash_enabled: methods.cash,
        payment_qris_enabled: methods.qris,
        payment_va_enabled: methods.virtual_account,
        payment_transfer_enabled: methods.transfer_bank,
        payment_ewallet_enabled: methods.ewallet,
        qris_nmid: qrisNmid,
        qris_tid: qrisTid,
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id,outlet_id' });
      if (settingsErr) throw settingsErr;

      // 2. Simpan daftar rekening (delete yang lama, insert yang baru)
      const { error: deleteErr } = await supabase
        .from('payment_accounts')
        .delete()
        .eq('tenant_id', tenantId);
      if (deleteErr) throw deleteErr;

      const accountsToInsert = [
        ...vaNumbers.map(v => ({ tenant_id: tenantId, type: 'va', provider: v.bank, number: v.number, name: v.name })),
        ...transferBanks.map(t => ({ tenant_id: tenantId, type: 'transfer', provider: t.bank, number: t.number, name: t.name })),
        ...ewalletNumbers.map(e => ({ tenant_id: tenantId, type: 'ewallet', provider: e.provider, number: e.number, name: e.name }))
      ];

      if (accountsToInsert.length > 0) {
        const { error: insertErr } = await supabase
          .from('payment_accounts')
          .insert(accountsToInsert);
        if (insertErr) throw insertErr;
      }

      setMsg({ type: 'success', text: 'Konfigurasi pembayaran berhasil disimpan! Data tersinkron ke nota & struk.' });
      setTimeout(() => setMsg(null), 4000);
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Gagal menyimpan konfigurasi.' });
    } finally {
      setSaving(false);
    }
  };

  // ─── XENDIT REGISTER ──────────────────────────────────────────────────────
  const handleRegisterXenPlatform = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!businessName.trim()) { setMsg({ type: 'error', text: 'Nama Usaha tidak boleh kosong!' }); return; }
    if (!emailBisnis) { setMsg({ type: 'error', text: 'Masukkan email operasional!' }); return; }
    if (!tenantId) { setMsg({ type: 'error', text: 'Tenant ID tidak tersedia. Login ulang.' }); return; }
    setSaving(true);
    setMsg(null);
    try {
      const result = await registerXenditTenant({
        tenantId,
        businessName: businessName.trim(),
        emailBisnis: emailBisnis.trim(),
      });
      
      const accId = result.xenditAccountId || '';
      
      if (accId) {
        // Direct frontend write fallback
        await supabase
          .from('payment_settings')
          .upsert(
            {
              tenant_id: tenantId,
              outlet_id: selectedOutletId,
              xendit_merchant_id: accId,
              xendit_va_status: 'Diproses',
              xendit_qris_status: 'Diproses',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'tenant_id,outlet_id' }
          );
      }

      setXenditAccountId(accId);
      setXenditVaStatus('Diproses');
      setXenditQrisStatus('Diproses');
      setActivationUrl(result.activationUrl || '');
      setMsg({ type: 'success', text: result.message || 'Sub-akun Xendit berhasil dibuat!' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // handleSimulateActive removed (simulations cleaned up)
  const handleLinkManualAccount = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!manualAccountId.trim()) { setMsg({ type: 'error', text: 'Account ID tidak boleh kosong!' }); return; }
    if (!tenantId) { setMsg({ type: 'error', text: 'Tenant ID tidak tersedia.' }); return; }
    setSaving(true);
    setMsg(null);
    try {
      const trimmedId = manualAccountId.trim();
      await supabase.from('payment_settings').upsert({
        tenant_id: tenantId,
        outlet_id: selectedOutletId,
        xendit_merchant_id: trimmedId,
        xendit_va_status: 'Diproses',
        xendit_qris_status: 'Diproses',
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id,outlet_id' });

      setXenditAccountId(trimmedId);
      setXenditVaStatus('Diproses');
      setXenditQrisStatus('Diproses');
      setMsg({ type: 'success', text: `Berhasil menghubungkan Xendit Account ID: ${trimmedId}!` });
      setManualAccountId('');
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Gagal menghubungkan Account ID.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectXendit = async () => {
    if (!window.confirm('Apakah Anda yakin ingin memutuskan hubungan akun Xendit Anda?')) return;
    setSaving(true);
    setMsg(null);
    try {
      await supabase.from('payment_settings').upsert({
        tenant_id: tenantId,
        outlet_id: selectedOutletId,
        xendit_merchant_id: null,
        xendit_va_status: 'Belum Terdaftar',
        xendit_qris_status: 'Belum Terdaftar',
        payment_qris_enabled: false,
        payment_va_enabled: false,
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id,outlet_id' });

      setXenditAccountId('');
      setXenditVaStatus('Belum Terdaftar');
      setXenditQrisStatus('Belum Terdaftar');
      setMethods(prev => ({ ...prev, qris: false, virtual_account: false }));
      setMsg({ type: 'success', text: 'Koneksi Xendit berhasil diputuskan.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Gagal memutuskan koneksi.' });
    } finally {
      setSaving(false);
    }
  };

  // ─── SETTLEMENT TRACKING ──────────────────────────────────────────────────
  const fetchSettlements = useCallback(async () => {
    if (!tenantId) return;
    setSettleLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, created_at, payment_method, total, settlement_status, settled_at, invoice_number')
        .eq('tenant_id', tenantId)
        .in('payment_method', ['QRIS', 'Virtual Account'])
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSettlementTx(data || []);
    } catch (err) {
      console.error('Gagal memuat data pencairan:', err.message);
    } finally {
      setSettleLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (activeTab === 'settlements') {
      fetchSettlements();
    }
  }, [activeTab, fetchSettlements]);

  // executeSettlement and handleSimulateSettlement removed (simulations cleaned up)
  const renderXenditRegistrationForm = () => {
    return (
      <div className="space-y-4 border-t pt-4 border-slate-100">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">🚀 Daftarkan Merchant Baru ke Xendit</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Usaha / Cabang</label>
            <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
              placeholder="Contoh: Laundry Bersih Cabang 2" className="pay-input" required />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Operasional</label>
            <input type="email" value={emailBisnis} onChange={e => setEmailBisnis(e.target.value)}
              placeholder="contoh: toko@gmail.com" className="pay-input" required />
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={handleRegisterXenPlatform} disabled={saving}
            className="w-full py-4 rounded-[1.75rem] bg-teal-600 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-teal-100 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50">
            {saving ? '⏳ Menghubungi API Xendit...' : '🚀 Daftarkan Akun Xendit'}
          </button>
        </div>

        {/* HUBUNGKAN ID MANUAL */}
        <div className="border-t border-dashed pt-4 border-slate-200 mt-2 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">🔗 ATAU Hubungkan Xendit Sub-Account ID yang Sudah Ada</p>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Xendit Sub-Account ID (Mulai dengan '6a...')</label>
              <input type="text" value={manualAccountId} onChange={e => setManualAccountId(e.target.value)}
                placeholder="Contoh: 6afd31abd487c64364c0c5e8" className="pay-input" />
            </div>
            <button type="button" onClick={handleLinkManualAccount} disabled={saving}
              className="py-4 px-6 rounded-[1.75rem] bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50 shrink-0">
              Hubungkan ID
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── LOADING STATE ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="pb-32 bg-[#F8FAFC] min-h-screen font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Membuka Sistem Pembayaran...</p>
        </div>
      </div>
    );
  }

  const totalActive = Object.values(methods).filter(Boolean).length;
  const totalRekening = vaNumbers.length + transferBanks.length + ewalletNumbers.length;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="pb-32 bg-[#F8FAFC] min-h-screen font-sans">
      <style>{`
        .pay-input {
          background: #f8fafc; border: 1px solid rgba(226,232,240,0.8); border-radius: 1rem;
          padding: 0.9rem 1rem; font-size: 0.875rem; font-weight: 700; outline: none;
          width: 100%; color: #334155; transition: all 0.2s;
        }
        .pay-input:focus { border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13,148,136,0.1); background: white; }
        .pay-card { background: white; border: 1px solid rgba(226,232,240,0.6); border-radius: 2rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .pay-row-add { cursor: pointer; transition: all 0.15s; }
        .pay-row-add:hover { opacity: 0.85; transform: translateY(-1px); }
      `}</style>

      <div className="px-4 sm:px-6 pt-6 space-y-6">

        {/* BACK BUTTON */}
        <div>
          <button onClick={onBack} className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-3.5 rounded-[1.5rem] shadow-sm text-[10px] font-black text-slate-800 active:scale-95 transition-all uppercase tracking-widest hover:border-slate-300">
            <IconChevronLeft /> Kembali
          </button>
        </div>

        {/* PAGE HEADER */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight uppercase">
              Metode Pembayaran
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
              Konfigurasi channel & info rekening per toko — tersinkron ke nota & struk
            </p>
          </div>
          <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl font-mono text-xs text-slate-700 font-black shrink-0 shadow-sm">
            TENANT: {tenantId}
          </div>
        </header>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Channel Aktif */}
          <div className="bg-white p-4 rounded-[2rem] border border-slate-200/60 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 bg-teal-50 rounded-xl flex items-center justify-center text-xl border border-teal-100 shrink-0">⚙️</div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Channel Aktif</span>
              <p className="text-2xl font-black text-teal-700 leading-none mt-0.5">{totalActive}<span className="text-xs text-slate-300 font-bold"> /5</span></p>
            </div>
          </div>
          {/* QRIS Status */}
          {hasXenditModule && (
            <div className={`bg-white p-4 rounded-[2rem] border shadow-sm flex items-center gap-3 ${xenditQrisStatus === 'Aktif' ? 'border-emerald-200' : 'border-slate-200/60'}`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl border shrink-0 ${xenditQrisStatus === 'Aktif' ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>📱</div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">QRIS Xendit</span>
                <span className={`text-[9px] px-2 py-0.5 font-black uppercase rounded-lg border mt-0.5 inline-block ${xenditQrisStatus === 'Aktif' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {xenditQrisStatus}
                </span>
              </div>
            </div>
          )}
          {/* VA & Transfer */}
          <div className="bg-white p-4 rounded-[2rem] border border-slate-200/60 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-xl border border-blue-100 shrink-0">🏦</div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">VA & Transfer</span>
              <p className="text-xl font-black text-blue-700 leading-none mt-0.5">{vaNumbers.length + transferBanks.length}<span className="text-[10px] text-slate-400 font-bold"> rek.</span></p>
            </div>
          </div>
          {/* e-Wallet */}
          <div className="bg-white p-4 rounded-[2rem] border border-slate-200/60 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center text-xl border border-purple-100 shrink-0">📲</div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">e-Wallet</span>
              <p className="text-xl font-black text-purple-700 leading-none mt-0.5">{ewalletNumbers.length}<span className="text-[10px] text-slate-400 font-bold"> nomor</span></p>
            </div>
          </div>
        </div>

        {/* SYNC INFO BADGE */}
        {totalRekening > 0 && (
          <div className="flex items-center gap-2.5 bg-teal-50 border border-teal-200 rounded-2xl px-4 py-3">
            <span className="text-base">🔗</span>
            <p className="text-[10px] font-black text-teal-700">
              {totalRekening} info rekening tersimpan — otomatis muncul di <span className="underline">Struk Printer</span> & <span className="underline">Nota WA</span>
            </p>
          </div>
        )}

        {/* MSG */}
        {msg && (
          <div className={`w-full p-4 rounded-2xl text-xs font-black shadow-sm border flex items-center gap-2 transition-all ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
            {msg.type === 'success' ? '✓' : '✕'} {msg.text}
          </div>
        )}

        {/* TABS */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map(tab => {
            const isTabLocked = ['qris', 'va', 'settlements'].includes(tab.key) && !hasXenditModule;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  if (isTabLocked) {
                    onTriggerUpgrade && onTriggerUpgrade('xendit');
                    return;
                  }
                  setActiveTab(tab.key);
                }}
                className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-[1.5rem] transition-all duration-200 flex items-center gap-1.5 ${activeTab === tab.key
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-100'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                  }`}
              >
                {tab.label}
                {isTabLocked && <span>🔒</span>}
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════
            TAB: SAKLAR CHANNEL
        ══════════════════════════════════════════════ */}
        {activeTab === 'saklar' && (
          <div className="pay-card space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">⚙️ Aktifkan / Nonaktifkan Channel Kasir</p>
              <p className="text-[11px] font-bold text-slate-400 mt-1">
                Centang metode yang bisa dipilih kasir saat checkout. Isi detail rekening di tab masing-masing.
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                { key: 'cash', icon: '💵', label: 'Uang Tunai (Cash)', desc: 'Kasir input & hitung kembalian manual' },
                { key: 'qris', icon: '📱', label: 'QRIS (via Xendit)', desc: 'QR Code otomatis — konfigurasi di tab QRIS', badge: xenditQrisStatus, isPremium: true },
                { key: 'virtual_account', icon: '🏦', label: 'Virtual Account', desc: `Transfer ke nomor VA — ${vaNumbers.length} VA dikonfigurasi`, isPremium: true },
                { key: 'transfer_bank', icon: '💳', label: 'Transfer Bank Manual', desc: `Rekening biasa — ${transferBanks.length} rekening dikonfigurasi` },
                { key: 'ewallet', icon: '📲', label: 'e-Wallet (GoPay / Dana / OVO dll.)', desc: `${ewalletNumbers.length} nomor dikonfigurasi` },
              ].map(m => {
                const isItemLocked = m.isPremium && !hasXenditModule;
                return (
                  <label 
                    key={m.key} 
                    onClick={(e) => {
                      if (isItemLocked) {
                        e.preventDefault();
                        onTriggerUpgrade && onTriggerUpgrade('xendit');
                      }
                    }}
                    className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${methods[m.key] && !isItemLocked ? 'bg-teal-50/50 border-teal-200' : 'bg-slate-50 border-slate-100 hover:border-slate-200'} relative`}
                  >
                    {isItemLocked && (
                      <div className="absolute top-2 right-2 bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        🔒 PRO
                      </div>
                    )}
                    <span className="text-xl shrink-0">{m.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-black text-slate-800">{m.label}</h4>
                        {m.badge && (
                          <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase border ${m.badge === 'Aktif' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{m.desc}</p>
                    </div>
                    <div className={`relative w-11 h-6 rounded-full transition-all duration-200 shrink-0 ${methods[m.key] && !isItemLocked ? 'bg-teal-500' : 'bg-slate-200'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${methods[m.key] && !isItemLocked ? 'translate-x-5' : ''}`} />
                    </div>
                    <input 
                      type="checkbox" 
                      checked={!!methods[m.key] && !isItemLocked} 
                      onChange={() => {
                        if (isItemLocked) return;
                        if (m.key === 'qris' && !methods.qris && xenditQrisStatus !== 'Aktif') {
                          setAlertModal({
                            show: true,
                            title: '⚠️ QRIS Belum Aktif',
                            message: 'Status integrasi QRIS Xendit Anda belum AKTIF. Silakan lakukan pendaftaran terlebih dahulu di tab "QRIS Xendit" sebelum mengaktifkan channel kasir ini.',
                            type: 'error'
                          });
                          return;
                        }
                        if (m.key === 'virtual_account' && !methods.virtual_account && xenditVaStatus !== 'Aktif') {
                          setAlertModal({
                            show: true,
                            title: '⚠️ Virtual Account Belum Aktif',
                            message: 'Status integrasi Virtual Account Xendit Anda belum AKTIF. Silakan lakukan pendaftaran terlebih dahulu di tab "Virtual Account" sebelum mengaktifkan channel kasir ini.',
                            type: 'error'
                          });
                          return;
                        }
                        toggleMethod(m.key);
                      }} 
                      className="sr-only" 
                      disabled={isItemLocked}
                    />
                  </label>
                );
              })}
            </div>

            <button onClick={saveAll} disabled={saving}
              className="w-full py-4 rounded-[1.75rem] bg-slate-800 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-slate-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? '⏳ Menyimpan...' : '💾 Simpan Konfigurasi Channel'}
            </button>
          </div>
        )}
        {/* ══════════════════════════════════════════════
            TAB: QRIS XENDIT
        ══════════════════════════════════════════════ */}
        {activeTab === 'qris' && (
          <div className="space-y-4">
            {/* Status Card */}
            <div className="pay-card space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">📱 QRIS via Xendit — Status Akun</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[9px] font-black text-slate-400 block uppercase mb-1">Xendit Account ID</span>
                  <span className="font-mono text-xs font-black text-slate-700 break-all">{xenditAccountId || '— BELUM TERDAFTAR —'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 block uppercase mb-1">Status QRIS</span>
                  <span className={`text-[9px] px-2 py-0.5 font-black uppercase rounded-lg border inline-block ${xenditQrisStatus === 'Aktif' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{xenditQrisStatus}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-400 block uppercase mb-1">Status VA Xendit</span>
                  <span className={`text-[9px] px-2 py-0.5 font-black uppercase rounded-lg border inline-block ${xenditVaStatus === 'Aktif' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{xenditVaStatus}</span>
                </div>
              </div>

              {/* Belum Terdaftar → Form Registrasi */}
              {!xenditAccountId && renderXenditRegistrationForm()}

              {/* Diproses → KYC Pending */}
              {xenditAccountId && xenditVaStatus !== 'Aktif' && (
                <div className="p-5 bg-orange-50/70 border border-orange-200 rounded-2xl space-y-4">
                  <h4 className="text-xs font-black text-orange-800 uppercase tracking-wider flex items-center gap-2">
                    ⚠️ Verifikasi KYC Diperlukan
                  </h4>
                  <p className="text-[11px] text-orange-900 font-medium leading-relaxed">
                    Pemilik ruko wajib upload Berkas Dokumen Usaha (KYC) agar QRIS & VA disetujui Bank Indonesia.
                  </p>
                  {activationUrl ? (
                    <div className="bg-white p-3 rounded-xl border border-orange-200">
                      <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Link KYC Xendit:</span>
                      <a href={activationUrl} target="_blank" rel="noreferrer"
                        className="text-xs font-mono font-bold text-teal-600 hover:underline break-all">
                        {activationUrl}
                      </a>
                    </div>
                  ) : (
                    <div className="bg-white p-3.5 rounded-xl border border-orange-200 text-slate-700 text-[10px] font-bold leading-relaxed text-left">
                      <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">📧 Undangan KYC Terkirim</span>
                      Xendit telah mengirim email undangan verifikasi ke <span className="font-mono text-orange-700 font-black">{emailBisnis || 'email operasional Anda'}</span>. Silakan periksa folder Inbox/Spam email tersebut untuk menyetujui undangan KYC.
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {activationUrl && (
                      <a href={activationUrl} target="_blank" rel="noreferrer"
                        className="flex-1 px-4 py-3 bg-orange-500 text-white text-xs font-black uppercase tracking-wider rounded-2xl text-center hover:bg-orange-600 transition-all active:scale-95">
                        Buka Link Upload KTP & Berkas ❯
                      </a>
                    )}
                    <button type="button" onClick={handleDisconnectXendit}
                      className="px-4 py-3 bg-rose-600 text-white text-[10px] font-black uppercase rounded-2xl hover:bg-rose-700 transition-all active:scale-95 flex-1">
                      🔌 Putuskan Hubungan
                    </button>
                  </div>
                </div>
              )}

              {/* Aktif Banner */}
              {xenditAccountId && xenditVaStatus === 'Aktif' && (
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">✅</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-xs font-black text-emerald-800 uppercase">Xendit QRIS Siap Pakai!</h4>
                        <button type="button" onClick={handleDisconnectXendit}
                          className="px-3 py-1.5 bg-rose-600 text-white text-[8px] font-black uppercase rounded-lg hover:bg-rose-700 transition-all active:scale-95">
                          🔌 Putuskan Hubungan
                        </button>
                      </div>
                      <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                        Dana QRIS otomatis routing ke dompet ID: <span className="font-mono">{xenditAccountId || '—'}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Registered -> Show Fixed QRIS Card */}
              {xenditAccountId && (
                <div className="space-y-4 border-t pt-4 border-slate-100">
                  {/* NMID & TID Input */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NMID (National Merchant ID)</label>
                      <input 
                        type="text" 
                        value={qrisNmid} 
                        onChange={e => setQrisNmid(e.target.value)}
                        placeholder="ID1020..." 
                        className="pay-input" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TID (Terminal ID)</label>
                      <input 
                        type="text" 
                        value={qrisTid} 
                        onChange={e => setQrisTid(e.target.value)}
                        placeholder="A01" 
                        className="pay-input" 
                      />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-emerald-100/60 shadow-sm flex flex-col items-center text-center w-full max-w-[480px] mx-auto mt-2">
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-4">QRIS Statis Toko (Fixed QRIS)</span>
                    <div className="bg-slate-50 p-1 sm:p-4 rounded-2xl border border-slate-100 flex flex-col items-center w-full overflow-hidden">
                      {staticQrString ? (
                        <div className="w-full flex justify-center pb-2 overflow-x-auto">
                          <QrisStandarFrame 
                            staticQrString={staticQrString}
                            tenantName={businessName || `Toko ${tenantId}`}
                            nmid={qrisNmid}
                            tid={qrisTid}
                          />
                        </div>
                      ) : (
                        <div className="text-center p-4 flex flex-col items-center justify-center">
                          <span className="text-2xl mb-1.5">⌛</span>
                          <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">QRIS Belum Aktif</p>
                          <p className="text-[8px] text-slate-400 font-bold mt-1.5 leading-relaxed max-w-[200px]">
                            QRIS statis toko Anda belum terbit karena status verifikasi akun masih <b>Diproses (KYC Pending)</b>.
                          </p>
                          <p className="text-[8px] text-amber-600 font-bold mt-1.5 leading-relaxed max-w-[200px]">
                            Selesaikan upload berkas KTP & Rekening Bank terlebih dahulu. Setelah disetujui, QRIS asli akan muncul otomatis di sini!
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="text-[8px] text-slate-400 font-bold mt-2">Dapat diunduh / dicetak untuk ditempel di meja kasir</p>
                  </div>

                  <div className="bg-white/70 rounded-xl p-3 border border-emerald-100 mt-2">
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-1">Yang muncul di struk & nota WA:</p>
                    <p className="text-[11px] font-mono text-slate-600 font-bold">📱 QRIS — Merchant: {xenditAccountId || '—'}</p>
                    <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Scan QR di layar kasir atau tunjukkan QR statis toko</p>
                  </div>

                  <button onClick={saveAll} disabled={saving}
                    className="w-full py-4 rounded-[1.75rem] bg-teal-600 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-teal-100 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? '⏳ Menyimpan...' : '💾 Simpan Konfigurasi QRIS'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: VIRTUAL ACCOUNT
        ══════════════════════════════════════════════ */}
        {activeTab === 'va' && (
          <div className="pay-card space-y-6">

            {/* 1. KONEKSI KE PENDAFTARAN XENDIT */}
            {xenditAccountId ? (
              <div className="bg-gradient-to-br from-blue-50 to-teal-50/20 border border-blue-200/60 p-5 rounded-[2rem] space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h4 className="text-xs font-black text-blue-800 uppercase tracking-wider flex items-center gap-2">
                    🏦 Nomor Virtual Account Xendit (Fixed VA)
                  </h4>
                  <span className={`text-[8px] px-2 py-0.5 font-black uppercase rounded border ${xenditVaStatus === 'Aktif' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {xenditVaStatus === 'Aktif' ? 'Xendit Fixed (Aktif)' : 'Xendit Fixed (Diproses / Simulasi)'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  Nomor Virtual Account ini bersifat tetap (fixed) untuk toko Anda. Pelanggan dapat transfer ke nomor-nomor di bawah ini kapan saja:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {loadingVA ? (
                    <div className="col-span-1 sm:col-span-2 text-center p-4">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memuat VA Xendit...</span>
                    </div>
                  ) : fixedVAs.length > 0 ? (
                    fixedVAs.map(v => (
                      <div key={v.bank_code} className="bg-white p-3 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 shadow-sm hover:shadow transition-all">
                        <div>
                          <span className="text-[9px] font-black text-blue-700 uppercase tracking-wider block">{v.bank_code} VA</span>
                          <span className="font-mono text-xs font-black text-slate-800 tracking-wider">{v.account_number}</span>
                        </div>
                        <span className="text-[8px] px-2 py-0.5 font-black uppercase rounded bg-blue-50 text-blue-700 border border-blue-100">Xendit Fixed</span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-1 sm:col-span-2 text-center p-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum ada VA aktif</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-4">
                <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-2">
                  ⚠️ Virtual Account Xendit Belum Aktif
                </h4>
                <p className="text-[10px] text-amber-900 font-medium leading-relaxed mb-2">
                  Akun Xendit Anda belum terintegrasi/aktif. Silakan lakukan pendaftaran merchant Xendit atau aktifkan simulator bypass di bawah ini agar Virtual Account Xendit otomatis ini muncul.
                </p>
                {renderXenditRegistrationForm()}
              </div>
            )}

            {/* 2. REKENING MANUAL (OPSIONAL / FALLBACK) */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">🏦 Rekening VA Manual (Opsional)</p>
                  <p className="text-[11px] font-bold text-slate-400 mt-1">
                    Anda juga dapat memasukkan nomor VA manual lainnya di bawah ini jika diperlukan.
                  </p>
                </div>
                <button onClick={addVA}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 text-white text-[10px] font-black uppercase rounded-2xl hover:brightness-105 transition-all shrink-0 shadow-md shadow-teal-100 pay-row-add">
                  <IconPlus /> Tambah VA Manual
                </button>
              </div>

              {vaNumbers.length === 0
                ? <EmptySlot icon="🏦" label="Belum ada nomor VA manual" hint='Klik "+ Tambah VA Manual" jika ada rekening manual' />
                : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[20px_1fr_1fr_1fr_36px] gap-2 px-3">
                      <div />
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Bank</span>
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Nomor VA</span>
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Atas Nama</span>
                      <div />
                    </div>
                    {vaNumbers.map((item, i) => (
                      <PayRow key={i} item={item} index={i}
                        onUpdate={updateVA} onRemove={removeVA}
                        selectKey="bank" selectOptions={BANK_LIST} />
                    ))}
                  </div>
                )
              }
            </div>

            <button onClick={saveAll} disabled={saving}
              className="w-full py-4 rounded-[1.75rem] bg-teal-600 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-teal-100 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? '⏳ Menyimpan...' : '💾 Simpan Data Virtual Account'}
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: TRANSFER BANK
        ══════════════════════════════════════════════ */}
        {activeTab === 'transfer' && (
          <div className="pay-card space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">💳 Rekening Transfer Bank Manual</p>
                <p className="text-[11px] font-bold text-slate-400 mt-1">
                  Nomor rekening otomatis tampil di struk & nota WA saat kasir pilih Transfer Bank.
                </p>
              </div>
              <button onClick={addTransfer}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 text-white text-[10px] font-black uppercase rounded-2xl hover:brightness-105 transition-all shrink-0 shadow-md shadow-teal-100 pay-row-add">
                <IconPlus /> Tambah Rekening
              </button>
            </div>

            {transferBanks.length === 0
              ? <EmptySlot icon="💳" label="Belum ada rekening bank" hint='Klik "+ Tambah Rekening" untuk menambahkan' />
              : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[20px_1fr_1fr_1fr_36px] gap-2 px-3">
                    <div />
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Bank</span>
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-wider">No. Rekening</span>
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Atas Nama</span>
                    <div />
                  </div>
                  {transferBanks.map((item, i) => (
                    <PayRow key={i} item={item} index={i}
                      onUpdate={updateTransfer} onRemove={removeTransfer}
                      selectKey="bank" selectOptions={BANK_LIST} />
                  ))}
                </div>
              )
            }

            <button onClick={saveAll} disabled={saving}
              className="w-full py-4 rounded-[1.75rem] bg-teal-600 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-teal-100 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? '⏳ Menyimpan...' : '💾 Simpan Rekening Transfer'}
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: E-WALLET
        ══════════════════════════════════════════════ */}
        {activeTab === 'ewallet' && (
          <div className="pay-card space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">📲 Nomor e-Wallet</p>
                <p className="text-[11px] font-bold text-slate-400 mt-1">
                  GoPay, Dana, OVO dll. otomatis tampil di struk & nota WA sebagai opsi transfer.
                </p>
              </div>
              <button onClick={addEwallet}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 text-white text-[10px] font-black uppercase rounded-2xl hover:brightness-105 transition-all shrink-0 shadow-md shadow-teal-100 pay-row-add">
                <IconPlus /> Tambah e-Wallet
              </button>
            </div>

            {ewalletNumbers.length === 0
              ? <EmptySlot icon="📲" label="Belum ada nomor e-Wallet" hint='Klik "+ Tambah e-Wallet" untuk menambahkan' />
              : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[20px_1fr_1fr_1fr_36px] gap-2 px-3">
                    <div />
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Provider</span>
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Nomor HP / ID</span>
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Atas Nama</span>
                    <div />
                  </div>
                  {ewalletNumbers.map((item, i) => (
                    <PayRow key={i} item={item} index={i}
                      onUpdate={updateEwallet} onRemove={removeEwallet}
                      selectKey="provider" selectOptions={EWALLET_LIST} />
                  ))}
                </div>
              )
            }

            <button onClick={saveAll} disabled={saving}
              className="w-full py-4 rounded-[1.75rem] bg-teal-600 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-teal-100 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? '⏳ Menyimpan...' : '💾 Simpan Nomor e-Wallet'}
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: STATUS PENCAIRAN (SETTLEMENTS)
        ══════════════════════════════════════════════ */}
        {activeTab === 'settlements' && (
          <div className="pay-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">💰 Laporan Pencairan Otomatis (QRIS & VA Xendit)</p>
                <p className="text-[11px] font-bold text-slate-400 mt-1">
                  Pantau dana dari pembayaran otomatis QRIS & Virtual Account Xendit yang dikirim otomatis ke rekening bank Anda. Pembayaran manual (Cash & Transfer Manual) tidak tercatat di sini karena langsung masuk ke kasir/rekening Anda secara instan.
                </p>
              </div>
            </div>

            {/* RINGKASAN SALDO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Saldo Mengendap */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/20 border border-amber-200/60 p-5 rounded-[2rem] shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block">Saldo Mengendap (Proses)</span>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    Rp {settlementTx
                      .filter(t => t.settlement_status === 'pending' || !t.settlement_status)
                      .reduce((sum, t) => sum + (Number(t.total) || 0), 0)
                      .toLocaleString('id-ID')}
                  </h3>
                  <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Estimasi pencairan ke rekening dalam T+1 hari kerja</span>
                </div>
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-amber-100">⏳</div>
              </div>

              {/* Dana Sudah Cair */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/20 border border-emerald-200/60 p-5 rounded-[2rem] shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block">Dana Sudah Cair (Sukses)</span>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    Rp {settlementTx
                      .filter(t => t.settlement_status === 'settled')
                      .reduce((sum, t) => sum + (Number(t.total) || 0), 0)
                      .toLocaleString('id-ID')}
                  </h3>
                  <span className="text-[9px] text-slate-400 font-bold block mt-0.5">Telah ditransfer otomatis ke rekening bank Anda</span>
                </div>
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-emerald-100">✅</div>
              </div>
            </div>

            {/* TABEL LIST TRANSAKSI */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">📜 Riwayat Settlement QRIS & VA</p>

              {settleLoading ? (
                <div className="text-center py-12">
                  <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Memuat Transaksi...</p>
                </div>
              ) : settlementTx.length === 0 ? (
                <EmptySlot icon="💰" label="Belum ada transaksi digital" hint="Transaksi QRIS atau VA yang sukses akan muncul di sini." />
              ) : (
                <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Nota / Invoice</th>
                          <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                          <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Metode</th>
                          <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Jumlah</th>
                          <th className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status Pencairan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-700">
                        {settlementTx.map(t => {
                          const isSettled = t.settlement_status === 'settled';
                          const fmtDate = new Date(t.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          });
                          const fmtSettleDate = t.settled_at ? new Date(t.settled_at).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          }) : null;

                          return (
                            <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4">
                                <p className="text-slate-900 font-black">{t.invoice_number || `#${String(t.id).substring(0, 6)}`}</p>
                              </td>
                              <td className="p-4 text-[10px] text-slate-400 font-mono">{fmtDate}</td>
                              <td className="p-4">
                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase">
                                  {t.payment_method === 'QRIS' ? '📱 QRIS' : '🏦 VA'}
                                </span>
                              </td>
                              <td className="p-4 text-slate-900 font-black">Rp {(Number(t.total) || 0).toLocaleString('id-ID')}</td>
                              <td className="p-4">
                                {isSettled ? (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 font-black uppercase rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200">
                                      Sudah Masuk Rekening
                                    </span>
                                    {fmtSettleDate && (
                                      <p className="text-[8px] text-slate-400 font-mono mt-0.5">Cair: {fmtSettleDate}</p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 font-black uppercase rounded-lg border bg-amber-50 text-amber-700 border-amber-200">
                                      Sedang Diproses (T+1)
                                    </span>
                                    <p className="text-[8px] text-slate-400 font-semibold mt-0.5">Est. Cair: Besok Pagi</p>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* showSettleModal rendering block removed (simulations cleaned up) */}

        <CustomAlertModal
          show={alertModal.show}
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type}
          onClose={() => setAlertModal(prev => ({ ...prev, show: false }))}
        />

      </div>
    </div>
  );
}

// DARI ANTIGRAVITY