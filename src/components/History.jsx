/* eslint-disable */
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { printTransactionReceipt, sendTransactionWhatsApp, printDirectBluetooth } from '../utils/transactionReceipt';
import { formatRupiah } from '../utils/platformAdmin';
import { defaultMonthToTodayRange, isInDateRange } from '../utils/dateFilters';
import { createXenditQR } from '../utils/api';

// Metode pembayaran di-build dinamis dari settings — lihat buildHistoryPaymentMethods()

/* Tema selaras App.jsx — navbar teal, tab bar orange */
const THEME = {
  teal: '#0d9488',
  tealDark: '#0f766e',
  tealLight: '#e0f5f1',
  orange: '#F47920',
  orangeAccent: '#fb923c',
  orangeLight: '#fff3e8',
  bg: '#F8FAFC',
};

const UI = {
  btnBack: 'flex items-center gap-2 bg-white border border-slate-200 px-6 py-3.5 rounded-[1.5rem] shadow-sm text-[10px] font-black text-slate-800 active:scale-95 transition-all uppercase tracking-widest hover:border-slate-300',
  btnPrimary: 'text-white font-black text-[11px] uppercase tracking-[0.1em] px-6 sm:px-8 py-3.5 sm:py-4 rounded-[1.25rem] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 bg-gradient-to-br from-[#0f8b6b] to-teal-600 w-full sm:w-auto shrink-0',
  search: 'w-full bg-white border border-slate-200 rounded-3xl p-4 pl-12 text-sm font-bold shadow-sm focus:border-teal-600 outline-none transition-all',
  listWrap: 'space-y-4',
  pageHeader: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-10',
  pageTitleBlock: 'min-w-0',
  pageTitle: 'text-xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight uppercase',
  pageSubtitle: 'text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2',
  filterActive: 'px-8 py-3.5 rounded-full font-black text-[10px] uppercase tracking-wider border-2 text-white border-transparent shadow-md bg-teal-600',
  filterIdle: 'px-8 py-3.5 rounded-full font-black text-[10px] uppercase tracking-wider border-2 bg-white border-slate-200 text-slate-400',
};

const IconHistory = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const IconChevronLeft = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const IconChevronRight = () => (
  <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const formatRp = (n) => formatRupiah(n);

const formatDateTime = (iso) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatTimeShort = (iso) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatShortId = (id, index) => {
  if (!id) return String(index + 1).padStart(2, '0');
  const s = String(id);
  return s.length > 6 ? s.slice(0, 6).toUpperCase() : s.toUpperCase();
};

function getTransactionMeta(t) {
  const meta = parseTransactionNotes(t?.notes);
  if (t?.cashier_name?.trim()) {
    meta.kasir = t.cashier_name.trim();
  } else if (t?.staff_id) {
    meta.kasir = `Staff #${t.staff_id}`;
  }
  return meta;
}

function parseTransactionNotes(notes = '') {
  const result = {
    customer: 'Pelanggan Umum',
    phone: null,
    kasir: null,
    catatan: null,
    diskon: null,
    biayaTambahan: null,
    estimasiSelesai: null,
  };
  if (!notes) return result;

  const customerMatch = notes.match(/\[Customer:\s*([^|\]]+)(?:\s*\|\s*Tlp:\s*([^\]]+))?\]/i);
  if (customerMatch) {
    const name = customerMatch[1]?.trim();
    if (name && !/guest|umum/i.test(name)) result.customer = name;
    if (customerMatch[2]) result.phone = customerMatch[2].trim();
  }

  const kasirMatch = notes.match(/\[Kasir:\s*([^\]]+)\]/i);
  if (kasirMatch) result.kasir = kasirMatch[1].trim();

  const diskonMatch = notes.match(/\[Diskon:\s*([^\]]+)\]/i);
  if (diskonMatch) result.diskon = diskonMatch[1].trim();

  const biayaMatch = notes.match(/\[Biaya Tambahan:\s*([^\]]+)\]/i);
  if (biayaMatch) result.biayaTambahan = biayaMatch[1].trim();

  const estMatch = notes.match(/\[Est\. Selesai:\s*([^\]]+)\]/i);
  if (estMatch) result.estimasiSelesai = estMatch[1].trim();

  const catatanMatch = notes.match(/Catatan:\s*([^|]+?)(?:\s*\|\||$)/i);
  if (catatanMatch) result.catatan = catatanMatch[1].trim();

  return result;
}

