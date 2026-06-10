import { supabase } from '../supabaseClient';

const formatRp = (num) => Math.round(Number(num) || 0).toLocaleString('id-ID');

const formatQty = (qty) => {
  const n = Number(qty) || 0;
  return n % 1 === 0 ? n.toFixed(2) : parseFloat(n.toFixed(2)).toString();
};

const parseRpFromNotes = (notes, pattern) => {
  const m = (notes || '').match(pattern);
  if (!m) return 0;
  return Number(String(m[1]).replace(/[^\d]/g, '')) || 0;
};

export const fetchPrinterSettings = async (tenantId, outletId) => {
  try {
    let printerQuery = supabase.from('printer_settings').select('*').eq('tenant_id', tenantId);
    let settingsQuery = supabase.from('payment_settings').select('*').eq('tenant_id', tenantId);
    let accountsQuery = supabase.from('payment_accounts').select('*').eq('tenant_id', tenantId);

    if (outletId) {
      printerQuery = printerQuery.eq('outlet_id', outletId);
      settingsQuery = settingsQuery.eq('outlet_id', outletId);
      accountsQuery = accountsQuery.eq('outlet_id', outletId);
    }

    const { data: printerCfg } = await printerQuery.maybeSingle();
    const { data: settingsCfg } = await settingsQuery.maybeSingle();
    const { data: accounts } = await accountsQuery;

    if (!printerCfg && !settingsCfg) return {};

    const combinedCfg = {
      ...(settingsCfg || {}),
      ...(printerCfg || {})
    };

    const va = (accounts || []).filter(a => a.type === 'va').map(a => ({ bank: a.provider, number: a.number, name: a.name }));
    const transfer = (accounts || []).filter(a => a.type === 'transfer').map(a => ({ bank: a.provider, number: a.number, name: a.name }));
    const ewallet = (accounts || []).filter(a => a.type === 'ewallet').map(a => ({ provider: a.provider, number: a.number, name: a.name }));

    return {
      ...combinedCfg,
      payment_methods: {
        cash: combinedCfg.payment_cash_enabled !== false,
        qris: combinedCfg.payment_qris_enabled === true,
        virtual_account: combinedCfg.payment_va_enabled === true,
        transfer_bank: combinedCfg.payment_transfer_enabled === true,
        ewallet: combinedCfg.payment_ewallet_enabled === true
      },
      va_numbers: va,
      transfer_banks: transfer,
      ewallet_numbers: ewallet
    };
  } catch (err) {
    console.error('Error fetching settings:', err);
    return {};
  }
};

export const transactionItemsToCart = (items = []) =>
  (Array.isArray(items) ? items : []).map((i) => ({
    name: i.name,
    price: Number(i.price) || 0,
    quantity: Number(i.qty) || 0,
    selected_variant: i.variant || '',
    variant_price_modifier: 0,
    unit: i.unit || 'Pcs',
  }));

/** HTML logo struk — pakai store_logo_url dari printer_settings, fallback emoji hanya jika kosong */
export function buildReceiptLogoHtml(cfg = {}, storeName = '') {
  const showLogo = cfg.show_logo !== false;
  if (!showLogo) return '';

  const logoUrl = String(cfg.store_logo_url || '').trim();
  if (logoUrl) {
    const safeSrc = logoUrl.replace(/"/g, '&quot;');
    return `<div style="margin-bottom:6px;text-align:center"><img src="${safeSrc}" alt="Logo" style="max-height:50px;max-width:100px;margin:0 auto;display:block;object-fit:contain" /></div>`;
  }
  if (storeName) {
    return `<div style="font-size:20px;margin-bottom:2px;text-align:center">🏪</div>`;
  }
  return '';
}

export const buildReceiptContext = (transaction, meta = {}) => {
  const cart = transactionItemsToCart(transaction?.items);
  const notes = transaction?.notes || '';
  const subTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const activeDiscountValue = parseRpFromNotes(notes, /\[Diskon:\s*Rp\s*([^\]]+)\]/i);
  const biayaTambahan = parseRpFromNotes(notes, /\[Biaya Tambahan:\s*Rp\s*([^\]]+)\]/i);
  const kasirStr =
    transaction?.cashier_name?.trim() ||
    meta.kasir ||
    (notes.match(/\[Kasir:\s*([^\]]+)\]/i)?.[1]?.trim()) ||
    'Kasir';

  return {
    cart,
    subTotal,
    totalAkhir: Number(transaction?.total) || 0,
    activeDiscountValue,
    biayaTambahan,
    catatan: meta.catatan || '',
    kasirStr,
    selectedCustomer: {
      name: meta.customer && !/umum|guest/i.test(meta.customer) ? meta.customer : 'Guest (Umum)',
      phone: meta.phone && meta.phone !== '-' ? meta.phone : '',
    },
    waktuTransaksi: transaction?.created_at,
    estimasiSelesai: meta.estimasiSelesai || null,
    taxAmount: Math.round(Number(transaction?.total || 0) - (subTotal - activeDiscountValue + biayaTambahan))
  };
};

