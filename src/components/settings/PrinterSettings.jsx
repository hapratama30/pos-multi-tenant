/*eslint-disable*/
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

// ─── FORMAT ANGKA ─────────────────────────────────────────────────────────────
const formatRp = (num) => Math.round(Number(num) || 0).toLocaleString('id-ID');
const formatQty = (qty) => {
  const n = Number(qty) || 0;
  return n % 1 === 0 ? n.toFixed(2) : parseFloat(n.toFixed(2)).toString();
};

// ─── SKELETON PLACEHOLDER ─────────────────────────────────────────────────────
function SkeletonLine({ w = '100%', h = '10px' }) {
  return (
    <div style={{ width: w, height: h, borderRadius: '4px', background: 'linear-gradient(90deg,#e0f0ee 25%,#c8e8e2 50%,#e0f0ee 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
  );
}

// ─── KOMPONEN PREVIEW STRUK THERMAL ───────────────────────────────────────────
function ReceiptPreview({
  printerSize, headerText, footerText, thankYouText, showLogo, storeLogo, storeName, storeAddress, storePhone,
  showQty, showSubtotal, showCatatan, showKasir, separatorStyle,
  transaction, loadingTx, staffName, paymentInfo
}) {
  const width = printerSize === '58mm' ? 220 : 302;
  const fontSize = printerSize === '58mm' ? '9px' : '10px';
  const titleSize = printerSize === '58mm' ? '11px' : '13px';
  const totalSize = printerSize === '58mm' ? '12px' : '14px';

  const items = Array.isArray(transaction?.items) ? transaction.items : [];
  const notes = transaction?.notes || '';
  const createdAt = transaction?.created_at
    ? new Date(transaction.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : '-';

  const estMatch = notes.match(/\[Est\. Selesai: ([^\]]+)\]/);
  const estimasiStr = estMatch ? estMatch[1] : '-';
  const kasirStr = staffName || 'Kasir';

  const custMatch = notes.match(/\[Customer:\s*([^|\]]+)(?:\s*\|\s*Tlp:\s*([^\]]+))?\]/i);
  const custName = custMatch ? custMatch[1].trim() : 'Guest (Umum)';
  const custPhone = custMatch && custMatch[2] && custMatch[2].trim() !== '-' ? custMatch[2].trim() : '';
  const catatanMatch = notes.match(/^Catatan: ([^\[]+)/);
  const catatanStr = catatanMatch ? catatanMatch[1].trim() : '';
  const diskonMatch = notes.match(/\[Diskon: Rp ([^\]]+)\]/);
  const diskonStr = diskonMatch ? diskonMatch[1] : '';
  const biayaMatch = notes.match(/\[Biaya Tambahan: Rp ([^\]]+)\]/);
  const biayaStr = biayaMatch ? biayaMatch[1] : '';

  const total = Number(transaction?.total) || 0;
  const payMethod = transaction?.payment_method || '-';
  const status = payMethod === 'Belum Lunas' ? 'BELUM LUNAS' : 'LUNAS';
  const invoiceId = transaction?.id || '-';

  return (
    <div
      className="font-mono text-black bg-white shadow-2xl mx-auto"
      style={{
        width: `${width}px`, minWidth: `${width}px`, fontSize,
        padding: '16px 12px', borderRadius: '4px', lineHeight: '1.5',
        border: '1px solid #e2e8f0', fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>

      {/* HEADER NAMA TOKO PALING ATAS STRUK */}
      {(headerText || storeName) && (
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          {showLogo && storeLogo && (
            <div style={{ marginBottom: '6px' }}>
              <img src={storeLogo} alt="Logo" style={{ maxHeight: '50px', maxWidth: '100px', margin: '0 auto', objectFit: 'contain' }} />
            </div>
          )}
          {showLogo && !storeLogo && <div style={{ fontSize: '20px', marginBottom: '2px' }}>🏪</div>}
          {storeName && (
            <div style={{ fontWeight: '900', fontSize: titleSize, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {storeName}
            </div>
          )}
          {storeAddress && <div style={{ fontSize: '8px', color: '#555', whiteSpace: 'pre-wrap' }}>{storeAddress}</div>}
          {storePhone && <div style={{ fontSize: '8px', color: '#555' }}>Tlp: {storePhone}</div>}
          {headerText && <div style={{ fontSize: '8px', marginTop: '3px', fontStyle: 'italic', color: '#444', whiteSpace: 'pre-wrap' }}>{headerText}</div>}
        </div>
      )}

      <div style={{ borderTop: separatorStyle === 'dash' ? '1px dashed #999' : '1px solid #333', margin: '6px 0' }} />

      {/* INFO TRANSAKSI */}
      {loadingTx ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '6px' }}>
          <SkeletonLine /><SkeletonLine w="80%" /><SkeletonLine w="70%" />
          <SkeletonLine /><SkeletonLine w="80%" /><SkeletonLine w="70%" />
        </div>
      ) : (
        <div style={{ marginBottom: '6px' }}>
          <div style={{ fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', margin: '8px 0 4px 0', lineHeight: '1.2', textAlign: 'center' }}>
            {custName}
          </div>
          {custPhone && <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '6px', textAlign: 'center' }}>Tlp: {custPhone}</div>}
          
          <div style={{ borderTop: '1px dashed #eee', margin: '6px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#555' }}>No Invoice</span>
            <span style={{ fontWeight: '900' }}>#{invoiceId}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#555' }}>Waktu</span>
            <span>{createdAt}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#555' }}>Est. Selesai</span>
            <span>{estimasiStr}</span>
          </div>
          {showKasir && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#555' }}>Kasir</span>
              <span style={{ fontWeight: '900' }}>{kasirStr}</span>
            </div>
          )}
        </div>
      )}

      <div style={{ borderTop: separatorStyle === 'dash' ? '1px dashed #999' : '1px solid #333', margin: '6px 0' }} />

      {/* ITEMS */}
      {loadingTx ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '6px' }}>
          <SkeletonLine /><SkeletonLine w="90%" /><SkeletonLine /><SkeletonLine w="85%" />
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#aaa', fontSize: '8px', padding: '8px 0' }}>
          — Belum ada item —
        </div>
      ) : (
        <div style={{ marginBottom: '6px' }}>
          {items.map((item, i) => {
            const price = Number(item.price) || 0;
            const qty = Number(item.qty) || 0;
            const subtotal = price * qty;
            return (
              <div key={i} style={{ marginBottom: '5px' }}>
                <div style={{ fontWeight: '900', textTransform: 'uppercase' }}>{item.name}</div>
                {item.variant && <div style={{ color: '#666', fontSize: '8px' }}>({item.variant})</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {showQty
                    ? <span style={{ color: '#555' }}>{formatQty(qty)} × {formatRp(price)}</span>
                    : <span style={{ color: '#555' }}>{formatRp(price)}</span>
                  }
                  {showSubtotal && <span style={{ fontWeight: '700' }}>{formatRp(subtotal)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ borderTop: separatorStyle === 'dash' ? '1px dashed #999' : '1px solid #333', margin: '6px 0' }} />

      {/* TOTAL */}
      {loadingTx ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '4px' }}>
          <SkeletonLine w="60%" /><SkeletonLine w="70%" /><SkeletonLine />
        </div>
      ) : (
        <div style={{ marginBottom: '4px' }}>
          {diskonStr && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c00' }}>
              <span>Diskon</span>
              <span>- {diskonStr}</span>
            </div>
          )}
          {biayaStr && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#555' }}>Biaya Tambahan</span>
              <span>+ {biayaStr}</span>
            </div>
          )}
          <div style={{ borderTop: '1px solid #333', margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: totalSize }}>
            <span>TOTAL</span>
            <span>{formatRp(total)}</span>
          </div>
        </div>
      )}

      <div style={{ borderTop: separatorStyle === 'dash' ? '1px dashed #999' : '1px solid #333', margin: '6px 0' }} />

      {/* STATUS */}
      <div style={{ textAlign: 'center', margin: '4px 0' }}>
        <div style={{ fontWeight: '900', fontSize: totalSize, letterSpacing: '0.05em' }}>
          ★ {status} ★
        </div>
        <div style={{ fontSize: '8px', color: '#555' }}>Metode: {payMethod}</div>
      </div>

      {/* INFO PEMBAYARAN — tersinkron dari Payment Settings */}
      {paymentInfo && (() => {
        const { vaNumbers = [], transferBanks = [], ewalletNumbers = [], qrisMerchantId, qrisStatus } = paymentInfo;
        const hasQris     = !!qrisMerchantId;
        const hasVA       = vaNumbers.length > 0;
        const hasTransfer = transferBanks.length > 0;
        const hasEwallet  = ewalletNumbers.length > 0;
        if (!hasQris && !hasVA && !hasTransfer && !hasEwallet) return null;
        return (
          <>
            <div style={{ borderTop: separatorStyle === 'dash' ? '1px dashed #999' : '1px solid #333', margin: '6px 0' }} />
            <div style={{ marginBottom: '4px' }}>
              <div style={{ fontWeight: '900', textAlign: 'center', fontSize: '8px', letterSpacing: '0.08em', marginBottom: '5px' }}>— INFO PEMBAYARAN —</div>
              {hasQris && (
                <div style={{ marginBottom: '4px', textAlign: 'center' }}>
                  <div style={{ fontWeight: '900', fontSize: '8px', marginBottom: '4px' }}>SCAN QRIS (Merchant):</div>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://agrapos.dev/merchant/${qrisMerchantId}`} 
                    alt="QRIS" 
                    style={{ margin: '0 auto', width: '80px', height: '80px' }} 
                  />
                  <div style={{ fontSize: '7.5px', color: '#444', fontFamily: 'monospace', marginTop: '2px' }}>ID: {qrisMerchantId}</div>
                </div>
              )}
              {hasVA && vaNumbers.map((va, i) => (
                <div key={i} style={{ marginBottom: '3px' }}>
                  <div style={{ fontWeight: '900', fontSize: '8px' }}>🏦 VA {va.bank}</div>
                  <div style={{ fontSize: '7.5px', color: '#444', fontFamily: 'monospace' }}>{va.number}</div>
                  {va.name && <div style={{ fontSize: '7px', color: '#666' }}>a/n {va.name}</div>}
                </div>
              ))}
              {hasTransfer && transferBanks.map((t, i) => (
                <div key={i} style={{ marginBottom: '3px' }}>
                  <div style={{ fontWeight: '900', fontSize: '8px' }}>💳 {t.bank}</div>
                  <div style={{ fontSize: '7.5px', color: '#444', fontFamily: 'monospace' }}>{t.number}</div>
                  {t.name && <div style={{ fontSize: '7px', color: '#666' }}>a/n {t.name}</div>}
                </div>
              ))}
              {hasEwallet && ewalletNumbers.map((ew, i) => (
                <div key={i} style={{ marginBottom: '3px' }}>
                  <div style={{ fontWeight: '900', fontSize: '8px' }}>📲 {ew.provider}</div>
                  <div style={{ fontSize: '7.5px', color: '#444', fontFamily: 'monospace' }}>{ew.number}</div>
                  {ew.name && <div style={{ fontSize: '7px', color: '#666' }}>a/n {ew.name}</div>}
                </div>
              ))}
            </div>
          </>
        );
      })()}

      {/* CATATAN */}
      {showCatatan && catatanStr && (
        <>
          <div style={{ borderTop: separatorStyle === 'dash' ? '1px dashed #999' : '1px solid #333', margin: '6px 0' }} />
          <div style={{ fontSize: '8px', color: '#444' }}>📝 {catatanStr}</div>
        </>
      )}


      {/* FOOTER */}
      {footerText && (
        <>
          <div style={{ borderTop: separatorStyle === 'dash' ? '1px dashed #999' : '1px solid #333', margin: '6px 0' }} />
          <div style={{ textAlign: 'center', fontSize: '8px', color: '#444', fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>
            {footerText}
          </div>
        </>
      )}

      <div style={{ textAlign: 'center', fontSize: '7px', color: '#444', marginTop: '8px', fontWeight: 'bold', whiteSpace: 'pre-wrap' }}>
        {thankYouText || 'Terima kasih atas kunjungan Anda'}
      </div>
    </div>
  );
}

// ─── PREVIEW FORMAT PESAN WA (NAMA TOKO REAL WAJIB PALING ATAS) ───────────────
function WAPreview({
  waGreeting, waGreetingCustomer, waClosing, waClosingStore, thankYouText, headerText, footerText, showEstimasi, showKasirWA,
  showItemDetail, storeName, tenantRealName, storeAddress, storePhone, transaction, loadingTx, staffName, separatorStyle,
  paymentInfo
}) {
  if (loadingTx || !transaction) return null;

  const items = Array.isArray(transaction.items) ? transaction.items : [];
  const notes = transaction?.notes || '';
  const createdAt = transaction?.created_at
    ? new Date(transaction.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : '-';
  const estMatch = notes.match(/\[Est\. Selesai: ([^\]]+)\]/);
  const estimasiStr = estMatch ? estMatch[1] : '-';
  const kasirStr = staffName || 'Kasir';
  const custMatch = notes.match(/\[Customer: ([^\|]+)/);
  const custName = custMatch ? custMatch[1].trim() : 'Guest (Umum)';
  const custPhoneMatch = notes.match(/Tlp: ([^\]|]+)/);
  const custPhone = custPhoneMatch ? custPhoneMatch[1].trim() : '';
  const catatanMatch = notes.match(/^Catatan: ([^\[]+)/);
  const catatanStr = catatanMatch ? catatanMatch[1].trim() : '';
  const diskonMatch = notes.match(/\[Diskon: Rp ([^\]]+)\]/);
  const diskonStr = diskonMatch ? diskonMatch[1] : '';
  const biayaMatch = notes.match(/\[Biaya Tambahan: Rp ([^\]]+)\]/);
  const biayaStr = biayaMatch ? biayaMatch[1] : '';
  const total = Number(transaction?.total) || 0;
  const payMethod = transaction?.payment_method || '-';
  const status = payMethod === 'Belum Lunas' ? 'BELUM LUNAS' : 'LUNAS';
  const invoiceId = transaction?.id || '-';

  const lineSeparator = separatorStyle === 'dash' ? '--------------------------------' : '================================';

  // NAMA TOKO WA MENGGUNAKAN VALUE INPUTAN MANUAL WA_CLOSING_STORE
  const namaUsahaFix = waClosingStore || storeName || tenantRealName || 'TOKO KAMI';

  // 1. HEADER TOKO UTAMA (PALING ATAS SENDIRI)
  let waHeaderStore = `*${namaUsahaFix.toUpperCase()}*`;
  if (storeAddress) waHeaderStore += `\n_${storeAddress}_`;
  if (storePhone) waHeaderStore += `\nTlp: ${storePhone}`;
  if (headerText) waHeaderStore += `\n_${headerText}_`;

  // 2. SALAM & PENGANTAR UNTUK PELANGGAN
  const greeting = `${waGreeting} *${custName}* 👋\n${waGreetingCustomer}`;

  // 3. INFO TRANSAKSI KAYA DI STRUK
  let waTxInfo = `No Invoice: *#${invoiceId}*\nWaktu: ${createdAt}`;
  if (showEstimasi) waTxInfo += `\nEst. Selesai: ${estimasiStr}`;
  waTxInfo += `\nPelanggan: *${custName}*`;
  if (showKasirWA) waTxInfo += `\nKasir: *${kasirStr}*`;

  // 4. RINCIAN ITEMS KAYA DI STRUK
  const itemLines = items.map(item => {
    const price = Number(item.price) || 0;
    const qty = Number(item.qty) || 0;
    const subtotal = price * qty;
    let res = `*${item.name.toUpperCase()}*`;
    if (item.variant) res += ` (${item.variant})`;
    if (showItemDetail) {
      res += `\n${formatQty(qty)} × ${formatRp(price)} = *${formatRp(subtotal)}*`;
    }
    return res;
  }).join('\n\n');

  // 5. TOTAL KAYA DI STRUK
  let waTotalSection = '';
  if (diskonStr) waTotalSection += `🧧 Diskon: *- ${diskonStr}*\n`;
  if (biayaStr) waTotalSection += `➕ Biaya Tambahan: *+ ${biayaStr}*\n`;
  waTotalSection += `*TOTAL: ${formatRp(total)}*`;

  // 6. STATUS KAYA DI STRUK
  const waStatusSection = `★ *${status}* ★\nMetode: ${payMethod}`;

  // 7. INFO PEMBAYARAN (dari Payment Settings — tersinkron)
  let waPaymentInfo = '';
  if (paymentInfo) {
    const { vaNumbers = [], transferBanks = [], ewalletNumbers = [], qrisMerchantId, qrisStatus } = paymentInfo;
    const hasQris     = qrisStatus === 'Aktif' && qrisMerchantId;
    const hasVA       = vaNumbers.length > 0;
    const hasTransfer = transferBanks.length > 0;
    const hasEwallet  = ewalletNumbers.length > 0;
    if (hasQris || hasVA || hasTransfer || hasEwallet) {
      waPaymentInfo = `📋 *INFO PEMBAYARAN*\n`;
      if (hasQris) waPaymentInfo += `📱 QRIS: Merchant ${qrisMerchantId} (Scan QR)\n`;
      if (hasVA)   vaNumbers.forEach(va => { waPaymentInfo += `🏦 VA ${va.bank}: *${va.number}*${va.name ? ` (a/n ${va.name})` : ''}\n`; });
      if (hasTransfer) transferBanks.forEach(t => { waPaymentInfo += `💳 ${t.bank}: *${t.number}*${t.name ? ` (a/n ${t.name})` : ''}\n`; });
      if (hasEwallet)  ewalletNumbers.forEach(ew => { waPaymentInfo += `📲 ${ew.provider}: *${ew.number}*${ew.name ? ` (a/n ${ew.name})` : ''}\n`; });
      waPaymentInfo += `${lineSeparator}\n`;
    }
  }

  // 8. CATATAN & FOOTER KAYA DI STRUK
  const waCatatanLine = catatanStr ? `📝 Catatan: _${catatanStr}_\n${lineSeparator}\n` : '';
  const waFooterLine = footerText ? `_${footerText}_\n${lineSeparator}\n` : '';
  const waThankYouLine = `— *${thankYouText || 'Terima kasih atas kunjungan Anda'}* —`;

  // 9. CLOSING
  const closing = `${waClosing}`;

  // MERGE FORMAT STRUK WA: NAMA TOKO TETAP DI PALING ATAS
  const text = `${waHeaderStore}\n${lineSeparator}\n${greeting}\n\n${lineSeparator}\n${waTxInfo}\n${lineSeparator}\n${itemLines}\n${lineSeparator}\n${waTotalSection}\n${lineSeparator}\n${waStatusSection}\n${lineSeparator}\n${waPaymentInfo}${waCatatanLine}${waFooterLine}${waThankYouLine}\n\n${closing}`;

  return (
    <div className="bg-[#e5ddd5] rounded-2xl p-4" style={{ fontFamily: 'system-ui, sans-serif', fontSize: '12px' }}>
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-black/10">
        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-black">
          {(custName[0] || 'G').toUpperCase()}
        </div>
        <div>
          <p className="font-black text-[11px] text-slate-800">{custName}</p>
          <p className="text-[9px] text-slate-500">{custPhone || 'No telp tidak tersedia'}</p>
        </div>
      </div>
      <div className="flex justify-end">
        <div className="max-w-[90%] bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-3 py-2 shadow-sm relative">
          <pre className="text-[9px] whitespace-pre-wrap text-slate-800 font-mono leading-relaxed">{text}</pre>
          <div className="text-[8px] text-slate-400 text-right mt-1">
            {new Date(transaction.created_at || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ✓✓
          </div>
          <div className="absolute top-0 right-[-6px] w-0 h-0"
            style={{ borderLeft: '6px solid #dcf8c6', borderBottom: '6px solid transparent' }} />
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function PrinterSettings({ tenantId, selectedOutletId, onBack }) {
  const [printerSize, setPrinterSize] = useState('58mm');
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [thankYouText, setThankYouText] = useState('Terima kasih atas kunjungan Anda');
  const [storeLogo, setStoreLogo] = useState('');

  // STATE IDENTITAS TOKO STRUK
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [showLogo, setShowLogo] = useState(true);

  // STATE OPSI TOGGLE STRUK
  const [showQty, setShowQty] = useState(true);
  const [showSubtotal, setShowSubtotal] = useState(true);
  const [showCatatan, setShowCatatan] = useState(true);
  const [showKasir, setShowKasir] = useState(true);
  const [separatorStyle, setSeparatorStyle] = useState('dash');

  // STATE FORMAT WA TERPISAH
  const [waGreeting, setWaGreeting] = useState('Halo Kak');
  const [waGreetingCustomer, setWaGreetingCustomer] = useState('Berikut adalah rincian nota transaksi digital Anda:');
  const [waClosing, setWaClosing] = useState('Terima kasih telah berbelanja di tempat kami! 🙏');
  const [waClosingStore, setWaClosingStore] = useState(''); // State Input Manual Nama Toko Atas WA

  const [showEstimasi, setShowEstimasi] = useState(true);
  const [showKasirWA, setShowKasirWA] = useState(true);
  const [showItemDetail, setShowItemDetail] = useState(true);

  // STATE DB & REAL DATA
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('struk');
  const [previewMode, setPreviewMode] = useState(true);
  const [staffName, setStaffName] = useState('');
  const [tenantRealName, setTenantRealName] = useState('');
  const [lastTransaction, setLastTransaction] = useState(null);
  const [loadingTx, setLoadingTx] = useState(true);

  // STATE PAYMENT INFO (untuk ditampilkan di preview struk & WA)
  const [paymentInfo, setPaymentInfo] = useState(null);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMsg({ type: 'error', text: 'File harus berupa gambar (PNG, JPG, WEBP).' });
      return;
    }
    if (file.size > 800 * 1024) {
      setMsg({ type: 'error', text: 'Ukuran logo maksimal 800 KB.' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setStoreLogo(reader.result);
      setMsg({ type: 'info', text: 'Logo terunggah. Klik "Simpan Konfigurasi" agar muncul di cetak nota.' });
    };
    reader.readAsDataURL(file);
  };

  const fetchTenantData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('tenant_name')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (!error && data) {
        setTenantRealName(data.tenant_name);
      }
    } catch (err) {
      console.error('Error fetching tenant:', err);
    }
  }, [tenantId]);

  const fetchStaffData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('staff')
          .select('name')
          .eq('email', user.email)
          .eq('tenant_id', tenantId)
          .maybeSingle();
        if (!error && data?.name) {
          setStaffName(data.name);
        } else {
          setStaffName(user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kasir');
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [tenantId]);

  const fetchLastTransaction = useCallback(async () => {
    try {
      setLoadingTx(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error && data) setLastTransaction(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTx(false);
    }
  }, [tenantId]);

  const fetchPrinterData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: printerData } = await supabase
        .from('printer_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('outlet_id', selectedOutletId)
        .maybeSingle();

      // Fetch general payment settings (for xendit merchant id and status)
      const { data: generalSettings } = await supabase
        .from('payment_settings')
        .select('xendit_merchant_id, xendit_qris_status')
        .eq('tenant_id', tenantId)
        .eq('outlet_id', selectedOutletId)
        .maybeSingle();

      if (printerData) {
        setPrinterSize(printerData.printer_size || '58mm');
        setHeaderText(printerData.receipt_header || '');
        setFooterText(printerData.receipt_footer || '');
        setThankYouText(printerData.thank_you_text || 'Terima kasih atas kunjungan Anda');
        setStoreLogo(printerData.store_logo_url || '');
        setStoreName(printerData.store_name || '');
        setStoreAddress(printerData.store_address || '');
        setStorePhone(printerData.store_phone || '');
        setShowLogo(printerData.show_logo !== false);
        setShowQty(printerData.show_qty !== false);
        setShowSubtotal(printerData.show_subtotal !== false);
        setShowCatatan(printerData.show_catatan !== false);
        setShowKasir(printerData.show_kasir !== false);
        setSeparatorStyle(printerData.separator_style || 'dash');

        setWaGreeting(printerData.wa_greeting || 'Halo Kak');
        setWaGreetingCustomer(printerData.wa_greeting_cust || 'Berikut adalah rincian nota transaksi digital Anda:');
        setWaClosing(printerData.wa_closing || 'Terima kasih telah berbelanja di tempat kami!');
        setWaClosingStore(printerData.wa_closing_store || '');

        setShowEstimasi(printerData.wa_show_estimasi !== false);
        setShowKasirWA(printerData.wa_show_kasir !== false);
        setShowItemDetail(printerData.wa_show_item_detail !== false);
      }

      // Sync payment info untuk preview struk & WA secara relasional
      const { data: accounts } = await supabase
        .from('payment_accounts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('outlet_id', selectedOutletId);

      const va = (accounts || []).filter(a => a.type === 'va').map(a => ({ bank: a.provider, number: a.number, name: a.name }));
      const transfer = (accounts || []).filter(a => a.type === 'transfer').map(a => ({ bank: a.provider, number: a.number, name: a.name }));
      const ewallet = (accounts || []).filter(a => a.type === 'ewallet').map(a => ({ provider: a.provider, number: a.number, name: a.name }));

      setPaymentInfo({
        vaNumbers:      va,
        transferBanks:  transfer,
        ewalletNumbers: ewallet,
        qrisMerchantId: generalSettings?.xendit_merchant_id || '',
        qrisStatus:     generalSettings?.xendit_qris_status  || 'Belum Terdaftar',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, selectedOutletId]);

  useEffect(() => {
    fetchPrinterData();
    fetchLastTransaction();
    fetchStaffData();
    fetchTenantData();
  }, [fetchPrinterData, fetchLastTransaction, fetchStaffData, fetchTenantData]);

  const handleSavePrinter = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const { error } = await supabase
        .from('printer_settings')
        .upsert({
          tenant_id: tenantId,
          outlet_id: selectedOutletId,
          printer_size: printerSize,
          receipt_header: headerText,
          receipt_footer: footerText,
          thank_you_text: thankYouText,
          store_logo_url: storeLogo,
          store_name: storeName,
          store_address: storeAddress,
          store_phone: storePhone,
          show_logo: showLogo,
          show_qty: showQty,
          show_subtotal: showSubtotal,
          show_catatan: showCatatan,
          show_kasir: showKasir,
          separator_style: separatorStyle,
          wa_greeting: waGreeting,
          wa_greeting_cust: waGreetingCustomer,
          wa_closing: waClosing,
          wa_closing_store: waClosingStore,
          wa_show_estimasi: showEstimasi,
          wa_show_kasir: showKasirWA,
          wa_show_item_detail: showItemDetail,
          updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id, outlet_id' });
      if (error) throw error;
      setMsg({ type: 'success', text: '✅ Konfigurasi berhasil disimpan!' });
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Gagal menyimpan setting' });
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ value, onChange, label, description }) => (
    <div className="flex items-center justify-between py-2.5 border-b last:border-0" style={{ borderColor: '#f0faf8' }}>
      <div className="flex-1 pr-4">
        <p className="text-[10px] font-black text-slate-700 uppercase tracking-wide">{label}</p>
        {description && <p className="text-[8px] text-slate-400 font-bold mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className="flex-shrink-0 relative w-10 h-5 rounded-full transition-all duration-200"
        style={{ background: value ? 'var(--ps-teal)' : '#cbd5e1' }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200"
          style={{ transform: value ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="pb-32 bg-[#F8FAFC] min-h-screen font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Memuat Konfigurasi...</p>
        </div>
      </div>
    );
  }

  const IconChevronLeft = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  );

  return (
    <div className="pb-32 bg-[#F8FAFC] min-h-screen font-sans">
      <style>{`
        :root {
          --ps-teal: #0d9488;
          --ps-teal-dark: #0f766e;
          --ps-teal-light: #f0fdfa;
        }
        .ps-input {
          background: #f8fafc; border: 1px solid rgba(226,232,240,0.6); border-radius: 1rem;
          padding: 1rem 1rem 1rem 3rem; font-size: 0.875rem; font-weight: 700; outline: none; width: 100%; color: #334155;
          transition: all 0.2s ease;
        }
        .ps-input:focus { border-color: var(--ps-teal); box-shadow: 0 0 0 4px rgba(13,148,136,0.1); background: white; }
        .ps-card { background: white; border: 1px solid rgba(226,232,240,0.6); border-radius: 2.5rem; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .ps-tab-active { background: var(--ps-teal); color: white; border-radius: 1.5rem; }
        .ps-tab-inactive { background: white; color: #64748b; border: 1px solid #e2e8f0; border-radius: 1.5rem; }
        .ps-section-title {
          font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase;
          letter-spacing: 0.15em; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;
        }
        .ps-section-title::after { content: ''; flex: 1; height: 1px; background: #f1f5f9; }
      `}</style>

      <div className="px-4 sm:px-6 pt-6 space-y-6">

        {/* TOMBOL BACK */}
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-3.5 rounded-[1.5rem] shadow-sm text-[10px] font-black text-slate-800 active:scale-95 transition-all uppercase tracking-widest hover:border-slate-300"
          >
            <IconChevronLeft />
            Kembali
          </button>
        </div>

        {/* PAGE HEADER */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight uppercase">Pengaturan Struk & WA</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Konfigurasi format nota & pesan WhatsApp digital</p>
          </div>
          {msg && (
            <div className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase shadow-sm border shrink-0 flex items-center gap-1.5 ${
              msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : msg.type === 'info' ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {msg.type === 'success' ? '✓' : msg.type === 'info' ? 'ℹ' : '✕'} {msg.text}
            </div>
          )}
        </header>

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-2xl border border-teal-100 shrink-0">🖨️</div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Ukuran Printer</span>
              <p className="text-sm font-black text-teal-700 uppercase mt-0.5">{printerSize}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-2xl border border-orange-100 shrink-0">📲</div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Format WA</span>
              <p className="text-xs font-black text-slate-800 mt-0.5 truncate">{waGreeting || 'Halo Kak'}...</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-2xl border border-teal-100 shrink-0">👁️</div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Preview</span>
              <p className="text-sm font-black mt-0.5">
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${previewMode ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {previewMode ? 'Aktif' : 'Disembunyikan'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex gap-2 flex-wrap items-center">
          {[
            { key: 'struk', label: '🖨️ Format Struk Thermal' },
            { key: 'wa', label: '📲 Format Pesan WA' },
          ].map(tab => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-[10px] font-black uppercase tracking-wider transition-all duration-200 shadow-sm ${
                activeTab === tab.key ? 'ps-tab-active shadow-md' : 'ps-tab-inactive hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          <button type="button" onClick={() => setPreviewMode(p => !p)}
            className="px-5 py-3 text-[10px] font-black uppercase tracking-wider transition-all duration-200 rounded-[1.5rem]"
            style={{
              background: previewMode ? '#fff7ed' : 'white',
              color: previewMode ? '#ea580c' : '#64748b',
              border: previewMode ? '1px solid #ffedd5' : '1px solid #e2e8f0'
            }}
          >
            {previewMode ? '👁 Sembunyikan Preview' : '👁 Tampilkan Preview'}
          </button>
        </div>

        <form onSubmit={handleSavePrinter}>
          <div className={`flex gap-6 ${previewMode ? 'flex-col lg:flex-row' : 'flex-col'}`}>

            {/* LEFT INPUT COLUMN */}
            <div className={`space-y-4 ${previewMode ? 'flex-1' : 'w-full max-w-3xl'}`}>

              {activeTab === 'struk' && (
                <>
                  {/* IDENTITAS TOKO */}
                  <div className="ps-card space-y-4">
                    <p className="ps-section-title">🏪 Identitas Toko</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-black uppercase mb-1.5 text-slate-400 tracking-wider">Nama Toko Display</label>
                        <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Contoh: Kopi Nusantara" className="ps-input" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase mb-1.5 text-slate-400 tracking-wider">No. Telepon Toko</label>
                        <input type="text" value={storePhone} onChange={e => setStorePhone(e.target.value)} placeholder="Contoh: 021-12345678" className="ps-input" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase mb-1.5 text-slate-400 tracking-wider">Alamat Toko</label>
                      <textarea value={storeAddress} onChange={e => setStoreAddress(e.target.value)} placeholder="Contoh: Jl. Raya No.1" className="ps-input min-h-[80px]" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase mb-1.5 text-slate-400 tracking-wider">Upload Foto/Logo Usaha</label>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="ps-input text-slate-500 text-[10px] file:mr-4 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[9px] file:font-black file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
                      {storeLogo && (
                        <div className="mt-2 flex items-center gap-2">
                          <img src={storeLogo} alt="Logo" className="h-10 w-20 object-contain border rounded-xl p-1 bg-slate-50" />
                          <button type="button" onClick={() => setStoreLogo('')} className="text-[9px] text-rose-500 font-bold hover:underline">Hapus</button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ps-card space-y-4">
                    <p className="ps-section-title">📐 Ukuran & Teks Struk</p>
                    <div>
                      <label className="block text-[9px] font-black uppercase mb-1.5 text-slate-400 tracking-wider">Teks Header (Paling Atas)</label>
                      <textarea value={headerText} onChange={e => setHeaderText(e.target.value)} placeholder="Selamat datang!" className="ps-input min-h-[80px]" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase mb-1.5 text-slate-400 tracking-wider">Teks Footer Garansi/Syarat</label>
                      <textarea value={footerText} onChange={e => setFooterText(e.target.value)} placeholder="Barang tidak bisa ditukar" className="ps-input min-h-[80px]" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase mb-1.5 text-slate-400 tracking-wider">Teks Terima Kasih (Paling Bawah)</label>
                      <textarea value={thankYouText} onChange={e => setThankYouText(e.target.value)} placeholder="Terima kasih atas kunjungan Anda" className="ps-input min-h-[80px]" />
                    </div>
                  </div>

                  {/* TOGGLE STRUK */}
                  <div className="ps-card">
                    <p className="ps-section-title">✅ Tampilkan di Struk</p>
                    <Toggle value={showLogo} onChange={setShowLogo} label="Tampilkan Logo di Struk" description="Logo upload tampil di nota cetak & preview (bukan emoji default)" />
                    <Toggle value={showQty} onChange={setShowQty} label="Qty × Harga" description="Tampilkan jumlah dan harga satuan per item" />
                    <Toggle value={showSubtotal} onChange={setShowSubtotal} label="Subtotal Per Item" description="Tampilkan total harga masing-masing item" />
                    <Toggle value={showCatatan} onChange={setShowCatatan} label="Catatan Transaksi" description="Tampilkan catatan dari kasir" />
                    <Toggle value={showKasir} onChange={setShowKasir} label="Nama Kasir" description="Tampilkan nama kasir yang memproses transaksi" />
                  </div>
                </>
              )}

              {activeTab === 'wa' && (
                <>
                  {/* INPUT PENGATURAN TEKS TERPISAH BESERTA NAMA TOKO ATAS WA */}
                  <div className="ps-card space-y-4">
                    <p className="ps-section-title">✍️ Kalimat Pembuka & Nama Toko (Greeting)</p>

                    <div>
                      <label className="block text-[9px] font-black uppercase mb-1.5 text-slate-400 tracking-wider">Nama Toko Atas WA</label>
                      <input type="text" value={waClosingStore} onChange={e => setWaClosingStore(e.target.value)} placeholder="Contoh: Laundry Berkah / Toko Sejahtera" className="ps-input" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-black uppercase mb-1.5 text-slate-400 tracking-wider">Sapaan Awal (Sebelum Nama)</label>
                        <textarea value={waGreeting} onChange={e => setWaGreeting(e.target.value)} placeholder="Contoh: Halo Kak" className="ps-input min-h-[80px]" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase mb-1.5 text-slate-400 tracking-wider">Pesan Pengantar (Setelah Nama)</label>
                        <textarea value={waGreetingCustomer} onChange={e => setWaGreetingCustomer(e.target.value)} placeholder="Contoh: Ini nota digital Anda:" className="ps-input min-h-[80px]" />
                      </div>
                    </div>
                  </div>

                  <div className="ps-card space-y-4">
                    <p className="ps-section-title">✍️ Kalimat Penutup (Closing)</p>
                    <div>
                      <label className="block text-[9px] font-black uppercase mb-1.5 text-slate-400 tracking-wider">Pesan Penutup</label>
                      <textarea value={waClosing} onChange={e => setWaClosing(e.target.value)} placeholder="Contoh: Terima kasih banyak!" className="ps-input min-h-[80px]" />
                    </div>
                  </div>

                  {/* TOGGLE WA */}
                  <div className="ps-card">
                    <p className="ps-section-title">📋 Informasi yang Dikirim via WA</p>
                    <Toggle value={showEstimasi} onChange={setShowEstimasi} label="Estimasi Selesai" description="Sertakan waktu estimasi pengerjaan/selesai" />
                    <Toggle value={showKasirWA} onChange={setShowKasirWA} label="Nama Kasir" description="Sertakan nama kasir yang memproses transaksi" />
                    <Toggle value={showItemDetail} onChange={setShowItemDetail} label="Detail Qty & Harga Item" description="Tampilkan qty × harga per item. Jika off, hanya nama item yang dikirim" />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-5 rounded-[1.75rem] bg-teal-600 text-white text-[11px] font-black uppercase tracking-[0.25em] shadow-xl shadow-teal-100 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {saving ? '⏳ Menyimpan...' : '💾 Simpan Semua Konfigurasi'}
              </button>
            </div>

            {/* RIGHT PREVIEW COLUMN */}
            {previewMode && (
              <div className="lg:w-80 xl:w-96 flex-shrink-0">
                <div className="sticky top-20">
                  <div className="ps-card">
                    <p className="ps-section-title">{activeTab === 'struk' ? '👁 Preview Struk' : '👁 Preview Pesan WA'}</p>
                    <div className="overflow-x-auto pb-2">
                      {activeTab === 'struk' ? (
                        <ReceiptPreview
                          printerSize={printerSize} headerText={headerText} footerText={footerText} thankYouText={thankYouText}
                          showLogo={showLogo} storeLogo={storeLogo} storeName={storeName || tenantRealName} storeAddress={storeAddress}
                          storePhone={storePhone} showQty={showQty} showSubtotal={showSubtotal}
                          showCatatan={showCatatan} showKasir={showKasir} separatorStyle={separatorStyle}
                          transaction={lastTransaction} loadingTx={loadingTx} staffName={staffName}
                          paymentInfo={paymentInfo}
                        />
                      ) : (
                        <WAPreview
                          waGreeting={waGreeting} waGreetingCustomer={waGreetingCustomer} waClosing={waClosing} waClosingStore={waClosingStore}
                          thankYouText={thankYouText} headerText={headerText} footerText={footerText} showEstimasi={showEstimasi} showKasirWA={showKasirWA}
                          showItemDetail={showItemDetail} storeName={storeName} tenantRealName={tenantRealName} storeAddress={storeAddress} storePhone={storePhone}
                          transaction={lastTransaction} loadingTx={loadingTx} staffName={staffName} separatorStyle={separatorStyle}
                          paymentInfo={paymentInfo}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