function PaymentBadge({ method, compact }) {
  const isUnpaid = method === 'Belum Lunas';
  const base = compact
    ? 'text-[9px] px-2 py-0.5 rounded-md'
    : 'text-[10px] px-2.5 py-1 rounded-lg';

  if (isUnpaid) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-black uppercase tracking-wide ${base}`}
        style={{ background: THEME.orangeLight, color: '#c2410c', border: '1px solid #fdba74' }}
      >
        {!compact && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: THEME.orange }} />}
        Bon
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 font-black uppercase tracking-wide ${base}`}
      style={{ background: THEME.tealLight, color: THEME.tealDark, border: `1px solid ${THEME.teal}40` }}
    >
      {method || 'Lunas'}
    </span>
  );
}

function TransactionListRow({ t, index, onSelect }) {
  const meta = useMemo(() => getTransactionMeta(t), [t]);

  const items = Array.isArray(t.items) ? t.items : [];
  const itemCount = items.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

  return (
    <button
      type="button"
      onClick={() => onSelect(t)}
      className="w-full text-left bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 transition-all duration-300 hover:shadow-md hover:border-teal-300/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transform active:scale-[0.99] cursor-pointer"
      style={{
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
      }}
    >
      {/* Baris Atas: Info Nota, Pelanggan, dan Badge Bayar */}
      <div className="flex flex-wrap items-start justify-between gap-2 w-full">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="px-2.5 py-1 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: THEME.tealLight, border: `1px solid ${THEME.teal}20` }}
          >
            <span className="text-[10px] font-mono font-black" style={{ color: THEME.tealDark }}>
              {t.invoice_number || `#${formatShortId(t.id, index)}`}
            </span>
          </div>

          <div className="min-w-0">
            <h4 className="text-sm font-black text-slate-800 truncate flex items-center gap-1.5">
              <span>👤 {meta.customer}</span>
              {meta.phone && meta.phone !== '-' && (
                <span className="text-[10px] font-mono text-slate-400 font-normal">({meta.phone})</span>
              )}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <PaymentBadge method={t.payment_method} compact />
        </div>
      </div>

      {/* Baris Tengah: Rincian Produk/Item Belanja */}
      {items.length > 0 && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 w-full flex flex-wrap gap-1.5">
          {items.slice(0, 4).map((item, idx) => (
            <span
              key={idx}
              className="inline-flex items-center text-[10px] font-bold bg-white text-slate-600 border border-slate-200/60 px-2 py-0.5 rounded-lg shadow-sm"
            >
              {item.name}
              {item.variant && <span className="text-slate-400 text-[9px] ml-0.5">({item.variant})</span>}
              <span className="text-[9px] text-teal-600 font-mono font-black ml-1.5">x{item.qty}</span>
            </span>
          ))}
          {items.length > 4 && (
            <span className="inline-flex items-center text-[9px] font-black bg-teal-50 border border-teal-100/50 text-teal-700 px-2 py-0.5 rounded-lg">
              +{items.length - 4} lainnya
            </span>
          )}
        </div>
      )}

      {/* Catatan Tambahan (jika ada) */}
      {meta.catatan && (
        <div className="w-full text-[11px] text-slate-500 italic bg-amber-50/60 border border-amber-100/40 px-3 py-1.5 rounded-xl flex gap-1 items-start">
          <span className="shrink-0">📝</span>
          <span className="line-clamp-1">&ldquo;{meta.catatan}&rdquo;</span>
        </div>
      )}

      {/* Pembatas Tipis */}
      <div className="w-full border-t border-slate-100 my-0.5" />

      {/* Baris Bawah: Metadata (Waktu, Kasir, Estimasi Selesai) dan Total */}
      <div className="flex flex-wrap items-end justify-between gap-3 w-full">
        <div className="space-y-1 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>📅 {formatDateTime(t.created_at)}</span>
            <span>•</span>
            <span style={{ color: THEME.tealDark }}>👤 Staf: {meta.kasir || '—'}</span>
          </div>

          {meta.estimasiSelesai && (
            <div className="flex items-center gap-1 text-amber-600 lowercase font-medium normal-case">
              <span>⏱️ Est. Selesai:</span>
              <span className="font-bold">{meta.estimasiSelesai}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Total Belanja</p>
            <p className="text-base font-black leading-tight mt-0.5" style={{ color: THEME.teal }}>
              {formatRp(t.total)}
            </p>
          </div>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
            style={{ background: THEME.tealLight }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={THEME.teal} strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </button>
  );
}

function TransactionDetailScreen({ t, index, onBack, tenantId, onUpdated }) {
  const [tx, setTx] = useState(t);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(
    () => (t.payment_method === 'Belum Lunas' ? 'Tunai' : (t.payment_method || 'Tunai'))
  );
  const [updating, setUpdating] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  // Metode bayar dinamis dari settings
  const [availableMethods, setAvailableMethods] = useState([
    { label: 'Tunai', icon: '💵' }, { label: 'QRIS', icon: '📱' }, { label: 'Virtual Account', icon: '🏦' }
  ]);

  const [paymentSettings, setPaymentSettings] = useState(null);
  const [xenditQrCode, setXenditQrCode] = useState('');
  const [loadingXendit, setLoadingXendit] = useState(false);
  const [errorXendit, setErrorXendit] = useState('');

  // Fetch metode pembayaran yang aktif di settings
  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('payment_settings')
          .select('*')
          .eq('tenant_id', tenantId)
          .maybeSingle();
        if (!data) return;
        setPaymentSettings(data);
        const qrisOk = data.xendit_qris_status === 'Aktif' || data.xendit_merchant_id;
        const list = [
          { label: 'Tunai', icon: '💵', show: data.payment_cash_enabled !== false },
          { label: 'QRIS', icon: '📱', show: data.payment_qris_enabled === true && qrisOk },
          { label: 'Virtual Account', icon: '🏦', show: data.payment_va_enabled === true },
          { label: 'Transfer Bank', icon: '💳', show: data.payment_transfer_enabled === true },
          { label: 'e-Wallet', icon: '📲', show: data.payment_ewallet_enabled === true },
        ].filter(x => x.show);
        if (list.length > 0) setAvailableMethods(list);
      } catch { }
    })();
  }, [tenantId]);

  const meta = useMemo(() => getTransactionMeta(tx), [tx]);
  const isUnpaid = tx.payment_method === 'Belum Lunas';

  // Reset states when transaction changes
  useEffect(() => {
    setXenditQrCode('');
    setErrorXendit('');
  }, [tx?.id]);

  // Generate dynamic QRIS
  useEffect(() => {
    if (!isUnpaid || !showPaymentPanel || paymentMethod !== 'QRIS' || !tx?.id) {
      return;
    }
    const generateQR = async () => {
      setLoadingXendit(true);
      setErrorXendit('');
      try {
        const res = await createXenditQR({
          tenantId,
          amount: tx.total,
          transactionId: tx.id
        });
        if (res.success) {
          setXenditQrCode(res.qrString || '');
        } else {
          throw new Error(res.error || 'Gagal generate QRIS');
        }
      } catch (err) {
        console.error('Error generating Xendit QRIS in History:', err);
        setErrorXendit(err.message || 'Gagal generate QRIS.');
      } finally {
        setLoadingXendit(false);
      }
    };
    if (!xenditQrCode) {
      generateQR();
    }
  }, [paymentMethod, showPaymentPanel, isUnpaid, tx?.id, tenantId, tx?.total, xenditQrCode]);

  // Polling status pembayaran
  useEffect(() => {
    if (!isUnpaid || !showPaymentPanel || paymentMethod !== 'QRIS' || !tx?.id) return;

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('payment_method, status')
          .eq('id', tx.id)
          .maybeSingle();

        if (error) throw error;
        if (data && data.payment_method !== 'Belum Lunas') {
          const updated = { ...tx, payment_method: data.payment_method, status: data.status || 'completed' };
          setTx(updated);
          onUpdated?.(updated);
          setShowPaymentPanel(false);
          setActionMsg({ type: 'success', text: `Pembayaran QRIS Berhasil Diterima!` });
          setShowSuccessModal(true);
        }
      } catch (err) {
        console.error('Gagal mengecek status pembayaran:', err);
      }
    };

    const interval = setInterval(checkStatus, 4000);
    return () => clearInterval(interval);
  }, [isUnpaid, showPaymentPanel, paymentMethod, tx, onUpdated]);

  const items = Array.isArray(tx.items) ? tx.items : [];
  const subtotalItems = items.reduce(
    (sum, i) => sum + (Number(i.qty) || 0) * (Number(i.price) || 0),
    0
  );

  const handleUpdatePayment = useCallback(async () => {
    if (!tx?.id) return;
    setUpdating(true);
    setActionMsg(null);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ payment_method: paymentMethod })
        .eq('id', tx.id);
      if (error) throw error;
      const updated = { ...tx, payment_method: paymentMethod };
      setTx(updated);
      onUpdated?.(updated);
      setShowPaymentPanel(false);
      setActionMsg({ type: 'success', text: `Status pembayaran diubah ke ${paymentMethod}` });
      if (paymentMethod !== 'Belum Lunas') {
        setShowSuccessModal(true);
      }
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message || 'Gagal update status' });
    } finally {
      setUpdating(false);
    }
  }, [tx, paymentMethod, onUpdated]);

  const handlePrint = useCallback(async () => {
    if (!tenantId) return alert('Tenant tidak terdeteksi.');
    try {
      await printTransactionReceipt({ transaction: tx, meta, tenantId });
    } catch (err) {
      alert('Gagal cetak: ' + (err.message || 'unknown'));
    }
  }, [tx, meta, tenantId]);

  const handlePrintBluetooth = useCallback(async () => {
    if (!tenantId) return alert('Tenant tidak terdeteksi.');
    try {
      await printDirectBluetooth({ transaction: tx, meta, tenantId });
    } catch (err) {
      alert('Gagal cetak Bluetooth: ' + (err.message || 'unknown'));
    }
  }, [tx, meta, tenantId]);

  const handleSendWA = useCallback(async () => {
    if (!tenantId) return alert('Tenant tidak terdeteksi.');
    try {
      await sendTransactionWhatsApp({ transaction: tx, meta, tenantId });
    } catch (err) {
      alert('Gagal buka WA: ' + (err.message || 'unknown'));
    }
  }, [tx, meta, tenantId]);

  const handleVoid = useCallback(async () => {
    if (!tx?.id || tx.status === 'void') return;
    const reason = window.prompt('Alasan void transaksi:');
    if (!reason) return;
    setUpdating(true);
    try {
      const { error } = await supabase.from('transactions').update({
        status: 'void',
        void_reason: reason,
      }).eq('id', tx.id);
      if (error) throw error;
      const updated = { ...tx, status: 'void', void_reason: reason };
      setTx(updated);
      onUpdated?.(updated);
      setActionMsg({ type: 'success', text: 'Transaksi di-void.' });
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setUpdating(false);
    }
  }, [tx, onUpdated]);

  const handleRefund = useCallback(async () => {
    if (!tx?.id || tx.status === 'refunded') return;
    if (!window.confirm('Refund transaksi ini?')) return;
    setUpdating(true);
    try {
      const { error } = await supabase.from('transactions').update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
      }).eq('id', tx.id);
      if (error) throw error;
      const updated = { ...tx, status: 'refunded', refunded_at: new Date().toISOString() };
      setTx(updated);
      onUpdated?.(updated);
      setActionMsg({ type: 'success', text: 'Transaksi di-refund.' });
    } catch (err) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setUpdating(false);
    }
  }, [tx, onUpdated]);

  const txStatus = tx.status || 'completed';

  return (
    <div className="fixed inset-0 z-[999999] flex flex-col animate-in slide-in-from-right duration-300" style={{ background: THEME.bg }}>
      <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-[10px] font-black text-slate-800 uppercase tracking-wider hover:bg-slate-50"
          >
            <IconChevronLeft />
            Kembali
          </button>
          <PaymentBadge method={tx.payment_method} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full pb-28">
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-6 space-y-5">
          <header className="border-b pb-4" style={{ borderColor: '#d1ede8' }}>
            <span className="text-[9px] font-black uppercase tracking-widest block mb-1" style={{ color: THEME.teal }}>
              No. Nota: {tx.invoice_number || `#${formatShortId(tx.id, index)}`}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{meta.customer}</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">{formatDateTime(tx.created_at)}</p>
            <p className="text-xs font-bold mt-2" style={{ color: THEME.tealDark }}>
              👤 Kasir: <span className="font-black">{meta.kasir || 'Tidak dicatat'}</span>
            </p>
          </header>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
            <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: `1px solid ${THEME.teal}25` }}>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
              <p className="text-lg font-black" style={{ color: THEME.teal }}>{formatRp(tx.total)}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: `1px solid ${THEME.teal}25` }}>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Bayar</p>
              <p className="text-sm font-black truncate" style={{ color: isUnpaid ? THEME.orange : THEME.tealDark }}>
                {tx.payment_method || '-'}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: `1px solid ${THEME.teal}25` }}>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Kasir</p>
              <p className="text-sm font-black text-slate-800 truncate">{meta.kasir || 'Tidak dicatat'}</p>
            </div>
            {meta.phone && meta.phone !== '-' && (
              <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: `1px solid ${THEME.teal}25` }}>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Telepon</p>
                <p className="text-sm font-black text-slate-800">{meta.phone}</p>
              </div>
            )}
          </div>

          {(meta.diskon || meta.biayaTambahan || meta.estimasiSelesai) && (
            <div className="flex flex-wrap gap-2">
              {meta.diskon && (
                <span className="text-[10px] font-bold bg-rose-50 border border-rose-100 text-rose-600 px-3 py-1.5 rounded-xl">
                  🏷 {meta.diskon}
                </span>
              )}
              {meta.biayaTambahan && (
                <span className="text-[10px] font-bold bg-violet-50 border border-violet-100 text-violet-600 px-3 py-1.5 rounded-xl">
                  ➕ {meta.biayaTambahan}
                </span>
              )}
              {meta.estimasiSelesai && (
                <span
                  className="text-[10px] font-bold px-3 py-1.5 rounded-xl"
                  style={{ background: THEME.tealLight, border: `1px solid ${THEME.teal}40`, color: THEME.tealDark }}
                >
                  ⏱ Est. {meta.estimasiSelesai}
                </span>
              )}
            </div>
          )}

          {meta.catatan && (
            <p className="text-sm text-slate-600 bg-white border border-slate-100 rounded-2xl px-4 py-3 italic shadow-sm">
              &ldquo;{meta.catatan}&rdquo;
            </p>
          )}

          <section className="bg-white rounded-2xl shadow-sm overflow-hidden w-full" style={{ border: `1px solid ${THEME.teal}25` }}>
            <div
              className="px-4 py-3 border-b flex justify-between text-[10px] font-black uppercase tracking-widest"
              style={{ background: THEME.tealLight, borderColor: '#d1ede8', color: THEME.tealDark }}
            >
              <span>Rincian Produk</span>
              <span>Subtotal</span>
            </div>
            <ul className="divide-y divide-slate-50">
              {items.length > 0 ? (
                items.map((item, idx) => {
                  const qty = Number(item.qty) || 0;
                  const price = Number(item.price) || 0;
                  const lineTotal = qty * price;
                  return (
                    <li key={idx} className="px-4 py-3 flex justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800">{item.name}</p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          {qty} {item.unit || 'unit'} × {formatRp(price)}
                          {item.variant ? ` · ${item.variant}` : ''}
                          {item.duration > 0 && item.duration_type
                            ? ` · ${item.duration} ${item.duration_type}`
                            : ''}
                        </p>
                      </div>
                      <span className="text-sm font-black text-slate-800 shrink-0">{formatRp(lineTotal)}</span>
                    </li>
                  );
                })
              ) : (
                <li className="px-4 py-8 text-center text-sm text-slate-400 font-medium">
                  Tidak ada rincian item
                </li>
              )}
            </ul>
            <div className="px-4 py-4 border-t space-y-2" style={{ borderColor: '#d1ede8', background: THEME.tealLight }}>
              {subtotalItems !== Number(tx.total) && items.length > 0 && (
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal item</span>
                  <span className="font-bold">{formatRp(subtotalItems)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm font-black text-slate-700 uppercase tracking-wide">Total Nota</span>
                <span className="text-xl font-black" style={{ color: THEME.teal }}>{formatRp(tx.total)}</span>
              </div>
            </div>
          </section>

          {/* QRIS STATIS NOTA */}
          {isUnpaid && paymentSettings?.payment_qris_enabled && (paymentSettings?.xendit_merchant_id || paymentSettings?.xendit_qris_status === 'Aktif' || paymentSettings?.xendit_qris_status === 'Diproses') && (
            <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center text-center border" style={{ borderColor: '#d1ede8' }}>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">📋 SCAN QRIS STATIS TOKO</p>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=https://agrapos.dev/merchant/${paymentSettings.xendit_merchant_id || 'ID-AGRAPOS-DEMO'}`}
                alt="QRIS Statis Toko" 
                className="w-24 h-24 object-contain mb-1.5"
              />
              <span className="font-mono text-[8px] text-slate-400 font-bold">{paymentSettings.xendit_merchant_id || 'ID-AGRAPOS-DEMO'}</span>
            </div>
          )}

          {actionMsg && (
            <p
              className="text-xs font-bold px-4 py-2.5 rounded-xl border"
              style={
                actionMsg.type === 'success'
                  ? { background: THEME.tealLight, color: THEME.tealDark, borderColor: `${THEME.teal}50` }
                  : { background: '#fff1f2', color: '#be123c', borderColor: '#fecdd3' }
              }
            >
              {actionMsg.text}
            </p>
          )}

          {isUnpaid && (
            <button
              type="button"
              onClick={() => setShowPaymentPanel((v) => !v)}
              className="w-full py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition"
              style={{
                background: THEME.orangeLight,
                color: THEME.orangeDark,
                border: `1.5px dashed ${THEME.orange}`,
              }}
            >
              💳 {showPaymentPanel ? 'Batal / Tutup Panel Bayar' : 'Update Status Pembayaran'}
            </button>
          )}

          {isUnpaid && showPaymentPanel && (
            <section
              className="bg-white rounded-2xl shadow-sm p-4 space-y-3"
              style={{ border: `2px solid ${THEME.orange}50` }}
            >
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: THEME.orange }}>
                Update Status Pembayaran
              </p>
              <div className={`grid gap-2 ${availableMethods.length <= 3 ? 'grid-cols-3' : availableMethods.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {availableMethods.map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => setPaymentMethod(m.label)}
                    className="py-2.5 px-2 rounded-xl text-[10px] font-black uppercase border transition flex flex-col items-center gap-1"
                    style={
                      paymentMethod === m.label
                        ? { background: `linear-gradient(135deg, ${THEME.tealDark}, ${THEME.teal})`, color: 'white', borderColor: THEME.teal, boxShadow: '0 4px 12px rgba(13,148,136,0.35)' }
                        : { background: THEME.bg, color: '#475569', borderColor: '#d1ede8' }
                    }
                  >
                    <span className="text-base">{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>

              {/* DYNAMIC QRIS DISPLAY */}
              {paymentMethod === 'QRIS' && (
                <div className="flex flex-col items-center justify-center p-4 border border-dashed border-teal-200 rounded-2xl bg-teal-50/30 text-center space-y-3 shrink-0">
                  {loadingXendit ? (
                    <div className="text-center py-6">
                      <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menghubungi API Xendit...</p>
                    </div>
                  ) : errorXendit ? (
                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold text-center">
                      {errorXendit}
                    </div>
                  ) : xenditQrCode ? (
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(xenditQrCode)}`}
                        alt="QRIS Code Dinamis" 
                        className="w-32 h-32 object-contain animate-in fade-in duration-300"
                      />
                      <span className="text-[9px] font-black text-emerald-700 tracking-widest mt-2 uppercase">XENDIT DYNAMIC QRIS ⚡</span>
                      <span className="font-mono text-[8px] text-slate-400 font-bold">Merchant ID: {paymentSettings?.xendit_merchant_id || 'ID-AGRAPOS-DEMO'} | Tx ID: {tx.id}</span>
                      <p className="text-xs font-black text-slate-800 mt-2">Total Tagihan: {formatRp(tx.total)}</p>
                      <p className="text-[8px] text-slate-400 font-medium mt-0.5">Status pembayaran akan diperbarui secara otomatis setelah Anda melakukan transfer.</p>
                      
                      <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-mono text-[9px] text-center w-full">
                        <span className="font-bold text-slate-600">Simulasi CLI:</span><br/>
                        node simulate_payment.mjs {tx.id} {Math.round(tx.total)}
                      </div>
                      
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/xendit/webhook-payment`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                external_id: String(tx.id),
                                amount: tx.total
                              })
                            });
                            if (response.ok) {
                              setActionMsg({ type: 'success', text: 'Simulasi Bayar Terkirim! Status akan terupdate otomatis.' });
                            } else {
                              setActionMsg({ type: 'error', text: 'Gagal memicu simulasi.' });
                            }
                          } catch (err) {
                            setActionMsg({ type: 'error', text: 'Gagal terhubung ke backend.' });
                          }
                        }}
                        className="mt-2.5 w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer border-none"
                      >
                        ⚡ Simulasikan Pembayaran Sukses (Sandbox)
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-xs text-slate-400 font-bold">Gagal memuat QRIS.</div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentPanel(false)}
                  className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase border text-slate-500"
                  style={{ borderColor: '#d1ede8', background: 'white' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleUpdatePayment}
                  disabled={updating}
                  className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase text-white disabled:opacity-50"
                  style={{ background: THEME.orange }}
                >
                  {updating ? 'Menyimpan...' : 'Simpan Status'}
                </button>
              </div>
            </section>
          )}

          <p className="text-[10px] text-slate-300 font-mono text-center mt-4">No. Nota: {tx.invoice_number || tx.id || '-'}</p>

          {/* OPSI TAMBAHAN (Secondary Actions) */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handlePrint}
              className="py-2.5 rounded-xl text-[9px] font-black uppercase text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-100 transition flex flex-col items-center gap-1 justify-center"
            >
              <span className="text-sm">🖨️</span> Print Standar
            </button>
            {txStatus !== 'void' && txStatus !== 'refunded' ? (
              <>
                <button type="button" onClick={handleVoid} disabled={updating} className="py-2.5 rounded-xl text-[9px] font-black uppercase text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 transition flex flex-col items-center gap-1 justify-center">
                  <span className="text-sm">❌</span> Void
                </button>
                <button type="button" onClick={handleRefund} disabled={updating} className="py-2.5 rounded-xl text-[9px] font-black uppercase text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition flex flex-col items-center gap-1 justify-center">
                  <span className="text-sm">💸</span> Refund
                </button>
              </>
            ) : (
              <div className="col-span-2 flex items-center justify-center text-[10px] font-black uppercase text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                Status: {txStatus}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STICKY FOOTER RINGKAS */}
      <div
        className="shrink-0 fixed bottom-0 left-0 right-0 z-[1000000] px-4 py-3 sm:py-4 bg-white/90 backdrop-blur-md border-t border-slate-200/60 safe-area-pb"
      >
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrintBluetooth}
            className="flex-1 py-3.5 rounded-[1rem] text-[11px] font-black uppercase tracking-wider text-white flex items-center justify-center gap-2 cursor-pointer border-none shadow-lg shadow-teal-500/30 transition hover:brightness-110 active:scale-95"
            style={{ background: `linear-gradient(135deg, ${THEME.tealDark}, ${THEME.teal})` }}
          >
            <span className="text-sm">🔵</span> Cetak Bluetooth
          </button>
          <button
            type="button"
            onClick={handleSendWA}
            className="flex-1 py-3.5 rounded-[1rem] text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border-none shadow-lg shadow-emerald-500/20 transition hover:brightness-110 active:scale-95"
            style={{ background: '#10b981', color: 'white' }}
          >
            <span className="text-sm">💬</span> Kirim WA
          </button>
        </div>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-[99999999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl border border-emerald-100 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-sm animate-bounce">
              ✓
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Pembayaran Sukses!</h3>
              <p className="text-xs text-slate-500 font-medium">Transaksi #{tx.invoice_number || tx.id} berhasil diselesaikan.</p>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Nominal</p>
              <p className="text-2xl font-black text-emerald-600 font-mono">{formatRp(tx.total)}</p>
              <div className="flex justify-center gap-x-3 text-[10px] font-bold text-slate-600 uppercase mt-1">
                <span>Metode: {tx.payment_method}</span>
                <span>•</span>
                <span>Kasir: {meta.kasir || 'Kasir'}</span>
              </div>
            </div>

            {/* OPSI AKSI LANGSUNG */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handlePrintBluetooth();
                  setShowSuccessModal(false);
                }}
                className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shadow-lg shadow-teal-500/30 hover:brightness-110 active:scale-95 flex items-center justify-center gap-2 border-none cursor-pointer"
              >
                🔵 Cetak Bluetooth
              </button>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleSendWA();
                    setShowSuccessModal(false);
                  }}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-1.5 border-none cursor-pointer"
                >
                  💬 Kirim WA
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handlePrint();
                    setShowSuccessModal(false);
                  }}
                  className="flex-1 py-3 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-teal-100 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  🖨️ Print Standar
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition active:scale-95 cursor-pointer border-none"
            >
              ✕ Tutup & Lihat Detail
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function History({ transactions = [], tenantId, onTransactionUpdated }) {
  const defaultRange = useMemo(() => defaultMonthToTodayRange(), []);
  const [selectedTx, setSelectedTx] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [txPatches, setTxPatches] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);

  const displayTransactions = useMemo(
    () => transactions.map((row) => (txPatches[row.id] ? { ...row, ...txPatches[row.id] } : row)),
    [transactions, txPatches]
  );

  const dateFilteredTransactions = useMemo(
    () => displayTransactions.filter((t) => isInDateRange(t.created_at, dateFrom, dateTo)),
    [displayTransactions, dateFrom, dateTo]
  );

  const countAll = dateFilteredTransactions.length;
  const countPaid = dateFilteredTransactions.filter((t) => t.payment_method !== 'Belum Lunas').length;
  const countUnpaid = dateFilteredTransactions.filter((t) => t.payment_method === 'Belum Lunas').length;

  const filteredTransactions = useMemo(() => {
    let list = dateFilteredTransactions;
    if (filterStatus === 'paid') {
      list = list.filter((t) => t.payment_method !== 'Belum Lunas');
    } else if (filterStatus === 'unpaid') {
      list = list.filter((t) => t.payment_method === 'Belum Lunas');
    }
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [dateFilteredTransactions, filterStatus]);

  const stats = useMemo(() => {
    const total = dateFilteredTransactions.reduce((acc, t) => acc + (Number(t.total) || 0), 0);
    const unpaid = dateFilteredTransactions.filter((t) => t.payment_method === 'Belum Lunas').length;
    return { count: dateFilteredTransactions.length, total, unpaid };
  }, [dateFilteredTransactions]);

  const formatRangeLabel = (from, to) => {
    if (!from && !to) return 'Semua tanggal';
    if (from && to && from === to) {
      return new Date(from + 'T12:00:00').toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    const fmt = (key) =>
      key
        ? new Date(key + 'T12:00:00').toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : '…';
    return `${fmt(from)} – ${fmt(to)}`;
  };

  const handleSelect = (t, index) => {
    setSelectedTx(t);
    setSelectedIndex(index);
  };

  const handleBack = () => setSelectedTx(null);

  const handleTransactionUpdated = useCallback((updated) => {
    setSelectedTx(updated);
    setTxPatches((prev) => ({ ...prev, [updated.id]: updated }));
    onTransactionUpdated?.(updated);
  }, [onTransactionUpdated]);

  useEffect(() => {
    if (!selectedTx) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selectedTx]);

  return (
    <>
      <div className="relative min-h-[calc(100vh-140px)] bg-slate-50 pb-28 overflow-x-hidden -mt-4 -mx-4 sm:-mt-6 sm:-mx-6 lg:-mt-8 lg:-mx-8 font-sans">
        {/* BACKGROUND HEADER */}
        <div className="absolute top-0 left-0 right-0 h-64 md:h-76 bg-gradient-to-b from-teal-700 via-teal-600 to-transparent rounded-b-[3rem] z-0 opacity-95">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.12),transparent_50%)]" />
        </div>

        <div className="relative z-10 w-full px-4 sm:px-8 pt-10 md:pt-12 space-y-6">
          <header className="text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-orange-300 text-xs md:text-sm font-black uppercase tracking-widest drop-shadow-sm">
                Sistem POS Multi-Tenant
              </p>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight drop-shadow-sm mt-1 uppercase">
                Riwayat Transaksi
              </h1>
              <p className="text-teal-100 text-[10px] md:text-xs font-semibold uppercase tracking-wider mt-1 opacity-80">
                Ketuk nota untuk lihat detail lengkap
              </p>
            </div>
          </header>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 mb-4 space-y-3 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: THEME.teal }}>
                  Filter Rentang Tanggal
                </p>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                  {formatRangeLabel(dateFrom, dateTo)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const r = defaultMonthToTodayRange();
                  setDateFrom(r.from);
                  setDateTo(r.to);
                }}
                className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border cursor-pointer hover:bg-slate-50"
                style={{ borderColor: '#d1ede8', color: THEME.tealDark, background: THEME.tealLight }}
              >
                Bulan Ini
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dari</span>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1 w-full text-sm font-bold border-2 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-teal-400"
                  style={{ borderColor: '#d1ede8' }}
                />
              </label>
              <label className="block">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sampai</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1 w-full text-sm font-bold border-2 rounded-xl px-3 py-2 bg-slate-50 focus:outline-none focus:border-teal-400"
                  style={{ borderColor: '#d1ede8' }}
                />
              </label>
            </div>
          </div>

          {dateFilteredTransactions.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
              <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase">Nota Transaksi</p>
                <p className="text-xl font-black text-slate-800">{stats.count}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase">Total Omzet</p>
                <p className="text-sm sm:text-lg font-black" style={{ color: THEME.teal }}>{formatRp(stats.total)}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase">Belum Lunas (Bon)</p>
                <p className="text-xl font-black" style={{ color: stats.unpaid > 0 ? THEME.orange : '#cbd5e1' }}>{stats.unpaid}</p>
              </div>
            </div>
          )}

          {dateFilteredTransactions.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-2">
              {[
                { id: 'all', label: 'Semua', count: countAll, bg: THEME.teal, text: 'white' },
                { id: 'paid', label: 'Sudah Bayar', count: countPaid, bg: '#059669', text: 'white' },
                { id: 'unpaid', label: 'Belum Bayar (Bon)', count: countUnpaid, bg: THEME.orange, text: 'white' }
              ].map(f => {
                const isActive = filterStatus === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilterStatus(f.id)}
                    className={isActive ? UI.filterActive : UI.filterIdle}
                    style={isActive ? (f.id === 'unpaid' ? { background: THEME.orange, color: 'white' } : { background: f.bg, color: f.text }) : {}}
                  >
                    {f.label} ({f.count})
                  </button>
                );
              })}
            </div>
          )}

          {filteredTransactions.length > 0 ? (
            <div className={`${UI.listWrap} pb-4`}>
              {filteredTransactions.map((t, index) => (
                <TransactionListRow
                  key={t.id || `tx-${index}`}
                  t={t}
                  index={index}
                  onSelect={() => handleSelect(t, index)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="flex justify-center mb-4" style={{ color: `${THEME.teal}50` }}>
                <IconHistory />
              </div>
              <p className="font-black text-sm uppercase tracking-wide" style={{ color: THEME.tealDark }}>
                {filterStatus === 'all' ? 'Tidak ada transaksi di rentang ini' : 'Tidak ada transaksi cocok'}
              </p>
              <p className="text-slate-400 text-xs font-medium mt-2">
                {filterStatus === 'all'
                  ? 'Ubah rentang tanggal atau tunggu transaksi baru dari kasir.'
                  : 'Coba ubah filter status atau rentang tanggal.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedTx &&
        createPortal(
          <TransactionDetailScreen
            key={selectedTx.id}
            t={selectedTx}
            index={selectedIndex}
            onBack={handleBack}
            tenantId={tenantId}
            onUpdated={handleTransactionUpdated}
          />,
          document.body
        )}
    </>
  );
}