export async function printTransactionReceipt({ transaction, meta, tenantId }) {
  const win = window.open('', '_blank', 'width=400,height=600');
  if (win) {
    win.document.write('<html><head><title>Cetak Nota</title></head><body style="font-family:monospace;text-align:center;padding:20px;"><p>Memuat nota...</p></body></html>');
  }
  const cfg = await fetchPrinterSettings(tenantId, transaction?.outlet_id);
  const ctx = buildReceiptContext(transaction, meta);
  const { cart, subTotal, totalAkhir, activeDiscountValue, biayaTambahan, catatan, kasirStr, selectedCustomer, waktuTransaksi, estimasiSelesai, taxAmount } = ctx;

  const printerSize = cfg.printer_size || '80mm';
  const headerText = cfg.receipt_header || '';
  const footerText = cfg.receipt_footer || '';
  const storeName = cfg.store_name || '';
  const storeAddress = cfg.store_address || '';
  const storePhone = cfg.store_phone || '';
  const showQty = cfg.show_qty !== false;
  const showSubtotal = cfg.show_subtotal !== false;
  const showCatatan = cfg.show_catatan !== false;
  const showKasir = cfg.show_kasir !== false;

  const width = printerSize === '58mm' ? '58mm' : '80mm';
  const waktuStr = waktuTransaksi
    ? new Date(waktuTransaksi).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : '-';
  const estimasiStr = estimasiSelesai
    ? (typeof estimasiSelesai === 'string' && estimasiSelesai.includes('/')
      ? estimasiSelesai
      : new Date(estimasiSelesai).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }))
    : '-';
  const statusStr = transaction?.payment_method === 'Belum Lunas' ? 'BELUM LUNAS (BON)' : 'LUNAS';

  const itemRows = cart.map((item) => {
    const price = Number(item.price);
    const variantStr = item.selected_variant
      ? `<br/><span style="font-size:9px;color:#666">(${item.selected_variant})</span>` : '';
    const subtotalItem = price * item.quantity;
    const qtyLine = showQty
      ? `<div style="font-size:10px;color:#444">${formatQty(item.quantity)} × ${formatRp(price)}</div>` : '';
    const subtotalTd = showSubtotal
      ? `<td style="text-align:right;vertical-align:top;font-size:11px;font-weight:bold;white-space:nowrap;padding:3px 0 3px 6px">${formatRp(subtotalItem)}</td>` : '<td></td>';
    return `
      <tr>
        <td style="padding:3px 0;vertical-align:top;">
          <div style="font-weight:bold;font-size:11px;text-transform:uppercase">${item.name}${variantStr}</div>
          ${qtyLine}
        </td>
        ${subtotalTd}
      </tr>`;
  }).join('');

  const logoHtml = buildReceiptLogoHtml(cfg, storeName);
  const storeHtml = storeName ? `<div style="font-weight:900;font-size:13px;letter-spacing:0.05em;text-transform:uppercase">${storeName}</div>` : '';
  const addrHtml = storeAddress ? `<div style="font-size:9px;color:#555">${storeAddress}</div>` : '';
  const phoneHtml = storePhone ? `<div style="font-size:9px;color:#555">Tlp: ${storePhone}</div>` : '';
  const headerHtml = headerText ? `<div style="font-size:9px;font-style:italic;color:#444;margin-top:3px">${headerText}</div>` : '';
  const kasirHtml = showKasir ? `<div style="font-size:9px;margin-bottom:2px">Kasir: <b>${kasirStr}</b></div>` : '';
  // eslint-disable-next-line no-unused-vars
  const custPhone = selectedCustomer?.phone ? `<div style="font-size:9px;margin-bottom:2px">Tlp: ${selectedCustomer.phone}</div>` : '';
  const catatanHtml = showCatatan && catatan
    ? `<div class="divider"></div><div style="font-size:9px">📝 Catatan: ${catatan}</div>` : '';
  const footerHtml = footerText
    ? `<div class="center" style="font-size:9px;margin-top:4px;font-style:italic">${footerText}</div>` : '';
  const diskonHtml = activeDiscountValue > 0
    ? `<tr><td style="font-size:10px;color:#c00">Diskon</td><td style="text-align:right;font-size:10px;color:#c00">- ${formatRp(activeDiscountValue)}</td></tr>` : '';
  const biayaHtml = biayaTambahan > 0
    ? `<tr><td style="font-size:10px">Biaya Tambahan</td><td style="text-align:right;font-size:10px">+ ${formatRp(biayaTambahan)}</td></tr>` : '';
  const ppnHtml = taxAmount > 0
    ? `<tr><td style="font-size:10px">PPN / Pajak</td><td style="text-align:right;font-size:10px">+ ${formatRp(taxAmount)}</td></tr>` : '';

  let paymentInstructionsHtml = '';
  if (transaction?.payment_method === 'Belum Lunas') {
    const methods = cfg?.payment_methods || {};
    const vaList = cfg?.va_numbers || [];
    const transferList = cfg?.transfer_banks || [];
    const ewalletList = cfg?.ewallet_numbers || [];
    const qrisMerchant = cfg?.xendit_merchant_id || '';
    const qrisOk = cfg?.xendit_merchant_id || cfg?.xendit_qris_status === 'Aktif' || cfg?.xendit_qris_status === 'Diproses';

    let instructions = [];

    if (methods.qris === true && qrisOk && qrisMerchant) {
      instructions.push(`
        <div style="margin-bottom: 8px; text-align: center;">
          <b>📱 QRIS (Scan Merchant)</b><br/>
          <img 
            src="https://api.qrserver.com/v1/create-qr-code/?size=85x85&data=https://agrapos.dev/merchant/${qrisMerchant}" 
            style="width: 85px; height: 85px; margin: 4px auto; display: block; object-fit: contain;" 
            alt="QRIS Merchant"
          />
          <span style="font-size: 8px; font-family: monospace;">ID: ${qrisMerchant}</span>
        </div>
      `);
    }

    if (methods.virtual_account === true) {
      const suffix = String(tenantId).replace(/\D/g, '').substring(0, 7) || '1234567';
      const xenditVAs = qrisMerchant ? [
        { bank: 'BCA', code: '70070' },
        { bank: 'Mandiri', code: '89407' },
        { bank: 'BNI', code: '8810' },
        { bank: 'BRI', code: '26215' }
      ].map(v => `• VA ${v.bank} (Fixed): <b>${v.code}${suffix}</b>`).join('<br/>') : '';

      const xenditDynamicVAs = qrisMerchant ? [
        { bank: 'BCA', code: '883011', suffix: '12' },
        { bank: 'Mandiri', code: '894022', suffix: '34' }
      ].map(v => `• VA ${v.bank} (Dinamis): <b>${v.code}${totalAkhir}${v.suffix}</b> (Sesuai Tagihan)`).join('<br/>') : '';

      const manualVAs = vaList.length > 0
        ? vaList.map(v => `• VA ${v.bank}: <b>${v.number}</b> (a/n ${v.name})`).join('<br/>')
        : '';
      
      const allVAs = [xenditVAs, xenditDynamicVAs, manualVAs].filter(Boolean).join('<br/>');

      if (allVAs) {
        instructions.push(`
          <div style="margin-bottom: 5px;">
            <b>🏦 Virtual Account</b><br/>
            ${allVAs}
          </div>
        `);
      }
    }

    if (methods.transfer_bank === true && transferList.length > 0) {
      const tf = transferList.map(t => `• ${t.bank}: <b>${t.number}</b> (a/n ${t.name})`).join('<br/>');
      instructions.push(`
        <div style="margin-bottom: 5px;">
          <b>💳 Transfer Bank</b><br/>
          ${tf}
        </div>
      `);
    }

    if (methods.ewallet === true && ewalletList.length > 0) {
      const ew = ewalletList.map(e => `• ${e.provider}: <b>${e.number}</b> (a/n ${e.name})`).join('<br/>');
      instructions.push(`
        <div style="margin-bottom: 5px;">
          <b>📲 e-Wallet</b><br/>
          ${ew}
        </div>
      `);
    }

    if (instructions.length > 0) {
      paymentInstructionsHtml = `
        <div class="divider"></div>
        <div class="center" style="font-weight:900;font-size:10px;margin-bottom:6px">💰 INFO PEMBAYARAN:</div>
        <div style="font-size:9px;line-height:1.4;text-align:left;padding:0 4px">
          ${instructions.join('')}
        </div>
      `;
    }
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          background: #fff;
          font-family: 'Courier New', Courier, monospace;
          font-size: 10px;
          color: #000;
          line-height: 1.15;
        }
        .receipt-wrapper {
          width: ${width};
          max-width: ${width};
          padding: 2px 4px;
          margin: 0 auto;
        }
        .center { text-align:center; }
        .divider { border-top:1px dashed #000; margin:4px 0; }
        .bold { font-weight:bold; }
        table { width:100%; border-collapse:collapse; }
        .total-row td { font-size:12px; font-weight:900; padding-top:2px; }
        tr, p, div, table {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        @media print {
          @page { margin:0; size:auto; }
          body { background-color:#fff; }
          header, footer, nav { display:none; }
        }
      </style>
    </head>
    <body>
      <div class="receipt-wrapper">
        ${(logoHtml || storeHtml || addrHtml || phoneHtml || headerHtml)
          ? `<div class="center" style="margin-bottom:6px">${logoHtml}${storeHtml}${addrHtml}${phoneHtml}${headerHtml}</div>` : ''}
        <div class="divider"></div>
        <div style="font-size: 14px; font-weight: 900; text-transform: uppercase; margin: 4px 0 2px 0; line-height: 1.1;">
          ${selectedCustomer?.name || 'Guest (Umum)'}
        </div>
        ${selectedCustomer?.phone ? `<div style="font-size: 9px; font-weight: bold; margin-bottom: 4px;">Tlp: ${selectedCustomer.phone}</div>` : ''}
        <div class="divider"></div>
        <div style="font-size:9px;margin-bottom:2px">No. Nota: <b>${transaction?.invoice_number || transaction?.id || '-'}</b></div>
        <div style="font-size:9px;margin-bottom:2px">Waktu: ${waktuStr}</div>
        <div style="font-size:9px;margin-bottom:2px">Est. Selesai: ${estimasiStr}</div>
        ${kasirHtml}
        <div class="divider"></div>
        <table>${itemRows}</table>
        <div class="divider"></div>
        <table>
          <tr><td style="font-size:10px">Subtotal</td><td style="text-align:right;font-size:10px">${formatRp(subTotal)}</td></tr>
          ${diskonHtml}
          ${biayaHtml}
          ${ppnHtml}
          <tr class="total-row"><td><b>TOTAL</b></td><td style="text-align:right"><b>${formatRp(totalAkhir)}</b></td></tr>
        </table>
        <div class="divider"></div>
        <div class="center bold" style="font-size:12px;margin:4px 0">★ ${statusStr} ★</div>
        <div class="center" style="font-size:9px">Metode: ${transaction?.payment_method || '-'}</div>
        ${paymentInstructionsHtml}
        ${catatanHtml}
        <div class="divider"></div>
        ${footerHtml}
        <div class="center" style="font-size:8px;color:#aaa;margin-top:8px">— Terima kasih atas kunjungan Anda —</div>
      </div>
    </body>
    </html>`;

  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  }
}

export async function sendTransactionWhatsApp({ transaction, meta, tenantId }) {
  let phone = meta.phone && meta.phone !== '-' ? meta.phone : '';
  if (!phone) {
    phone = window.prompt('Masukkan nomor WA pelanggan (Contoh: 08123456789):');
    if (!phone) return;
  }

  const cfg = await fetchPrinterSettings(tenantId, transaction?.outlet_id);
  const ctx = buildReceiptContext(transaction, meta);
  const { cart, totalAkhir, catatan, kasirStr, selectedCustomer, waktuTransaksi, estimasiSelesai, subTotal, activeDiscountValue, biayaTambahan, taxAmount } = ctx;

  const storeName = cfg.store_name || '';
  const waGreeting = cfg.wa_greeting || 'Halo Kak {nama} 👋';
  const waClosing = cfg.wa_closing || 'Terima kasih telah mempercayai kami! 🙏';
  const showEstimasi = cfg.wa_show_estimasi !== false;
  const showKasirWA = cfg.wa_show_kasir !== false;
  const showItemDetail = cfg.wa_show_item_detail !== false;

  let formattedPhone = phone.replace(/\D/g, '').replace(/^0+/, '');
  if (!formattedPhone.startsWith('62')) formattedPhone = '62' + formattedPhone;

  const custName = selectedCustomer?.name || 'Pelanggan Setia';
  const waktuStr = waktuTransaksi
    ? new Date(waktuTransaksi).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : '-';
  const estimasiStr = estimasiSelesai || '-';
  const statusStr = transaction?.payment_method === 'Belum Lunas' ? 'BELUM BAYAR (NGEBON)' : 'LUNAS';

  const greeting = waGreeting.replace('{nama}', custName).replace('{toko}', storeName || 'Toko Kami');
  const closing = waClosing.replace('{toko}', storeName || 'Toko Kami');
  const kasirLine = showKasirWA ? `\n👤 Kasir: *${kasirStr}*` : '';
  const estimasiLine = showEstimasi && estimasiStr !== '-' ? `\n⏰ Est. Selesai: ${estimasiStr}` : '';
  const catatanLine = catatan ? `\n📝 Catatan: ${catatan}` : '';

  const itemLines = cart.map((item) => {
    const price = Number(item.price);
    const variantStr = item.selected_variant ? ` (${item.selected_variant})` : '';
      if (showItemDetail) {
        return `• ${item.name}${variantStr} × ${formatQty(item.quantity)} = ${formatRp(price * item.quantity)}`;
      }
    return `• ${item.name}${variantStr}`;
  }).join('\n');

  let paymentInstructionsWA = '';
  if (transaction?.payment_method === 'Belum Lunas') {
    const methods = cfg?.payment_methods || {};
    const vaList = cfg?.va_numbers || [];
    const transferList = cfg?.transfer_banks || [];
    const ewalletList = cfg?.ewallet_numbers || [];
    const qrisMerchant = cfg?.xendit_merchant_id || '';
    const qrisOk = cfg?.xendit_qris_status === 'Aktif';

    let instructions = [];

    if (methods.qris === true && qrisOk && qrisMerchant) {
      instructions.push(`• *QRIS (Scan Merchant)*\n  ID: ${qrisMerchant}`);
    }

    if (methods.virtual_account === true && vaList.length > 0) {
      const vas = vaList.map(v => `  - VA ${v.bank}: *${v.number}* (a/n ${v.name})`).join('\n');
      instructions.push(`• *Virtual Account*\n${vas}`);
    }

    if (methods.transfer_bank === true && transferList.length > 0) {
      const tf = transferList.map(t => `  - ${t.bank}: *${t.number}* (a/n ${t.name})`).join('\n');
      instructions.push(`• *Transfer Bank*\n${tf}`);
    }

    if (methods.ewallet === true && ewalletList.length > 0) {
      const ew = ewalletList.map(e => `  - ${e.provider}: *${e.number}* (a/n ${e.name})`).join('\n');
      instructions.push(`• *e-Wallet*\n${ew}`);
    }

    if (instructions.length > 0) {
      paymentInstructionsWA = `\n\n💳 *OPSI PEMBAYARAN:*\n\n` + instructions.join('\n\n');
    }
  }

  const diskonWA = activeDiscountValue > 0 ? `🧧 Diskon: *- ${formatRp(activeDiscountValue)}*\n` : '';
  const biayaWA = biayaTambahan > 0 ? `➕ Biaya Tamb.: *+ ${formatRp(biayaTambahan)}*\n` : '';
  const ppnWA = taxAmount > 0 ? `⚖️ PPN: *+ ${formatRp(taxAmount)}*\n` : '';
  const text =
    `${greeting}\n\n` +
    `Berikut detail nota/invoice Anda:\n\n` +
    `🧾 No. Nota: *${transaction?.invoice_number || transaction?.id || '-'}*\n` +
    `📅 Waktu: ${waktuStr}` +
    `${estimasiLine}\n` +
    `──────────────────\n` +
    `Subtotal: ${formatRp(subTotal)}\n` +
      diskonWA +
      biayaWA +
      `${ppnWA}` +
      `💰 *TOTAL: ${formatRp(totalAkhir)}*\n` +
    `──────────────────\n` +
    `💳 Status: *${statusStr}*` +
    `${kasirLine}\n\n` +
    `Rincian Pesanan:\n${itemLines}` +
    `${catatanLine}` +
    `${paymentInstructionsWA}\n\n` +
    `${closing}`;

  window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, '_blank');
}

// ─── ESC/POS RAW BYTE ENCODER FOR BLUETOOTH PRINTERS ─────────────────────────
class EscPosEncoder {
  constructor() {
    this.buffer = [];
    this.encoder = new TextEncoder();
  }

  initialize() {
    this.buffer.push(0x1B, 0x40);
    return this;
  }

  alignCenter() {
    this.buffer.push(0x1B, 0x61, 0x01);
    return this;
  }

  alignLeft() {
    this.buffer.push(0x1B, 0x61, 0x00);
    return this;
  }

  alignRight() {
    this.buffer.push(0x1B, 0x61, 0x02);
    return this;
  }

  bold(enable = true) {
    this.buffer.push(0x1B, 0x45, enable ? 0x01 : 0x00);
    return this;
  }

  sizeDouble() {
    this.buffer.push(0x1D, 0x21, 0x11);
    return this;
  }

  sizeNormal() {
    this.buffer.push(0x1D, 0x21, 0x00);
    return this;
  }

  text(str) {
    const bytes = this.encoder.encode(str);
    this.buffer.push(...bytes);
    return this;
  }

  line(str = '') {
    this.text(str + '\n');
    return this;
  }

  feed(lines = 1) {
    this.buffer.push(0x1B, 0x64, lines);
    return this;
  }

  qrCode(dataStr) {
    const dataBytes = this.encoder.encode(dataStr);
    const len = dataBytes.length + 3;
    const pL = len & 0xFF;
    const pH = (len >> 8) & 0xFF;

    this.buffer.push(0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    this.buffer.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06);
    this.buffer.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30);
    this.buffer.push(0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30);
    this.buffer.push(...dataBytes);
    this.buffer.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);

    return this;
  }

  image(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height).data;

    const xBytes = Math.ceil(width / 8);
    const xL = xBytes & 0xFF;
    const xH = (xBytes >> 8) & 0xFF;
    const yL = height & 0xFF;
    const yH = (height >> 8) & 0xFF;

    this.buffer.push(0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < xBytes; x++) {
        let byte = 0;
        for (let b = 0; b < 8; b++) {
          const p = x * 8 + b;
          if (p < width) {
            const idx = (y * width + p) * 4;
            const r = imageData[idx];
            const g = imageData[idx + 1];
            const b_c = imageData[idx + 2];
            const a = imageData[idx + 3];
            const brightness = (r * 0.299 + g * 0.587 + b_c * 0.114);
            if (brightness < 128 && a > 128) {
              byte |= (1 << (7 - b));
            }
          }
        }
        this.buffer.push(byte);
      }
    }
    return this;
  }

  getRawBytes() {
    return new Uint8Array(this.buffer);
  }
}

function formatLeftRight(left, right, width = 32) {
  const spaceNeeded = width - left.length - right.length;
  if (spaceNeeded <= 0) return left.slice(0, Math.max(0, width - right.length - 1)) + ' ' + right;
  return left + ' '.repeat(spaceNeeded) + right;
}

export async function printDirectBluetooth({ transaction, meta, tenantId }) {
  if (!navigator.bluetooth) {
    throw new Error('Web Bluetooth API tidak didukung di browser ini. Gunakan Google Chrome atau Microsoft Edge.');
  }

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      '000018f0-0000-1000-8000-00805f9b34fb',
      '0000e0e1-0000-1000-8000-00805f9b34fb',
      '0000ff00-0000-1000-8000-00805f9b34fb',
      '0000fee7-0000-1000-8000-00805f9b34fb',
      '0000fee9-0000-1000-8000-00805f9b34fb',
      '00001101-0000-1000-8000-00805f9b34fb',
      0x18f0, 0xe0e1, 0xff00, 0xfee7, 0xfee9, 0x1101
    ]
  });

  const cfg = await fetchPrinterSettings(tenantId, transaction?.outlet_id);
  const ctx = buildReceiptContext(transaction, meta);
  const { cart, subTotal, totalAkhir, activeDiscountValue, biayaTambahan, catatan, kasirStr, selectedCustomer, waktuTransaksi, estimasiSelesai, taxAmount } = ctx;

  const printerSize = cfg.printer_size || '80mm';
  const cWidth = printerSize === '58mm' ? 32 : 48;

  const encoder = new EscPosEncoder();
  encoder.initialize();

  if (cfg.show_logo !== false && cfg.store_logo_url) {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = cfg.store_logo_url;
      });
      let imgWidth = img.width;
      let imgHeight = img.height;
      const maxWidth = cWidth === 32 ? 200 : 300;
      if (imgWidth > maxWidth) {
        imgHeight = (maxWidth / imgWidth) * imgHeight;
        imgWidth = maxWidth;
      }
      imgWidth = Math.ceil(imgWidth / 8) * 8;
      const canvas = document.createElement('canvas');
      canvas.width = imgWidth;
      canvas.height = imgHeight;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, imgWidth, imgHeight);
      ctx.drawImage(img, 0, 0, imgWidth, imgHeight);
      encoder.alignCenter().image(canvas).line('');
    } catch(err) {
      console.warn('Gagal memuat logo printer', err);
    }
  }

  const storeName = cfg.store_name || 'AgraPOS Store';
  encoder.alignCenter().sizeDouble().bold().line(storeName).sizeNormal().bold(false);

  if (cfg.store_address) encoder.line(cfg.store_address);
  if (cfg.store_phone) encoder.line('Tlp: ' + cfg.store_phone);
  if (cfg.receipt_header) encoder.line(cfg.receipt_header);

  encoder.line('-'.repeat(cWidth));

  encoder.alignCenter();
  const custName = selectedCustomer?.name || 'Guest (Umum)';
  encoder.sizeDouble().bold().line(custName.toUpperCase()).sizeNormal().bold(false);
  if (selectedCustomer?.phone) encoder.line('Tlp: ' + selectedCustomer.phone);
  encoder.alignLeft();

  encoder.line('-'.repeat(cWidth));

  const timeStr = waktuTransaksi 
    ? new Date(waktuTransaksi).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) 
    : '-';
  encoder.line(formatLeftRight('No. Nota', transaction?.invoice_number || ('#' + (transaction?.id || '-')), cWidth));
  encoder.line(formatLeftRight('Waktu', timeStr, cWidth));
  if (estimasiSelesai) {
    const estLabel = typeof estimasiSelesai === 'string' && estimasiSelesai.includes('/')
      ? estimasiSelesai
      : new Date(estimasiSelesai).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    encoder.line(formatLeftRight('Est. Selesai', estLabel, cWidth));
  }
  if (cfg.show_kasir !== false) encoder.line(formatLeftRight('Kasir', kasirStr, cWidth));

  encoder.line('-'.repeat(cWidth));

  cart.forEach(item => {
    const totalStr = `${formatRp(item.price * item.quantity)}`;
    encoder.bold().line(formatLeftRight(item.name.toUpperCase(), totalStr, cWidth)).bold(false);
    if (item.selected_variant) {
      encoder.line(` (${item.selected_variant})`);
    }
    const qtyStr = `${formatQty(item.quantity)} ${item.unit || 'unit'} x ${formatRp(item.price)}`;
    encoder.line(qtyStr);
  });

  encoder.line('-'.repeat(cWidth));

  if (cfg.show_subtotal !== false) {
    encoder.line(formatLeftRight('Subtotal', `${formatRp(subTotal)}`, cWidth));
  }
  if (activeDiscountValue > 0) {
    encoder.line(formatLeftRight('Diskon', `-${formatRp(activeDiscountValue)}`, cWidth));
  }
  if (biayaTambahan > 0) {
    encoder.line(formatLeftRight('Biaya Tambahan', `+${formatRp(biayaTambahan)}`, cWidth));
  }
  if (taxAmount > 0) {
    encoder.line(formatLeftRight('PPN / Pajak', `+${formatRp(taxAmount)}`, cWidth));
  }
  encoder.line('-'.repeat(cWidth));
  encoder.bold().line(formatLeftRight('TOTAL', `${formatRp(totalAkhir)}`, cWidth)).bold(false);
  encoder.line('-'.repeat(cWidth));

  encoder.alignCenter().bold();
  const statusStr = transaction?.payment_method === 'Belum Lunas' ? 'BELUM BAYAR (BON)' : 'LUNAS';
  encoder.line(`* ${statusStr} *`);
  encoder.line(`Metode: ${transaction?.payment_method || '-'}`).bold(false);

  if (transaction?.payment_method === 'Belum Lunas') {
    const methods = cfg?.payment_methods || {};
    const qrisMerchant = cfg?.xendit_merchant_id || '';
    const qrisOk = cfg?.xendit_merchant_id || cfg?.xendit_qris_status === 'Aktif' || cfg?.xendit_qris_status === 'Diproses';

    const vaList = cfg?.va_numbers || [];
    const transferList = cfg?.transfer_banks || [];
    const ewalletList = cfg?.ewallet_numbers || [];

    if ((methods.qris === true && qrisOk && qrisMerchant) || (methods.virtual_account === true && vaList) || methods.transfer_bank === true || methods.ewallet === true) {
      encoder.line('-'.repeat(cWidth));
      encoder.alignCenter().line('- INFO PEMBAYARAN -').alignLeft();

      if (methods.qris === true && qrisOk && qrisMerchant) {
        encoder.alignCenter();
        encoder.line('').line('SCAN QRIS (Merchant):');
        encoder.qrCode(`https://agrapos.dev/merchant/${qrisMerchant}`).line('').line(`ID: ${qrisMerchant}`);
        encoder.alignLeft();
      }

      if (methods.virtual_account === true) {
        const suffix = String(tenantId).replace(/\D/g, '').substring(0, 7) || '1234567';
        if (qrisMerchant) {
          encoder.line(`VA BCA`);
          encoder.line(`70070${suffix}`);
          encoder.line(`VA Mandiri`);
          encoder.line(`89407${suffix}`);
        }
        vaList.forEach(v => {
          encoder.line(`VA ${v.bank}`);
          encoder.line(`${v.number}`);
          if (v.name) encoder.line(`a/n ${v.name}`);
        });
      }
      if (methods.transfer_bank === true) {
        transferList.forEach(t => {
          encoder.line(`${t.bank}`);
          encoder.line(`${t.number}`);
          if (t.name) encoder.line(`a/n ${t.name}`);
        });
      }
      if (methods.ewallet === true) {
        ewalletList.forEach(e => {
          encoder.line(`${e.provider}`);
          encoder.line(`${e.number}`);
          if (e.name) encoder.line(`a/n ${e.name}`);
        });
      }
    }
  }

  if (catatan && cfg.show_catatan !== false) {
    encoder.line('').alignLeft().line('Catatan:').line(`"${catatan}"`);
  }

  if (cfg.receipt_footer) {
    encoder.line('').alignCenter().line(cfg.receipt_footer);
  }

  encoder.line('').alignCenter().line('Terima kasih atas kunjungan Anda');
  encoder.feed(4);

  const rawBytes = encoder.getRawBytes();

  const server = await device.gatt.connect();
  const services = await server.getPrimaryServices();

  let writeCharacteristic = null;
  for (const service of services) {
    try {
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeCharacteristic = char;
          break;
        }
      }
    } catch (e) {
      console.warn('Gagal membaca karakteristik:', service.uuid, e);
    }
    if (writeCharacteristic) break;
  }

  if (!writeCharacteristic) {
    throw new Error('Tidak menemukan write characteristic pada printer.');
  }

  // Gunakan chunkSize lebih kecil dan jeda lebih lama untuk printer bluetooth murah
  // agar buffer tidak overflow saat mencetak gambar (Logo / QR)
  const chunkSize = 64;
  for (let i = 0; i < rawBytes.length; i += chunkSize) {
    const chunk = rawBytes.slice(i, i + chunkSize);
    if (writeCharacteristic.properties.writeWithoutResponse) {
      await writeCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await writeCharacteristic.writeValue(chunk);
    }
    // Jeda 30ms agar aman untuk printer dengan buffer kecil
    await new Promise(r => setTimeout(r, 30));
  }

  await device.gatt.disconnect();
}
