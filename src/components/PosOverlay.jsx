/* eslint-disable */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { calculateTax } from '../utils/taxCalculator';
import { assertTenantId } from '../utils/tenantContext';
import { createXenditQR, createXenditVA } from '../utils/api';
import { formatRupiah } from '../utils/platformAdmin';
import { buildReceiptLogoHtml, printDirectBluetooth } from '../utils/transactionReceipt';
import PrintIcon from '@mui/icons-material/Print';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PauseIcon from '@mui/icons-material/Pause';
import StorefrontIcon from '@mui/icons-material/Storefront';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PersonIcon from '@mui/icons-material/Person';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { AddCustomerDialog, AddProductDialog, PPOBDialog, PPOBInlineView } from './pos/PosDialogs';
import { usePosStore } from '../store/usePosStore';

const getKasirName = (user) => {
  if (!user) return 'Kasir';
  return user.name || user.full_name || user.email || user.username || 'Kasir';
};

const resolveTransactionKasir = (tx, user) =>
  tx?.cashier_name?.trim() || (tx?.notes?.match(/\[Kasir:\s*([^\]]+)\]/i)?.[1]?.trim()) || getKasirName(user);

// ─── FETCH PRINTER SETTINGS ───────────────────────────────────────────────────
// Mengambil SEMUA kolom setting printer, WA, dan payment dari Supabase secara relasional
const fetchPrinterSettings = async (tenantId, outletId) => {
  try {
    let printerQuery = supabase.from('printer_settings').select('*').eq('tenant_id', tenantId);
    let settingsQuery = supabase.from('payment_settings').select('*').eq('tenant_id', tenantId);
    let accountsQuery = supabase.from('payment_accounts').select('*').eq('tenant_id', tenantId);

    if (outletId) {
      printerQuery = printerQuery.eq('outlet_id', outletId);
      settingsQuery = settingsQuery.eq('outlet_id', outletId);
      accountsQuery = accountsQuery.eq('outlet_id', outletId);
    } else {
      printerQuery = printerQuery.is('outlet_id', null);
      settingsQuery = settingsQuery.is('outlet_id', null);
      accountsQuery = accountsQuery.is('outlet_id', null);
    }

    const { data: printerCfg } = await printerQuery.maybeSingle();
    const { data: settingsCfg } = await settingsQuery.maybeSingle();
    const { data: accounts } = await accountsQuery;

    if (!printerCfg && !settingsCfg) return {};

    const combinedCfg = {
      ...(settingsCfg || {}),
      ...(printerCfg || {})
    };

    if (combinedCfg.xendit_merchant_id) {
      combinedCfg.xendit_merchant_id = combinedCfg.xendit_merchant_id.split('|')[0];
    }

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



// --- Ikon PPOB ---
const IconPulsa = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);
const IconData = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconListrik = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);
const IconPDAM = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-2.42 2.76-6 6.82-6 10.5 0 3.31 2.69 6 6 6s6-2.69 6-6c0-3.68-3.58-7.74-6-10.5z" />
  </svg>
);
const IconEwallet = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);
const IconGame = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
  </svg>
);
const IconGrid = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

// ─── BUILD DYNAMIC PAYMENT METHODS ────────────────────────────────────────────
// Membuat daftar metode pembayaran yang aktif dari settings
const buildPaymentMethods = (cfg, cart = []) => {
  const hasPPOB = cart.some(item => item.is_ppob);
  const methods = cfg?.payment_methods || {};
  const result = [];
  
  const isQrisActiveOrPending = ['AKTIF', 'DIPROSES'].includes((cfg?.xendit_qris_status || '').toUpperCase());

  if (hasPPOB) {
    result.push({ key: 'saldo_deposit', label: 'Saldo Deposit', icon: '⚡' });
    if (methods.qris === true && (cfg?.xendit_merchant_id || isQrisActiveOrPending)) result.push({ key: 'qris', label: 'QRIS', icon: '📱' });
    if (methods.ewallet === true) result.push({ key: 'ewallet', label: 'e-Wallet', icon: '📲' });
    if (methods.virtual_account === true) result.push({ key: 'virtual_account', label: 'Virtual Account', icon: '🏦' });
    return result;
  }

  if (methods.cash !== false && (methods.cash === true || methods.cash === undefined)) result.push({ key: 'cash', label: 'Tunai', icon: '💵' });
  if (methods.qris === true && (cfg?.xendit_merchant_id || isQrisActiveOrPending)) result.push({ key: 'qris', label: 'QRIS', icon: '📱' });
  if (methods.virtual_account === true) result.push({ key: 'virtual_account', label: 'Virtual Account', icon: '🏦' });
  if (methods.transfer_bank === true) result.push({ key: 'transfer_bank', label: 'Transfer Bank', icon: '💳' });
  if (methods.ewallet === true) result.push({ key: 'ewallet', label: 'e-Wallet', icon: '📲' });
  // Kalau tidak ada yang diset sama sekali, fallback ke default
  if (result.length === 0) {
    result.push({ key: 'cash', label: 'Tunai', icon: '💵' });
    result.push({ key: 'qris', label: 'QRIS', icon: '📱' });
    result.push({ key: 'virtual_account', label: 'Virtual Account', icon: '🏦' });
  }
  return result;
};

// ─── KONVERSI DURASI KE MENIT ─────────────────────────────────────────────────
const durationNameToMinutes = (value, unitName) => {
  const d = Number(value) || 0;
  const t = (unitName || '').toLowerCase().trim();
  if (t === 'menit' || t === 'minute' || t === 'minutes') return d;
  if (t === 'jam' || t === 'hour' || t === 'hours') return d * 60;
  if (t === 'hari' || t === 'day' || t === 'days') return d * 60 * 24;
  if (t === 'minggu' || t === 'week' || t === 'weeks') return d * 60 * 24 * 7;
  if (t === 'bulan' || t === 'month' || t === 'months') return d * 60 * 24 * 30;
  return 0;
};

const getLocalISOString = (date) => {
  const target = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return target.toISOString().slice(0, 16);
};

const formatRp = (num) => formatRupiah(num);
const formatQty = (qty) => {
  const n = Number(qty) || 0;
  return n % 1 === 0 ? n.toFixed(2) : parseFloat(n.toFixed(2)).toString();
};

// ─── AUDIO KASIR ─────────────────────────────────────────────────────────────
const playBeep = (type = 'add') => {
  // Suara dihilangkan sesuai permintaan
};

// ─── HOLD TRANSACTION HELPERS ─────────────────────────────────────────────────
let holdIdCounter = 1;
const createHoldSnapshot = (state) => ({
  holdId: holdIdCounter++,
  heldAt: new Date(),
  cart: state.cart,
  selectedCustomer: state.selectedCustomer,
  customerSearch: state.customerSearch,
  waktuTransaksi: state.waktuTransaksi,
  estimasiSelesai: state.estimasiSelesai,
  estimasiManual: state.estimasiManual,
  biayaTambahan: state.biayaTambahan,
  selectedDiscountId: state.selectedDiscountId,
  catatan: state.catatan,
  metodePembayaran: state.metodePembayaran,
});



// ─── PRINT NOTA HELPER (PAKAI SETTING REAL + SHOW FLAGS) ─────────────────────
const handlePrintNota = async ({
  savedTransaction, cart, totalAkhir, subTotal, activeDiscountValue,
  biayaTambahan, selectedCustomer, waktuTransaksi, estimasiSelesai,
  catatan, tenantId, currentUser, taxBreakdown
}) => {
  const win = window.open('', '_blank', 'width=400,height=600');
  if (win) {
    win.document.write('<html><head><title>Cetak Nota</title></head><body style="font-family:monospace;text-align:center;padding:20px;"><p>Memuat nota...</p></body></html>');
  }
  // Ambil SEMUA setting printer dari Supabase
  const cfg = await fetchPrinterSettings(tenantId, currentUser?.outlet_id);

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
    ? new Date(estimasiSelesai).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : '-';
  const statusStr = savedTransaction?.payment_method === 'Belum Lunas' ? 'BELUM LUNAS (BON)' : 'LUNAS';
  const kasirStr = resolveTransactionKasir(savedTransaction, currentUser);

  const itemRows = cart.map(item => {
    const price = Number(item.price) + Number(item.variant_price_modifier || 0);
    const variantStr = item.selected_variant
      ? `<br/><span style="font-size:9px;color:#666">(${item.selected_variant})</span>` : '';
    const ppobStr = item.is_ppob
      ? `<br/><span style="font-size:9px;color:#000;font-weight:bold;">Tujuan: ${item.ppob_target}</span>` : '';
    const subtotalItem = price * item.quantity;
    const qtyLine = showQty
      ? `<div style="font-size:10px;color:#444">${formatQty(item.quantity)} × ${formatRp(price)}</div>` : '';
    const subtotalTd = showSubtotal
      ? `<td style="text-align:right;vertical-align:top;font-size:11px;font-weight:bold;white-space:nowrap;padding:3px 0 3px 6px">${formatRp(subtotalItem)}</td>` : '<td></td>';
    return `
      <tr>
        <td style="padding:3px 0;vertical-align:top;">
          <div style="font-weight:bold;font-size:11px;text-transform:uppercase">${item.name}${variantStr}${ppobStr}</div>
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
  const custPhone = selectedCustomer?.phone ? `<div style="font-size:9px;margin-bottom:2px">Tlp: ${selectedCustomer.phone}</div>` : '';
  const catatanHtml = showCatatan && catatan
    ? `<div class="divider"></div><div style="font-size:9px">📝 Catatan: ${catatan}</div>` : '';
  const footerHtml = footerText
    ? `<div class="center" style="font-size:9px;margin-top:4px;font-style:italic">${footerText}</div>` : '';
  const diskonHtml = activeDiscountValue > 0
    ? `<tr><td style="font-size:10px;color:#c00">Diskon</td><td style="text-align:right;font-size:10px;color:#c00">- ${formatRp(activeDiscountValue)}</td></tr>` : '';
  const biayaHtml = Number(biayaTambahan) > 0
    ? `<tr><td style="font-size:10px">Biaya Tambahan</td><td style="text-align:right;font-size:10px">+ ${formatRp(biayaTambahan)}</td></tr>` : '';
  const ppnHtml = taxBreakdown?.taxAmount > 0
    ? `<tr><td style="font-size:10px">PPN / Pajak</td><td style="text-align:right;font-size:10px">+ ${formatRp(taxBreakdown.taxAmount)}</td></tr>` : '';

  let paymentInstructionsHtml = '';
  if (savedTransaction?.payment_method === 'Belum Lunas') {
    const methods = cfg?.payment_methods || {};
    const vaList = cfg?.va_numbers || [];
    const transferList = cfg?.transfer_banks || [];
    const ewalletList = cfg?.ewallet_numbers || [];
    const qrisMerchant = cfg?.xendit_merchant_id || '';
    const qrisOk = cfg?.xendit_merchant_id || ['AKTIF', 'DIPROSES'].includes((cfg?.xendit_qris_status || '').toUpperCase());

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
      ? `<div class="center" style="margin-bottom:6px">${logoHtml}${storeHtml}${addrHtml}${phoneHtml}${headerHtml}</div>`
      : ''
    }
        <div class="divider"></div>
        <div style="font-size: 14px; font-weight: 900; text-transform: uppercase; margin: 4px 0 2px 0; line-height: 1.1;">
          ${selectedCustomer?.name || 'Guest (Umum)'}
        </div>
        ${selectedCustomer?.phone ? `<div style="font-size: 9px; font-weight: bold; margin-bottom: 4px;">Tlp: ${selectedCustomer.phone}</div>` : ''}
        <div class="divider"></div>
        <div style="font-size:9px;margin-bottom:2px">No. Nota: <b>${savedTransaction?.invoice_number || savedTransaction?.id || '-'}</b></div>
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
        <div class="center" style="font-size:9px">Metode: ${savedTransaction?.payment_method || '-'}</div>
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
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function PosOverlay({ tenantId, onClose, onSuccess, navbarHeight = 64, currentUser = null, onNavigate }) {
  const currentTenantId = tenantId;

  // ─── STATE DATA ───────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [variants, setVariants] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [durationUnits, setDurationUnits] = useState([]);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const cart = usePosStore(state => state.cart);
  const { addToCart, updateCartItemQty, removeFromCart, updateCartItemVariant, clearCart, loadHoldSnapshot } = usePosStore();
  const [activeTab, setActiveTab] = useState('produk');

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);

  // --- PPOB States ---
  const [showPPOBModal, setShowPPOBModal] = useState(false);
  // showPPOBDialog is removed, using inline view instead
  const [ppobCategory, setPpobCategory] = useState(null);
  const [ppobBalance, setPpobBalance] = useState(0);
  const [ppobMutations, setPpobMutations] = useState([]);
  const [loadingPpob, setLoadingPpob] = useState(false);

  useEffect(() => {
    if (showPPOBModal && currentTenantId) {
      setLoadingPpob(true);
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ppob/balance?tenant_id=${currentTenantId}&outlet_id=${currentUser?.outlet_id || ''}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setPpobBalance(data.balance || 0);
            setPpobMutations(data.mutations || []);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingPpob(false));
    }
  }, [showPPOBModal, currentTenantId, currentUser?.outlet_id]);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanResult, setScanResult] = useState('');
  const [toastMsg, setToastMsg] = useState(null);

  const [editingQtyId, setEditingQtyId] = useState(null);
  const [editingQtyVal, setEditingQtyVal] = useState('');

  const [heldTransactions, setHeldTransactions] = useState([]);
  const [showHoldPanel, setShowHoldPanel] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const productsRef = useRef([]);
  const toastTimeoutRef = useRef(null);

  useEffect(() => { productsRef.current = products; }, [products]);

  // --- Check Initial Action ---
  const initialAction = usePosStore(state => state.initialAction);
  const setInitialAction = usePosStore(state => state.setInitialAction);

  useEffect(() => {
    if (initialAction?.type === 'OPEN_PPOB') {
      setShowPPOBModal(true);
      if (initialAction.category) {
        setPpobCategory(initialAction.category);
        // Removed dialog call
      }
      setInitialAction(null);
    }
  }, [initialAction, setInitialAction]);

  // ─── STATE TRANSAKSI ──────────────────────────────────────────────────────
  const [waktuTransaksi, setWaktuTransaksi] = useState(() => getLocalISOString(new Date()));
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [biayaTambahan, setBiayaTambahan] = useState(0);
  const [selectedDiscountId, setSelectedDiscountId] = useState('');
  const [catatan, setCatatan] = useState('');
  const [estimasiSelesai, setEstimasiSelesai] = useState(() => {
    const initFinish = new Date();
    initFinish.setHours(initFinish.getHours() + 2);
    return getLocalISOString(initFinish);
  });
  const [estimasiManual, setEstimasiManual] = useState(false);
  const [metodePembayaran, setMetodePembayaran] = useState('Tunai');
  const [qrisType, setQrisType] = useState('dinamis'); // 'dinamis' | 'statis'
  const [vaType, setVaType] = useState('dinamis'); // 'dinamis' | 'fixed'
  const [splitPayments, setSplitPayments] = useState([]);
  const [useSplitPayment, setUseSplitPayment] = useState(false);
  const [taxSettings, setTaxSettings] = useState({
    enabled: currentUser?.tax_enabled ?? false,
    rate: currentUser?.tax_rate ?? 11,
    inclusive: currentUser?.tax_inclusive ?? false,
  });
  const [activeShiftId, setActiveShiftId] = useState(null);
  // Xendit Real Integration States
  const [loadingXendit, setLoadingXendit] = useState(false);
  const [xenditQrCode, setXenditQrCode] = useState('');
  const [xenditVaNumber, setXenditVaNumber] = useState('');
  const [xenditVaBank, setXenditVaBank] = useState('BCA');
  const [errorXendit, setErrorXendit] = useState('');
  const [paymentSettings, setPaymentSettings] = useState(null);

  const [savedTransaction, setSavedTransaction] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [paymentFlow, setPaymentFlow] = useState('pilih_aksi');
  const [jumlahBayar, setJumlahBayar] = useState(0);
  const [prosesBayar, setProsesBayar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPpnConfirm, setShowPpnConfirm] = useState({ show: false, nextState: false });

  const showToast = useCallback((msg, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMsg({ msg, type });
    if (type !== 'silent') playBeep(type === 'error' ? 'error' : 'add');
    toastTimeoutRef.current = setTimeout(() => {
      setToastMsg(null); toastTimeoutRef.current = null;
    }, 2500);
  }, []);

  useEffect(() => {
    return () => { if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current); };
  }, []);

  // ─── LOGIC PERHITUNGAN ────────────────────────────────────────────────────
  const subTotal = useMemo(() => cart.reduce((sum, item) => {
    const basePrice = Number(item.price) + Number(item.variant_price_modifier || 0);
    return sum + (basePrice * item.quantity);
  }, 0), [cart]);

  const activeDiscountValue = useMemo(() => {
    if (!selectedDiscountId) return 0;
    const disc = discounts.find(d => String(d.id) === String(selectedDiscountId));
    if (!disc) return 0;
    const rawValue = Number(disc.value || disc.nominal || disc.amount || 0);
    const type = String(disc.type || disc.discount_type || '').toLowerCase();
    const isPercent = type.includes('persen') || type.includes('percentage') || type === 'percent';
    let totalDisc = 0;
    const productIds = disc.product_ids;
    const hasProductFilter = Array.isArray(productIds) && productIds.length > 0;
    if (hasProductFilter) {
      cart.forEach(item => {
        if (productIds.map(pid => String(pid)).includes(String(item.id))) {
          const basePrice = Number(item.price) + Number(item.variant_price_modifier || 0);
          totalDisc += (isPercent ? (basePrice * rawValue / 100) : rawValue) * item.quantity;
        }
      });
    } else {
      totalDisc = isPercent ? (subTotal * rawValue / 100) : rawValue;
    }
    return totalDisc;
  }, [selectedDiscountId, discounts, subTotal, cart]);

  const getDiscountApplicableQty = useCallback((disc) => {
    const productIds = disc.product_ids;
    if (!Array.isArray(productIds) || productIds.length === 0) return null;
    const matched = cart.filter(item => productIds.map(pid => String(pid)).includes(String(item.id)));
    return matched.reduce((s, i) => s + i.quantity, 0);
  }, [cart]);

  const taxBreakdown = useMemo(() => {
    const beforeTax = Math.max(0, subTotal + Number(biayaTambahan) - activeDiscountValue);
    return calculateTax(beforeTax, taxSettings);
  }, [subTotal, biayaTambahan, activeDiscountValue, taxSettings]);

  const totalAkhir = taxBreakdown.total;

  // ─── GENERATE REAL XENDIT PAYMENTS ─────────────────────────────────────────
  useEffect(() => {
    if (paymentFlow !== 'bayar_langsung' || !savedTransaction?.id) {
      return;
    }

    const generateQR = async () => {
      setLoadingXendit(true);
      setErrorXendit('');
      try {
        const res = await createXenditQR({
          tenantId: currentTenantId,
          amount: totalAkhir,
          transactionId: savedTransaction.id
        });
        if (res.success) {
          setXenditQrCode(res.qrString || '');
        } else {
          throw new Error(res.error || 'Gagal generate QRIS');
        }
      } catch (err) {
        console.error('Error generating Xendit QRIS:', err);
        setErrorXendit(err.message || 'Gagal generate QRIS.');
      } finally {
        setLoadingXendit(false);
      }
    };

    const generateVA = async () => {
      setLoadingXendit(true);
      setErrorXendit('');
      try {
        const res = await createXenditVA({
          tenantId: currentTenantId,
          bankCode: xenditVaBank,
          name: selectedCustomer?.name || 'AgraPOS Customer',
          amount: totalAkhir,
          transactionId: savedTransaction.id
        });
        if (res.success) {
          setXenditVaNumber(res.accountNumber || '');
        } else {
          throw new Error(res.error || 'Gagal generate VA');
        }
      } catch (err) {
        console.error('Error generating Xendit VA:', err);
        setErrorXendit(err.message || 'Gagal generate VA.');
      } finally {
        setLoadingXendit(false);
      }
    };

    if (metodePembayaran === 'QRIS' && qrisType === 'dinamis' && !xenditQrCode) {
      generateQR();
    } else if (metodePembayaran === 'Virtual Account' && vaType === 'dinamis' && !xenditVaNumber) {
      generateVA();
    }
  }, [metodePembayaran, qrisType, vaType, xenditVaBank, paymentFlow, savedTransaction?.id, currentTenantId, totalAkhir, selectedCustomer?.name]);

  // Reset VA number when changing bank
  useEffect(() => {
    setXenditVaNumber('');
  }, [xenditVaBank]);

  // Reset states when transaction changes
  useEffect(() => {
    setXenditQrCode('');
    setXenditVaNumber('');
    setErrorXendit('');
  }, [savedTransaction?.id]);

  const checkPaymentStatus = async (showToastAlert = true) => {
    if (!savedTransaction?.id) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('payment_method, status')
        .eq('id', savedTransaction.id)
        .maybeSingle();

      if (error) throw error;
      if (data && data.payment_method !== 'Belum Lunas') {
        setSavedTransaction(prev => ({
          ...prev,
          payment_method: data.payment_method,
          status: data.status || 'completed'
        }));
        playBeep('success');
        setPaymentFlow('selesai');
        if (onSuccess) onSuccess();
        showToast('Pembayaran Berhasil Diterima!', 'success');
        setShowSuccessModal(true);
      } else {
        if (showToastAlert) {
          showToast('Belum ada pembayaran masuk.', 'error');
        }
      }
    } catch (err) {
      console.error('Gagal mengecek status pembayaran:', err);
      if (showToastAlert) {
        showToast('Gagal terhubung ke database status.', 'error');
      }
    }
  };

  // Polling
  useEffect(() => {
    if (paymentFlow !== 'bayar_langsung' || !savedTransaction?.id) return;
    if (metodePembayaran !== 'QRIS' && metodePembayaran !== 'Virtual Account') return;

    const interval = setInterval(() => {
      checkPaymentStatus(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [paymentFlow, savedTransaction?.id, metodePembayaran]);

  // ─── HOLD & RESUME ────────────────────────────────────────────────────────
  const handleHoldTransaction = useCallback(async () => {
    if (cart.length === 0) { showToast('Keranjang kosong, tidak bisa di-hold!', 'error'); return; }
    if (!currentTenantId) return;
    const snapshot = createHoldSnapshot({ cart, selectedCustomer, customerSearch, waktuTransaksi, estimasiSelesai, estimasiManual, biayaTambahan, selectedDiscountId, catatan, metodePembayaran });

    // Langsung update state lokal agar muncul di popup secara realtime
    setHeldTransactions(prev => [...prev, snapshot]);

    try {
      await supabase.from('held_carts').insert([{
        tenant_id: currentTenantId,
        staff_id: currentUser?.staff_id || currentUser?.id,
        label: `Hold #${snapshot.holdId}`,
        cart_data: snapshot,
        customer_data: selectedCustomer,
        outlet_id: currentUser?.outlet_id || null,
      }]);
    } catch (err) {
      console.error('Gagal menyimpan hold cart ke database:', err);
    }

    clearCart(); setSelectedCustomer(null); setCustomerSearch('');
    setWaktuTransaksi(getLocalISOString(new Date()));
    const fin = new Date(); fin.setHours(fin.getHours() + 2);
    setEstimasiSelesai(getLocalISOString(fin));
    setEstimasiManual(false); setBiayaTambahan(0); setSelectedDiscountId(''); setCatatan(''); setMetodePembayaran('Tunai');
    setShowHoldPanel(false); playBeep('success');
    showToast(`Transaksi #${snapshot.holdId} di-hold! Keranjang baru siap.`, 'silent');
  }, [cart, selectedCustomer, customerSearch, waktuTransaksi, estimasiSelesai, estimasiManual, biayaTambahan, selectedDiscountId, catatan, metodePembayaran, showToast, currentTenantId, currentUser]);

  const handleResumeTransaction = useCallback(async (holdId) => {
    const snap = heldTransactions.find(h => h.holdId === holdId);
    if (!snap) return;
    if (cart.length > 0) {
      const currentSnap = createHoldSnapshot({ cart, selectedCustomer, customerSearch, waktuTransaksi, estimasiSelesai, estimasiManual, biayaTambahan, selectedDiscountId, catatan, metodePembayaran });
      setHeldTransactions(prev => [...prev.filter(h => h.holdId !== holdId), currentSnap]);
    } else {
      setHeldTransactions(prev => prev.filter(h => h.holdId !== holdId));
    }

    // Hapus dari database (fire and forget)
    if (snap.dbId) {
      supabase.from('held_carts').delete().eq('id', snap.dbId).then();
    }
    loadHoldSnapshot(snap); setSelectedCustomer(snap.selectedCustomer); setCustomerSearch(snap.customerSearch);
    setWaktuTransaksi(snap.waktuTransaksi); setEstimasiSelesai(snap.estimasiSelesai); setEstimasiManual(snap.estimasiManual);
    setBiayaTambahan(snap.biayaTambahan); setSelectedDiscountId(snap.selectedDiscountId); setCatatan(snap.catatan); setMetodePembayaran(snap.metodePembayaran);
    setShowHoldPanel(false); playBeep('scan');
    showToast(`Transaksi #${holdId} dilanjutkan!`, 'silent');
  }, [heldTransactions, cart, selectedCustomer, customerSearch, waktuTransaksi, estimasiSelesai, estimasiManual, biayaTambahan, selectedDiscountId, catatan, metodePembayaran, showToast]);

  const handleDeleteHold = useCallback((holdId) => {
    const snap = heldTransactions.find(h => h.holdId === holdId);
    setHeldTransactions(prev => prev.filter(h => h.holdId !== holdId));

    // Hapus dari database (fire and forget)
    if (snap && snap.dbId) {
      supabase.from('held_carts').delete().eq('id', snap.dbId).then();
    }

    showToast(`Hold #${holdId} dibatalkan`, 'error');
  }, [heldTransactions, showToast]);

  const handleAddToCart = useCallback((product) => {
    playBeep('scan');
    addToCart(product);
  }, [addToCart]);

  const handleCloseCamera = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setShowCamera(false); setCameraError('');
  }, []);

  const handleBarcodeDetected = useCallback((code) => {
    handleCloseCamera(); setScanResult(code); setSearchQuery('');
    const found = productsRef.current.find(p => p.barcode === code);
    if (found) { handleAddToCart(found); showToast(`${found.name} discan!`, 'success'); }
    else { setSearchQuery(code); showToast(`Barcode "${code}" tidak ditemukan`, 'error'); }
  }, [handleCloseCamera, handleAddToCart, showToast]);

  // ─── QTY EDIT ─────────────────────────────────────────────────────────────
  const handleQtyClick = (itemId, currentQty) => {
    setEditingQtyId(itemId); setEditingQtyVal(String(currentQty));
  };
  const handleQtyInputChange = (e) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    const clean = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : val;
    setEditingQtyVal(clean);
  };
  const handleQtyInputBlur = (itemId) => {
    const parsed = parseFloat(editingQtyVal);
    if (!isNaN(parsed) && parsed > 0) {
      updateCartItemQty(itemId, parsed);
    } else if (parsed === 0 || editingQtyVal === '0') {
      removeFromCart(itemId);
    }
    setEditingQtyId(null); setEditingQtyVal('');
  };
  const handleQtyInputKeyDown = (e, itemId) => {
    if (e.key === 'Enter') handleQtyInputBlur(itemId);
    if (e.key === 'Escape') { setEditingQtyId(null); setEditingQtyVal(''); }
  };

  // ─── AUTO ESTIMASI ────────────────────────────────────────────────────────
  useEffect(() => {
    if (estimasiManual) return;
    if (cart.length === 0) return;
    let maxMinutes = 0;
    cart.forEach(item => {
      const menit = durationNameToMinutes(item.duration, item.duration_type || '');
      if (menit > maxMinutes) maxMinutes = menit;
    });
    if (maxMinutes === 0) return;
    const base = waktuTransaksi ? new Date(waktuTransaksi) : new Date();
    setEstimasiSelesai(getLocalISOString(new Date(base.getTime() + maxMinutes * 60 * 1000)));
  }, [cart, waktuTransaksi, estimasiManual, durationUnits]);

  useEffect(() => { if (cart.length === 0) setEstimasiManual(false); }, [cart]);

  // ─── FETCHING DATA ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!currentTenantId) return;
    setLoadingProducts(true);
    try {
      let prodQuery = supabase.from('products').select('*').eq('tenant_id', currentTenantId).eq('is_active', true).order('name', { ascending: true });
      let custQuery = supabase.from('customers').select('*').eq('tenant_id', currentTenantId);
      let varQuery = supabase.from('variants').select('*').eq('tenant_id', currentTenantId);
      let discQuery = supabase.from('discounts').select('*').eq('tenant_id', currentTenantId);

      // Filter ketat berdasarkan Outlet
      if (currentUser?.outlet_id) {
        prodQuery = prodQuery.eq('outlet_id', currentUser.outlet_id);
        custQuery = custQuery.eq('outlet_id', currentUser.outlet_id);
        varQuery = varQuery.eq('outlet_id', currentUser.outlet_id);
        discQuery = discQuery.eq('outlet_id', currentUser.outlet_id);
      } else {
        prodQuery = prodQuery.is('outlet_id', null);
        custQuery = custQuery.is('outlet_id', null);
        varQuery = varQuery.is('outlet_id', null);
        discQuery = discQuery.is('outlet_id', null);
      }

      const { data: prodData } = await prodQuery;
      if (prodData) setProducts(prodData);

      const { data: custData } = await custQuery;
      if (custData) setCustomers(custData);

      const { data: varData } = await varQuery;
      if (varData) setVariants(varData); else setVariants([]);

      const { data: discData, error: discErr } = await discQuery;
      if (discData && !discErr) setDiscounts(discData); else setDiscounts([]);

      let isMainOutlet = false;
      if (currentUser?.outlet_id) {
        const { data: outletData } = await supabase.from('outlets').select('is_main').eq('id', currentUser.outlet_id).maybeSingle();
        if (outletData) isMainOutlet = outletData.is_main;
      } else {
        isMainOutlet = true;
      }

      let durQuery = supabase.from('duration_units').select('*').eq('tenant_id', currentTenantId);
      if (currentUser?.outlet_id) {
        if (isMainOutlet) {
          durQuery = durQuery.or(`outlet_id.eq.${currentUser.outlet_id},outlet_id.is.null`);
        } else {
          durQuery = durQuery.eq('outlet_id', currentUser.outlet_id);
        }
      } else {
        durQuery = durQuery.is('outlet_id', null);
      }
      const { data: durData } = await durQuery;
      if (durData) setDurationUnits(durData); else setDurationUnits([]);
    } catch (err) { console.error('Error fetch data:', err.message); }
    finally { setLoadingProducts(false); }
  }, [currentTenantId, currentUser?.outlet_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!currentTenantId) return;
    fetchPrinterSettings(currentTenantId, currentUser?.outlet_id).then(cfg => setPaymentSettings(cfg));
    supabase.from('tenants').select('tax_enabled, tax_rate, tax_inclusive, invoice_prefix')
      .eq('tenant_id', currentTenantId).maybeSingle()
      .then(({ data }) => {
        if (data) setTaxSettings({ enabled: data.tax_enabled ?? false, rate: Number(data.tax_rate) || 11, inclusive: data.tax_inclusive ?? false });
      });
    supabase.from('cash_shifts').select('id').eq('tenant_id', currentTenantId).eq('status', 'open').limit(1)
      .then(({ data }) => { if (data?.[0]) setActiveShiftId(data[0].id); });
    supabase.from('held_carts').select('*').eq('tenant_id', currentTenantId).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => {
        if (data?.length) setHeldTransactions(data.map((h) => ({ ...h.cart_data, dbId: h.id, holdId: h.cart_data?.holdId || h.id })));
      });
  }, [currentTenantId]);

  // ─── LOGIC PERHITUNGAN ────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const updateQuantity = (productId, amount) => {
    setCart(prev =>
      prev
        .map(i => i.id === productId ? { ...i, quantity: Number((Number(i.quantity) + amount).toFixed(2)) } : i)
        .filter(i => i.quantity > 0)
    );
  };



  const parseVariantOptions = (v) => {
    if (v.options) {
      try {
        const opts = typeof v.options === 'string' ? JSON.parse(v.options) : v.options;
        if (Array.isArray(opts)) return opts.map(o => ({ name: o.name || String(o), price: Number(o.price) || 0 }));
      } catch {
        if (typeof v.options === 'string') return v.options.split(',').map(s => ({ name: s.trim(), price: 0 }));
      }
    }
    return [];
  };

  // ─── KIRIM WA — PAKAI SETTING REAL DARI SUPABASE ─────────────────────────
  const handleKirimWA = useCallback(async () => {
    let phone = selectedCustomer?.phone || '';
    if (!phone) {
      phone = window.prompt('Pelanggan ini belum ada nomor WA-nya.\n\nMasukin nomor WA (Contoh: 08123456789):');
      if (!phone) return;
    }

    // Ambil setting WA dari Supabase
    const cfg = await fetchPrinterSettings(currentTenantId, currentUser?.outlet_id);
    const storeName = cfg.store_name || '';
    const waGreeting = cfg.wa_greeting || 'Halo Kak {nama} 👋';
    const waClosing = cfg.wa_closing || 'Terima kasih telah mempercayai kami! 🙏';
    const showEstimasi = cfg.wa_show_estimasi !== false;
    const showKasirWA = cfg.wa_show_kasir !== false;
    const showItemDetail = cfg.wa_show_item_detail !== false;

    let formattedPhone = phone.replace(/\D/g, '').replace(/^0+/, '');
    if (!formattedPhone.startsWith('62')) formattedPhone = '62' + formattedPhone;

    const kasirStr = resolveTransactionKasir(savedTransaction, currentUser);
    const custName = selectedCustomer?.name || 'Pelanggan Setia';
    const waktuStr = waktuTransaksi
      ? new Date(waktuTransaksi).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
    const estimasiStr = estimasiSelesai
      ? new Date(estimasiSelesai).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
    const statusStr = savedTransaction?.payment_method === 'Belum Lunas' ? 'BELUM BAYAR (NGEBON)' : 'LUNAS';

    const greeting = waGreeting
      .replace('{nama}', custName)
      .replace('{toko}', storeName || 'Toko Kami');
    const closing = waClosing.replace('{toko}', storeName || 'Toko Kami');

    const kasirLine = showKasirWA ? `\n👤 Kasir: *${kasirStr}*` : '';
    const estimasiLine = showEstimasi ? `\n⏰ Est. Selesai: ${estimasiStr}` : '';
    const catatanLine = catatan ? `\n📝 Catatan: ${catatan}` : '';

    const itemLines = cart.map(item => {
      const price = Number(item.price) + Number(item.variant_price_modifier || 0);
      const variantStr = item.selected_variant ? ` (${item.selected_variant})` : '';
      if (showItemDetail) {
        return `• ${item.name}${variantStr} × ${formatQty(item.quantity)} = ${formatRp(price * item.quantity)}`;
      }
      return `• ${item.name}${variantStr}`;
    }).join('\n');

    let paymentInstructionsWA = '';
    if (savedTransaction?.payment_method === 'Belum Lunas') {
      const methods = cfg?.payment_methods || {};
      const vaList = cfg?.va_numbers || [];
      const transferList = cfg?.transfer_banks || [];
      const ewalletList = cfg?.ewallet_numbers || [];
      const qrisMerchant = cfg?.xendit_merchant_id || '';
      const qrisOk = ['AKTIF', 'DIPROSES'].includes((cfg?.xendit_qris_status || '').toUpperCase());

      let instructions = [];

      if (methods.qris === true && qrisOk && qrisMerchant) {
        instructions.push(`• *QRIS (Scan Merchant)*\n  ID: ${qrisMerchant}`);
      }

      if (methods.virtual_account === true) {
        const suffix = String(currentTenantId).replace(/\D/g, '').substring(0, 7) || '1234567';
        const xenditVAs = qrisMerchant ? [
          { bank: 'BCA', code: '70070' },
          { bank: 'Mandiri', code: '89407' },
          { bank: 'BNI', code: '8810' },
          { bank: 'BRI', code: '26215' }
        ].map(v => `  - VA ${v.bank} (Xendit): *${v.code}${suffix}*`).join('\n') : '';

        const manualVAs = vaList.length > 0
          ? vaList.map(v => `  - VA ${v.bank}: *${v.number}* (a/n ${v.name})`).join('\n')
          : '';

        const allVAs = [xenditVAs, manualVAs].filter(Boolean).join('\n');
        if (allVAs) {
          instructions.push(`• *Virtual Account*\n${allVAs}`);
        }
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

    const text =
      `${greeting}\n\n` +
      `Berikut detail nota/invoice Anda:\n\n` +
      `🧾 No. Nota: *${savedTransaction?.invoice_number || savedTransaction?.id || '-'}*\n` +
      `📅 Waktu: ${waktuStr}` +
      `${estimasiLine}\n` +
      `💰 Total: *${formatRp(totalAkhir)}*\n` +
      `💳 Status: *${statusStr}*` +
      `${kasirLine}\n\n` +
      `Rincian Pesanan:\n${itemLines}` +
      `${catatanLine}` +
      `${paymentInstructionsWA}\n\n` +
      `${closing}`;

    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`, '_blank');
  }, [selectedCustomer, currentTenantId, currentUser, waktuTransaksi, estimasiSelesai, savedTransaction, catatan, cart, totalAkhir]);

  const handleNumpad = (val) => {
    if (val === 'C') setJumlahBayar(0);
    else if (val === 'DEL') setJumlahBayar(prev => Math.floor(prev / 10));
    else if (val === '00' && jumlahBayar > 0) setJumlahBayar(prev => prev * 100);
    else if (val === '000' && jumlahBayar > 0) setJumlahBayar(prev => prev * 1000);
    else if (val !== '00' && val !== '000') setJumlahBayar(prev => Number(prev.toString() + val));
  };

  // ─── SIMPAN TRANSAKSI ─────────────────────────────────────────────────────
  const handleSimpanTransaksi = async () => {
    if (cart.length === 0) return alert('Keranjang belanja kosong!');
    try { assertTenantId(currentTenantId, 'POS save'); } catch (e) { return alert(e.message); }
    setIsSaving(true);
    try {
      const jsonbItems = cart.map(item => ({
        id: item.id, name: item.name,
        price: Number(item.price) + Number(item.variant_price_modifier || 0),
        qty: item.quantity, unit: item.unit || 'Unit',
        duration: item.duration || 0, duration_type: item.duration_type || '',
        variant: item.selected_variant || ''
      }));
      const kasirStr = getKasirName(currentUser);
      const detailCustomerStr = selectedCustomer
        ? `[Customer: ${selectedCustomer.name} | Tlp: ${selectedCustomer.phone || '-'}]`
        : '[Customer: Guest (Umum)]';
      const kasirNote = `[Kasir: ${kasirStr}]`;
      const diskonStr = activeDiscountValue > 0 ? `[Diskon: ${formatRp(activeDiscountValue)}]` : '';
      const biayaTambahanStr = biayaTambahan ? `[Biaya Tambahan: ${formatRp(biayaTambahan)}]` : '';
      const taxStr = taxBreakdown.taxAmount > 0 ? `[PPN: ${formatRp(taxBreakdown.taxAmount)}]` : '';
      const estimasiNote = estimasiSelesai
        ? `[Est. Selesai: ${new Date(estimasiSelesai).toLocaleString('id-ID')}]` : '';
      const combinedNotes = [
        catatan ? `Catatan: ${catatan}` : '',
        detailCustomerStr, kasirNote, diskonStr, biayaTambahanStr, taxStr, estimasiNote
      ].filter(Boolean).join(' || ');

      let invoiceNumber = null;
      try {
        const { data: inv } = await supabase.rpc('next_invoice_number', { p_tenant_id: currentTenantId, p_prefix: 'INV' });
        invoiceNumber = inv;
      } catch { /* column/RPC may not exist yet */ }

      const basePayload = {
        tenant_id: currentTenantId,
        created_at: waktuTransaksi ? new Date(waktuTransaksi).toISOString() : new Date().toISOString(),
        items: jsonbItems,
        total: totalAkhir,
        subtotal: taxBreakdown.subtotal,
        tax_amount: taxBreakdown.taxAmount,
        payment_method: 'Belum Lunas',
        status: 'completed',
        notes: combinedNotes,
        invoice_number: invoiceNumber,
        shift_id: activeShiftId,
        outlet_id: currentUser?.outlet_id || null,
      };
      const payloadWithKasir = {
        ...basePayload,
        cashier_name: kasirStr,
        staff_id: currentUser?.staff_id ?? currentUser?.id ?? null,
      };

      let txData = null;
      let txError = null;
      ({ data: txData, error: txError } = await supabase
        .from('transactions')
        .insert([payloadWithKasir])
        .select()
        .single());

      if (txError && /cashier_name|staff_id|subtotal|tax_amount|invoice_number|shift_id|outlet_id|status/i.test(txError.message || '')) {
        ({ data: txData, error: txError } = await supabase
          .from('transactions')
          .insert([basePayload])
          .select()
          .single());
      }
      if (txError) throw txError;

      try {
        await supabase.rpc('deduct_product_stock', { p_tenant_id: currentTenantId, p_items: jsonbItems });
      } catch { /* RPC optional until migration applied */ }

      playBeep('success');
      setSavedTransaction(txData);
      setJumlahBayar(totalAkhir);
      setPaymentFlow('pilih_aksi');
      setShowDetail(true);
    } catch (err) { alert('Gagal simpan transaksi: ' + err.message); }
    finally { setIsSaving(false); }
  };

  const handleEksekusiPembayaran = async () => {
    if (useSplitPayment) {
      const splitTotal = splitPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
      if (splitTotal < totalAkhir) return alert('Total split payment kurang dari tagihan!');
    } else if (metodePembayaran === 'Tunai' && Number(jumlahBayar) < totalAkhir) {
      return alert('Uang Tunai Kurang Bos!');
    }
    setProsesBayar(true);
    try {
      const paymentLabel = useSplitPayment
        ? splitPayments.map((p) => `${p.method}: ${formatRp(p.amount)}`).join(' + ')
        : metodePembayaran;
      const updatePayload = {
        payment_method: paymentLabel,
        split_payments: useSplitPayment ? splitPayments : [],
      };

      // --- INTEGRASI API PPOB ---
      const ppobItems = cart.filter(i => i.is_ppob);
      if (ppobItems.length > 0 && metodePembayaran === 'Saldo Deposit') {
        for (const ppob of ppobItems) {
           const itemTotal = (Number(ppob.price) + Number(ppob.variant_price_modifier || 0)) * (Number(ppob.quantity) || 1);
           const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ppob/pay-with-balance`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               tenant_id: currentTenantId,
               outlet_id: currentUser?.outlet_id || null,
               sku_code: ppob.ppob_sku,
               customer_number: ppob.ppob_target,
               product_name: ppob.name,
               price: itemTotal,
               margin: 0
             })
           });
           const data = await res.json();
           if (!data.success) {
             throw new Error(data.error || "Gagal potong saldo deposit!");
           }
        }
      }

      const { error } = await supabase.from('transactions').update(updatePayload).eq('id', savedTransaction.id);
      if (error && /split_payments/i.test(error.message || '')) {
        await supabase.from('transactions').update({ payment_method: paymentLabel }).eq('id', savedTransaction.id);
      } else if (error) throw error;
      setSavedTransaction(prev => ({ ...prev, payment_method: paymentLabel, split_payments: useSplitPayment ? splitPayments : [] }));
      playBeep('success');

      setPaymentFlow('selesai');
      onSuccess?.();
      setShowSuccessModal(true);
    } catch (err) { alert('Gagal bayar: ' + err.message); }
    finally { setProsesBayar(false); }
  };

  useEffect(() => {
    if (useSplitPayment && splitPayments.length === 0) {
      setSplitPayments([
        { method: 'Tunai', amount: Math.floor(totalAkhir / 2) },
        { method: 'QRIS', amount: totalAkhir - Math.floor(totalAkhir / 2) },
      ]);
    }
  }, [useSplitPayment, totalAkhir, splitPayments.length]);

  const handleManualBarcode = (e) => {
    e.preventDefault();
    const code = e.target.barcodeInput?.value?.trim();
    if (code) handleBarcodeDetected(code);
  };

  const handleOpenCamera = useCallback(async () => {
    setCameraError(''); setShowCamera(true);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
      return setCameraError('⚠️ Browser ini tidak mendukung akses kamera.');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['code_128', 'ean_13', 'qr_code', 'code_39'] });
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) handleBarcodeDetected(barcodes[0].rawValue);
          } catch { }
        }, 500);
      }
    } catch { setCameraError('❌ Gagal membuka kamera.'); }
  }, [handleBarcodeDetected]);

  const estimasiLabel = useMemo(() => {
    if (!estimasiSelesai) return '-';
    return new Date(estimasiSelesai).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
  }, [estimasiSelesai]);

  const handleCustomerSaved = useCallback((newCustomer) => {
    setCustomers(prev => [...prev, newCustomer]);
    setSelectedCustomer(newCustomer);
    setCustomerSearch(newCustomer.name || '');
    setShowAddCustomerDialog(false);
    showToast(`Pelanggan "${newCustomer.name}" berhasil ditambahkan!`, 'silent');
  }, [showToast]);

  const handleProductSaved = useCallback((newProduct) => {
    setProducts(prev => [...prev, newProduct]);
    setShowAddProductDialog(false);
    showToast(`Produk "${newProduct.name}" berhasil ditambahkan!`, 'silent');
    handleAddToCart(newProduct);
  }, [showToast, handleAddToCart]);

  // ─── PRINT — PAKAI SETTING REAL ──────────────────────────────────────────
  const handlePrint = useCallback(() => {
    handlePrintNota({
      savedTransaction, cart, totalAkhir, subTotal, activeDiscountValue,
      biayaTambahan, selectedCustomer, waktuTransaksi, estimasiSelesai,
      catatan, tenantId: currentTenantId, currentUser, taxBreakdown
    });
  }, [savedTransaction, cart, totalAkhir, subTotal, activeDiscountValue, biayaTambahan, selectedCustomer, waktuTransaksi, estimasiSelesai, catatan, currentTenantId, currentUser, taxBreakdown]);

  const handlePrintBluetooth = useCallback(async () => {
    if (!currentTenantId) return alert('Tenant tidak terdeteksi.');
    try {
      const mockMeta = {
        customer: selectedCustomer?.name || 'Guest (Umum)',
        phone: selectedCustomer?.phone || '-',
        kasir: getKasirName(currentUser),
        catatan: catatan || null,
        diskon: activeDiscountValue > 0 ? formatRp(activeDiscountValue) : null,
        biayaTambahan: biayaTambahan > 0 ? formatRp(biayaTambahan) : null,
        estimasiSelesai: estimasiSelesai ? new Date(estimasiSelesai).toLocaleString('id-ID') : null
      };

      await printDirectBluetooth({
        transaction: savedTransaction,
        meta: mockMeta,
        tenantId: currentTenantId
      });
    } catch (err) {
      alert('Gagal cetak Bluetooth: ' + (err.message || 'unknown'));
    }
  }, [savedTransaction, cart, totalAkhir, subTotal, activeDiscountValue, biayaTambahan, selectedCustomer, waktuTransaksi, estimasiSelesai, catatan, currentTenantId, currentUser]);

  const kasirLabel = useMemo(() => getKasirName(currentUser), [currentUser]);

  const NAV_H = navbarHeight;

  if (!currentTenantId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <p className="text-sm font-black text-rose-600 uppercase">Tenant tidak terdeteksi. Silakan login ulang.</p>
        <button onClick={onClose} className="ml-4 text-xs font-bold underline">Tutup</button>
      </div>
    );
  }

  return (
    <div
      className="w-full flex flex-col font-sans text-slate-800 overflow-hidden select-none"
      style={{ background: '#f0faf8', flex: 1, height: '100%', minHeight: 0 }}
    >
      <style>{`
        :root {
          --pos-teal: #0a7c6e; --pos-teal-dark: #065f54; --pos-teal-light: #e0f5f1;
          --pos-orange: #f97316; --pos-orange-dark: #ea6c0a; --pos-orange-light: #fff3e8;
        }
        @keyframes toastPop {
          0% { opacity:0; transform:translateX(-50%) translateY(-10px) scale(0.9); }
          60% { transform:translateX(-50%) translateY(2px) scale(1.02); }
          100% { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes holdPop { from { opacity:0; transform:scale(0.95) translateY(-10px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .hold-panel-anim { animation: holdPop 0.2s cubic-bezier(0.34,1.56,0.64,1) both; }
        .pos-btn-teal { background: var(--pos-teal); color: white; }
        .pos-btn-teal:hover { background: var(--pos-teal-dark); }
        .pos-btn-orange { background: var(--pos-orange); color: white; }
        .pos-btn-orange:hover { background: var(--pos-orange-dark); }
        .pos-tab-active { color: var(--pos-teal); border-bottom: 2px solid var(--pos-teal); background: var(--pos-teal-light); }
        .pos-card { background: white; border: 1px solid #d1ede8; border-radius: 1rem; }
        .pos-input { background: #f8fffe; border: 1px solid #b2ddd6; border-radius: 0.625rem; padding: 0.5rem 0.75rem; font-size: 0.75rem; font-weight: 600; outline: none; width: 100%; }
        .pos-input:focus { border-color: var(--pos-teal); box-shadow: 0 0 0 2px rgba(10,124,110,0.12); }
        .hold-badge { background: var(--pos-orange); color: white; border-radius: 9999px; font-size: 9px; font-weight: 900; padding: 1px 5px; min-width: 16px; text-align: center; }
        .qty-input { width: 56px; text-align: center; font-size: 0.75rem; font-weight: 900; font-family: monospace; border: 1.5px solid #b2ddd6; border-radius: 0.5rem; padding: 2px 4px; outline: none; background: white; color: #065f54; }
        .qty-input:focus { border-color: var(--pos-teal); box-shadow: 0 0 0 2px rgba(10,124,110,0.15); }
        .pos-scroll::-webkit-scrollbar { width: 4px; }
        .pos-scroll::-webkit-scrollbar-track { background: transparent; }
        .pos-scroll::-webkit-scrollbar-thumb { background: #b2ddd6; border-radius: 4px; }
        .btn-print { background: linear-gradient(135deg, #1a4f47 0%, #0a7c6e 100%); color: white; border-radius: 0.75rem; font-weight: 900; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.875rem 1.5rem; width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s; cursor: pointer; border: none; }
        .btn-print:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .btn-print:active { transform: scale(0.98); }
      `}</style>

      {/* ─── HEADER ─── */}
      <div className="flex-shrink-0 flex justify-between items-center px-4 py-3 relative z-[100] flex-wrap gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>🏪</div>
          <div className="min-w-0">
            <h2 className="text-xs font-black tracking-tight uppercase">POS KASIR</h2>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <p className="text-[9px] font-mono font-bold uppercase hidden sm:inline" style={{ color: 'rgba(0,0,0,0.6)' }}>
                TENANT: {currentTenantId}
              </p>
              {kasirLabel && (
                <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase truncate max-w-[80px] sm:max-w-none inline-block shrink-0"
                  style={{ background: 'var(--pos-teal)', color: 'white' }}>
                  👤 {kasirLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowHoldPanel(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase transition"
              style={{ background: 'teal', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <PauseIcon sx={{ fontSize: 16 }} />
              <span className="hidden sm:inline">Hold</span>
              {heldTransactions.length > 0 && <span className="hold-badge">{heldTransactions.length}</span>}
            </button>

            {showHoldPanel && (
              <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/40 pointer-events-auto backdrop-blur-sm transition-opacity" onClick={() => setShowHoldPanel(false)}></div>
                <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 hold-panel-anim overflow-hidden pointer-events-auto flex flex-col max-h-[85vh]">
                  <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--pos-teal)', color: 'white' }}>
                    <p className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <PauseIcon sx={{ fontSize: 16 }} /> Transaksi Di-Hold ({heldTransactions.length})
                    </p>
                    <button onClick={() => setShowHoldPanel(false)} className="text-white/70 hover:text-white text-xs">✕</button>
                  </div>
                  {cart.length > 0 && (
                    <div className="p-3 border-b border-slate-100">
                      <button onClick={handleHoldTransaction}
                        className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition"
                        style={{ background: 'var(--pos-orange-light)', color: 'var(--pos-orange)', border: '1.5px dashed var(--pos-orange)' }}>
                        ⏸ Hold Transaksi Sekarang ({cart.reduce((s, i) => s + i.quantity, 0).toFixed(2)} item)
                      </button>
                    </div>
                  )}
                  {heldTransactions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <ShoppingCartIcon sx={{ fontSize: 60, opacity: 0.3, mb: 1 }} />
                      <p className="text-[10px] font-bold uppercase mt-2">Belum ada transaksi yang di-hold</p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                      {heldTransactions.map(h => {
                        const holdSubtotal = h.cart.reduce((s, i) => s + (Number(i.price) + Number(i.variant_price_modifier || 0)) * i.quantity, 0);
                        const holdTime = new Date(h.heldAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                        return (
                          <div key={h.holdId} className="p-3 hover:bg-slate-50 transition">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: 'var(--pos-teal)' }}>#{h.holdId}</span>
                                  <span className="text-[9px] text-slate-400 font-mono">{holdTime}</span>
                                </div>
                                <p className="text-[10px] font-black text-slate-700 truncate">{h.selectedCustomer?.name || 'Guest'} — {h.cart.length} produk</p>
                                <p className="text-[10px] font-mono font-black" style={{ color: 'var(--pos-teal)' }}>{formatRp(holdSubtotal)}</p>
                                <div className="flex flex-wrap gap-0.5 mt-1">
                                  {h.cart.slice(0, 3).map((item, i) => (
                                    <span key={i} className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold truncate max-w-[80px]">{item.name}</span>
                                  ))}
                                  {h.cart.length > 3 && <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">+{h.cart.length - 3}</span>}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1.5 flex-shrink-0">
                                <button onClick={() => handleResumeTransaction(h.holdId)}
                                  className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition text-white flex items-center gap-1" style={{ background: 'var(--pos-teal)' }}>
                                  <PlayArrowIcon sx={{ fontSize: 12 }} /> Lanjut
                                </button>
                                <button onClick={() => handleDeleteHold(h.holdId)}
                                  className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase bg-rose-50 text-rose-500 hover:bg-rose-100 transition flex items-center gap-1">
                                  <DeleteIcon sx={{ fontSize: 12 }} /> Hapus
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button onClick={onClose} className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition pos-btn-orange">
            ✕ Keluar
          </button>
        </div>
      </div>

      {/* ─── BODY UTAMA PPOB (E-WALLET STYLE) ─── */}
      {showPPOBModal && (
        <div className="fixed inset-0 z-[999999] bg-slate-50 flex flex-col pointer-events-auto overflow-hidden animate-in fade-in duration-200">
          
          {/* HEADER NAV */}
          <div className="px-6 py-4 flex items-center justify-between z-20 bg-gradient-to-r from-teal-600 to-emerald-600 text-white border-b border-teal-700 shadow-sm relative">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowPPOBModal(false)} className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-all backdrop-blur-sm active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <p className="text-lg font-black tracking-wide">PPOB & Digital</p>
                <p className="text-[10px] font-medium text-teal-100 uppercase tracking-widest">Powered by AgraPOS</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-teal-100">Kasir Aktif</p>
                <p className="text-sm font-bold">{kasirLabel || 'Staff'}</p>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-black text-xl border border-white/30">
                👤
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pos-scroll relative">
            {/* BACKGROUND GRADIENT HEADER */}
            <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-teal-600 via-teal-500 to-emerald-500 rounded-b-[2.5rem] z-0 shadow-lg shadow-teal-600/20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]"></div>
            </div>

            <div className="max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-6 relative z-10 flex flex-col min-h-full">
              <div className="flex-1 w-full mx-auto flex flex-col gap-6">
                  
                  {/* FLOATING BALANCE CARD */}
                  <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 transform transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-teal-500/10">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                        💰
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Saldo Deposit</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-black text-slate-600">Rupiah</span>
                          <span className="text-3xl font-black text-slate-800 tracking-tight">{loadingPpob ? '...' : formatRp(ppobBalance)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full sm:w-auto">
                      <button onClick={() => { if (onNavigate) onNavigate('ppob-withdraw'); }} className="flex-1 sm:flex-none flex flex-col items-center justify-center bg-orange-50 hover:bg-orange-100 text-orange-700 px-4 sm:px-6 py-3 rounded-2xl transition-colors font-black text-[10px] uppercase tracking-wider gap-1.5 border border-orange-100">
                        <span className="text-xl">💳</span> Withdraw
                      </button>
                      <button onClick={() => { if (onNavigate) onNavigate('ppob-topup'); }} className="flex-1 sm:flex-none flex flex-col items-center justify-center bg-teal-50 hover:bg-teal-100 text-teal-700 px-4 sm:px-6 py-3 rounded-2xl transition-colors font-black text-[10px] uppercase tracking-wider gap-1.5 border border-teal-100">
                        <span className="text-xl">➕</span> Top Up
                      </button>
                      <button onClick={() => { if (onNavigate) onNavigate('ppob-history'); }} className="flex-1 sm:flex-none flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 sm:px-6 py-3 rounded-2xl transition-colors font-black text-[10px] uppercase tracking-wider gap-1.5 border border-slate-200">
                        <span className="text-xl">📋</span> Riwayat
                      </button>
                    </div>
                  </div>

                  {/* CATEGORIES GRID ATAU INLINE PPOB FORM */}
                  {ppobCategory ? (
                    <PPOBInlineView
                      category={ppobCategory}
                      tenantId={currentTenantId}
                      onAddToCart={(item) => {
                        handleAddToCart(item);
                        setPpobCategory(null);
                        setShowPPOBModal(false);
                      }}
                      onClose={() => setPpobCategory(null)}
                    />
                  ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Top Up & Tagihan</h3>
                        <button className="text-[10px] font-black text-teal-600 uppercase tracking-widest hover:underline">Lihat Semua</button>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-7 gap-y-6 gap-x-2">
                        {[
                          { id: 'Pulsa', label: 'Pulsa', icon: <IconPulsa />, color: 'text-teal-600', bg: 'bg-teal-50' },
                          { id: 'Paket Data', label: 'Paket Data', icon: <IconData />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                          { id: 'Token PLN', label: 'Token PLN', icon: <IconListrik />, color: 'text-amber-500', bg: 'bg-amber-50' },
                          { id: 'Top Up E-Wallet', label: 'E-Wallet', icon: <IconEwallet />, color: 'text-orange-600', bg: 'bg-orange-50' },
                          { id: 'PDAM', label: 'Air PDAM', icon: <IconPDAM />, color: 'text-sky-500', bg: 'bg-sky-50' },
                          { id: 'Voucher Game', label: 'Game', icon: <IconGame />, color: 'text-rose-500', bg: 'bg-rose-50' },
                          { id: 'Lainnya', label: 'Lainnya', icon: <IconGrid />, color: 'text-slate-500', bg: 'bg-slate-50' },
                        ].map(cat => (
                          <button key={cat.id} onClick={() => setPpobCategory(cat.id)}
                            className="flex flex-col items-center gap-2 group outline-none">
                            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] flex items-center justify-center transition-all duration-300 ${cat.bg} ${cat.color} group-hover:scale-110 group-hover:shadow-lg group-active:scale-95 border border-white group-hover:border-slate-100`}>
                              {cat.icon}
                            </div>
                            <span className="text-[10px] sm:text-xs font-bold text-slate-600 group-hover:text-teal-600 text-center leading-tight px-1">{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}



                </div>
              </div>
          </div>
        </div>
      )}

      {!showDetail ? (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex lg:hidden border-b flex-shrink-0" style={{ background: 'white', borderColor: '#d1ede8' }}>
            <button onClick={() => setActiveTab('produk')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-black tracking-wider transition ${activeTab === 'produk' ? 'pos-tab-active' : 'text-slate-400'}`}>
              <Inventory2Icon sx={{ fontSize: 16 }} /> PRODUK
            </button>
            <button onClick={() => setActiveTab('keranjang')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-black tracking-wider transition ${activeTab === 'keranjang' ? 'pos-tab-active' : 'text-slate-400'}`}>
              <ShoppingCartIcon sx={{ fontSize: 16 }} /> NOTA ({cart.reduce((s, i) => s + i.quantity, 0).toFixed(2)})
            </button>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

            {/* ─── KATALOG PRODUK ─── */}
            <div className={`${activeTab === 'produk' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col overflow-y-auto pos-scroll p-3 space-y-3 min-h-0 pb-32`}>
              <div className="pos-card p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 flex-shrink-0">
                <div>
                  <label className="flex items-center gap-1 text-[9px] font-black uppercase mb-1" style={{ color: 'var(--pos-teal)' }}>
                    <CalendarMonthIcon sx={{ fontSize: 14 }} /> Waktu Transaksi
                  </label>
                  <input type="datetime-local" value={waktuTransaksi} onChange={(e) => setWaktuTransaksi(e.target.value)} className="pos-input" />
                </div>
                <div>
                  <label className="flex items-center flex-wrap gap-1 text-[9px] font-black uppercase mb-1" style={{ color: 'var(--pos-teal)' }}>
                    <ScheduleIcon sx={{ fontSize: 14 }} /> Estimasi Selesai&nbsp;
                    {!estimasiManual && cart.length > 0 && <span className="text-[8px] px-1 rounded font-bold" style={{ background: '#d1fae5', color: '#059669' }}>AUTO</span>}
                    {estimasiManual && <button onClick={() => setEstimasiManual(false)} className="text-[8px] px-1 rounded font-bold hover:opacity-80" style={{ background: '#fef3c7', color: '#d97706' }}>MANUAL ↺</button>}
                  </label>
                  <input type="datetime-local" value={estimasiSelesai}
                    onChange={(e) => { setEstimasiSelesai(e.target.value); setEstimasiManual(true); }} className="pos-input" />
                  {cart.length === 0 && <p className="text-[8px] text-slate-400 mt-0.5">Tambah produk untuk auto-hitung</p>}
                </div>
                <div className="relative">
                  <label className="flex items-center gap-1 text-[9px] font-black uppercase mb-1" style={{ color: 'var(--pos-teal)' }}>
                    <PersonIcon sx={{ fontSize: 14 }} /> Cari / Pilih Pelanggan
                  </label>
                  <div className="flex gap-1">
                    <div className="relative flex-1">
                      <input type="text" placeholder="Ketik nama pelanggan..."
                        value={customerSearch}
                        onChange={(e) => { setCustomerSearch(e.target.value); setShowCustDropdown(true); if (e.target.value === '') setSelectedCustomer(null); }}
                        onFocus={() => setShowCustDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCustDropdown(false), 200)}
                        className="pos-input" />
                      {showCustDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border rounded-xl shadow-xl max-h-40 overflow-y-auto" style={{ borderColor: '#d1ede8' }}>
                          {customers.filter(c => c?.name?.toLowerCase().includes(customerSearch.toLowerCase())).length > 0
                            ? customers.filter(c => c?.name?.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                              <div key={c.id}
                                onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name || ''); setShowCustDropdown(false); }}
                                className="p-2.5 text-xs font-bold border-b hover:cursor-pointer transition"
                                style={{ borderColor: '#f0faf8', color: '#1a4f47' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--pos-teal-light)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'white'}
                              >
                                {c.name || 'Tanpa Nama'} <span className="text-[9px] text-slate-400 font-mono ml-2">{c.phone || ''}</span>
                              </div>
                            ))
                            : <div className="p-3 text-xs text-center text-slate-400">Belum ada...</div>
                          }
                        </div>
                      )}
                    </div>
                    <button onClick={() => setShowAddCustomerDialog(true)} title="Tambah pelanggan baru"
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm transition pos-btn-teal" style={{ marginTop: '1px' }}>+</button>
                  </div>
                  {selectedCustomer && (
                    <p className="text-[8px] font-bold mt-0.5" style={{ color: 'var(--pos-teal)' }}>
                      ✅ {selectedCustomer.name} {selectedCustomer.phone ? `(${selectedCustomer.phone})` : ''}
                    </p>
                  )}
                </div>
              </div>

              <div className="pos-card p-3 flex flex-col sm:flex-row gap-2 flex-shrink-0">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <SearchIcon sx={{ fontSize: 18 }} />
                  </div>
                  <input type="text" placeholder="Cari nama produk / barcode..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pos-input w-full" style={{ paddingLeft: '2.5rem' }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddProductDialog(true)} title="Tambah produk baru"
                    className="flex-1 sm:flex-none py-2 px-3 rounded-xl text-xs font-black uppercase transition pos-btn-teal flex items-center justify-center gap-1">
                    <Inventory2Icon sx={{ fontSize: 14 }} /> + Produk
                  </button>
                  <button onClick={handleOpenCamera}
                    className="flex-1 sm:flex-none py-2 px-3 rounded-xl text-xs font-black uppercase transition pos-btn-teal flex items-center justify-center gap-1.5">
                    <QrCodeScannerIcon sx={{ fontSize: 16 }} /> SCAN
                  </button>
                  <button onClick={() => setShowPPOBModal(true)}
                    className="flex-1 sm:flex-none py-2 px-3 rounded-xl text-xs font-black uppercase transition flex items-center justify-center gap-1.5"
                    style={{ background: 'var(--pos-orange)', color: 'white' }}>
                    📱 PPOB
                  </button>
                </div>
              </div>

              <div className="pos-card p-3 flex-shrink-0">
                <div className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--pos-teal)' }}>
                  Daftar Menu / Layanan / Produk
                  {loadingProducts && <span className="ml-2 text-slate-400">⏳ Memuat...</span>}
                </div>
                {!loadingProducts && filteredProducts.length === 0 && (
                  <div className="flex items-center justify-center py-12 text-slate-300">
                    <p className="text-[10px] font-black uppercase tracking-wider">Tidak ada produk ditemukan</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {filteredProducts.map(p => {
                    const autoDisc = discounts.find(d => {
                      const ids = d.product_ids;
                      return Array.isArray(ids) && ids.length > 0 && ids.map(x => String(x)).includes(String(p.id));
                    });
                    const durasiLabel = p.duration ? `${p.duration} ${p.duration_type || ''}` : null;
                    return (
                      <div key={p.id} className="relative flex flex-col justify-between space-y-2 p-2.5 rounded-2xl border transition"
                        style={{ background: '#f8fffe', borderColor: '#c8e8e2' }}>
                        {autoDisc && (
                          <div className="absolute top-2 right-2 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider z-10"
                            style={{ background: 'var(--pos-orange)' }}>
                            {autoDisc.type?.toLowerCase().includes('percentage') ? `${autoDisc.value}% OFF` : formatRp(autoDisc.value)}
                          </div>
                        )}
                        <div className="flex gap-2 items-start">
                          <div className="w-11 h-11 rounded-lg flex items-center justify-center text-[9px] font-bold flex-shrink-0 overflow-hidden"
                            style={{ background: '#d1ede8', color: '#0a7c6e' }}>
                            {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover rounded-lg" /> : 'FOTO'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-xs truncate uppercase leading-tight text-slate-800">{p.name}</h4>
                            <p className="font-mono font-black text-xs" style={{ color: 'var(--pos-teal)' }}>{formatRp(p.price)}</p>
                            {durasiLabel && <p className="text-[8px] font-bold mt-0.5" style={{ color: 'var(--pos-orange)' }}>⏱ {durasiLabel}</p>}
                          </div>
                        </div>
                        <button
                          onClick={() => { handleAddToCart(p); showToast(`${p.name} ditambahkan ke nota`, 'silent'); }}
                          className="w-full p-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition pos-btn-teal">
                          + Tambah Ke Nota
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─── SIDEBAR KERANJANG ─── */}
            <div className={`${activeTab === 'keranjang' ? 'flex' : 'hidden'} lg:flex w-full lg:w-96 flex-col min-h-0 shadow-xl`}
              style={{ background: 'white', borderLeft: '1px solid #d1ede8' }}>
              <div className="flex-shrink-0 px-4 pt-3 pb-2 flex items-center justify-between border-b" style={{ borderColor: '#d1ede8' }}>
                <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--pos-teal)' }}>🧾 Rincian Nota Belanja</span>
                {cart.length > 0 && (
                  <button onClick={handleHoldTransaction} className="text-[8px] font-black uppercase px-2 py-1 rounded-lg transition"
                    style={{ background: 'var(--pos-orange-light)', color: 'var(--pos-orange)', border: '1px solid var(--pos-orange)' }}>⏸ Hold</button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto pos-scroll min-h-0 pb-32">
                <div className="px-4 py-3 space-y-2.5 flex flex-col">
                  <div className="space-y-2">
                    {cart.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12">
                        <p className="text-3xl mb-2">🛒</p>
                        <p className="text-[10px] font-black uppercase tracking-wider">Keranjang Kosong</p>
                        {heldTransactions.length > 0 && (
                          <button onClick={() => setShowHoldPanel(true)}
                            className="mt-4 px-3 py-2 rounded-xl text-[10px] font-black uppercase transition"
                            style={{ background: 'var(--pos-orange-light)', color: 'var(--pos-orange)', border: '1px solid var(--pos-orange)' }}>
                            ⏸ Lanjut {heldTransactions.length} Transaksi Hold
                          </button>
                        )}
                      </div>
                    ) : (
                      cart.map((item, idx) => (
                        <div key={idx} className="flex flex-col p-2.5 rounded-xl border" style={{ background: '#f8fffe', borderColor: '#c8e8e2' }}>
                          <div className="flex justify-between items-center">
                            <div className="min-w-0 flex-1 pr-1">
                              <p className="text-xs font-black text-slate-800 truncate uppercase leading-tight">{item.name}</p>
                              {item.is_ppob && <p className="text-[9px] font-bold text-rose-500 mb-0.5">Tujuan: {item.ppob_target}</p>}
                              <p className="text-[9px] font-bold uppercase" style={{ color: 'var(--pos-teal)' }}>
                                {formatRp(Number(item.price) + Number(item.variant_price_modifier || 0))}
                                {item.variant_price_modifier > 0 && <span className="ml-1" style={{ color: 'var(--pos-orange)' }}>(+{formatRp(item.variant_price_modifier)})</span>}
                              </p>
                              {item.duration > 0 && <p className="text-[8px] font-bold" style={{ color: 'var(--pos-orange)' }}>⏱ {item.duration} {item.duration_type}</p>}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button onClick={() => updateQuantity(item.id, -1)}
                                className="w-6 h-6 bg-white border text-sm font-bold rounded-lg transition hover:bg-rose-50 flex items-center justify-center"
                                style={{ borderColor: '#d1ede8' }}>−</button>
                              {editingQtyId === item.id ? (
                                <input type="text" inputMode="decimal" className="qty-input"
                                  value={editingQtyVal} onChange={handleQtyInputChange}
                                  onBlur={() => handleQtyInputBlur(item.id)}
                                  onKeyDown={(e) => handleQtyInputKeyDown(e, item.id)} autoFocus />
                              ) : (
                                <span className="font-mono font-black text-xs cursor-pointer px-2 py-1 rounded-lg hover:bg-teal-50 min-w-[44px] text-center"
                                  style={{ color: 'var(--pos-teal-dark)', border: '1px dashed #b2ddd6' }}
                                  onClick={() => handleQtyClick(item.id, item.quantity)}
                                  title="Klik untuk edit qty (support desimal)">
                                  {formatQty(item.quantity)}
                                </span>
                              )}
                              <button onClick={() => updateQuantity(item.id, 1)}
                                className="w-6 h-6 bg-white border text-sm font-bold rounded-lg transition hover:bg-teal-50 flex items-center justify-center"
                                style={{ borderColor: '#d1ede8' }}>+</button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t" style={{ borderColor: '#e8f7f4' }}>
                            <span className="text-[8px] text-slate-400 font-bold uppercase">Subtotal</span>
                            <span className="text-[10px] font-black font-mono" style={{ color: 'var(--pos-teal-dark)' }}>
                              {formatRp((Number(item.price) + Number(item.variant_price_modifier || 0)) * item.quantity)}
                            </span>
                          </div>
                          <select
                            value={item.selected_variant || ''}
                            onChange={(e) => {
                              const selectedVal = e.target.value;
                              let priceModifier = 0;
                              if (selectedVal) {
                                for (const v of variants) {
                                  const opts = parseVariantOptions(v);
                                  const found = opts.find(o => `${v.name} - ${o.name}` === selectedVal || o.name === selectedVal);
                                  if (found) { priceModifier = found.price; break; }
                                }
                              }
                              updateCartItemVariant(item.id, selectedVal, priceModifier);
                            }}
                            className="w-full mt-2 bg-white border text-[10px] font-bold p-1.5 rounded-lg outline-none"
                            style={{ borderColor: '#c8e8e2', color: '#1a4f47' }}>
                            <option value="">-- Pilih Varian (Opsional) --</option>
                            {variants.map(v => {
                              const opts = parseVariantOptions(v);
                              if (opts.length > 0) {
                                return (
                                  <optgroup key={v.id} label={v.name}>
                                    {opts.map((opt, oi) => (
                                      <option key={`${v.id}-${oi}`} value={`${v.name} - ${opt.name}`}>
                                        {opt.name}{opt.price > 0 ? ` (+${formatRp(opt.price)})` : ''}
                                      </option>
                                    ))}
                                  </optgroup>
                                );
                              }
                              return <option key={v.id} value={v.name}>{v.name}</option>;
                            })}
                          </select>
                        </div>
                      ))
                    )}
                  </div>

                  {cart.length > 0 && (
                    <div className="rounded-xl p-2.5 flex-shrink-0 flex items-center justify-between"
                      style={{ background: 'var(--pos-teal-light)', border: '1px solid #b2ddd6' }}>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-wider" style={{ color: 'var(--pos-teal)' }}>⏰ Estimasi Selesai</p>
                        <p className="text-xs font-black" style={{ color: 'var(--pos-teal-dark)' }}>{estimasiLabel}</p>
                      </div>
                      {estimasiManual
                        ? <span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#fef3c7', color: '#d97706' }}>MANUAL</span>
                        : <span className="text-[8px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#d1fae5', color: '#059669' }}>AUTO</span>}
                    </div>
                  )}

                  <div className="rounded-xl p-3 space-y-2 flex-shrink-0" style={{ background: '#f8fffe', border: '1px solid #c8e8e2' }}>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[8px] font-black uppercase mb-0.5 text-rose-500">Pilih Diskon</label>
                        <select value={selectedDiscountId} onChange={(e) => setSelectedDiscountId(e.target.value)}
                          className="w-full bg-white border text-[10px] font-bold p-1.5 rounded-lg outline-none"
                          style={{ borderColor: '#c8e8e2', color: '#1a4f47' }}>
                          <option value="">-- Tanpa Diskon --</option>
                          {discounts.map(d => {
                            const rawVal = Number(d.value || d.nominal || d.amount || 0);
                            const typeStr = String(d.type || '').toLowerCase();
                            const isPercent = typeStr.includes('persen') || typeStr.includes('percentage') || typeStr === 'percent';
                            const valLabel = isPercent ? `${rawVal}%` : formatRp(rawVal);
                            const applicableQty = getDiscountApplicableQty(d);
                            const isApplicable = applicableQty === null || applicableQty > 0;
                            const productLabel = applicableQty !== null ? ` 🎯` : ' 🌐';
                            return (
                              <option key={d.id} value={d.id} disabled={!isApplicable}>
                                {d.name} ({valLabel}){productLabel}{!isApplicable ? ' — produk tidak di cart' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[8px] font-black uppercase mb-0.5 text-slate-400">Biaya Tambahan (Rupiah)</label>
                        <input type="number" value={biayaTambahan || ''} onChange={(e) => setBiayaTambahan(Number(e.target.value) || 0)} className="pos-input" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase mb-0.5 text-slate-400">Catatan</label>
                      <input type="text" placeholder="Catatan invoice..." value={catatan} onChange={(e) => setCatatan(e.target.value)} className="pos-input" />
                    </div>
                    {taxSettings.rate > 0 && (
                      <label className="flex justify-between items-center bg-teal-50/50 p-2.5 rounded-xl border border-teal-100 cursor-pointer hover:bg-teal-50 transition-colors">
                        <span className="text-[9px] font-black uppercase text-teal-700 select-none">
                          Terapkan PPN ({taxSettings.rate}%)
                        </span>
                        <div className={`relative w-11 h-6 rounded-full transition-all duration-200 shrink-0 ${taxSettings.enabled ? 'bg-teal-500' : 'bg-slate-200'}`}>
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${taxSettings.enabled ? 'translate-x-5' : ''}`} />
                        </div>
                        <input
                          type="checkbox"
                          checked={taxSettings.enabled}
                          onChange={(e) => setShowPpnConfirm({ show: true, nextState: e.target.checked, tempRate: taxSettings.rate || 11 })}
                          className="sr-only"
                        />
                      </label>
                    )}
                  </div>

                  <div className="border-t pt-2 space-y-1.5 bg-white flex-shrink-0" style={{ borderColor: '#d1ede8' }}>
                    {activeDiscountValue > 0 && (
                      <div className="flex justify-between items-center text-xs text-rose-600 font-bold">
                        <span>Diskon Aktif</span><span>- {formatRp(activeDiscountValue)}</span>
                      </div>
                    )}
                    {taxBreakdown.taxAmount > 0 && (
                      <div className="flex justify-between items-center text-xs text-slate-600 font-bold">
                        <span>PPN ({taxSettings.rate}%)</span><span>+ {formatRp(taxBreakdown.taxAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1.5">
                      <span className="text-xs font-black uppercase text-slate-400">Total Akhir Nota</span>
                      <span className="text-base font-black font-mono" style={{ color: 'var(--pos-teal-dark)' }}>{formatRp(totalAkhir)}</span>
                    </div>
                    {kasirLabel && (
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold">
                        <span>👤 Kasir</span><span>{kasirLabel}</span>
                      </div>
                    )}
                  </div>

                  <button onClick={handleSimpanTransaksi} disabled={isSaving || cart.length === 0}
                    className="w-full py-3.5 rounded-xl flex items-center justify-center font-black text-xs uppercase tracking-wider disabled:opacity-40 transition-transform pos-btn-teal">
                    {isSaving ? '⏳ Menyimpan...' : '💾 Lanjut Ke Pembayaran'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      ) : (
        /* ─── SCREEN DETAIL TRANSAKSI & PEMBAYARAN ─── */
        <div className="flex-1 overflow-y-auto pos-scroll p-4 lg:p-8 flex items-start justify-center">
          <div className="max-w-6xl w-full bg-white rounded-3xl shadow-2xl flex flex-col lg:flex-row overflow-hidden my-2" style={{ border: '1px solid #d1ede8' }}>

            {/* KOLOM KIRI */}
            <div className="flex-1 p-6 flex flex-col overflow-y-auto pos-scroll max-h-[85vh]" style={{ background: '#f8fffe', borderRight: '1px solid #d1ede8' }}>

              {/* HEADER STATUS */}
              <div className="flex items-center gap-4 border-b pb-4 mb-5" style={{ borderColor: '#d1ede8' }}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 shadow-sm ${paymentFlow === 'selesai' || paymentFlow === 'bon_selesai' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                  {paymentFlow === 'selesai' || paymentFlow === 'bon_selesai' ? '✅' : '⏳'}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md"
                    style={savedTransaction?.payment_method === 'Belum Lunas'
                      ? { background: 'var(--pos-orange-light)', color: 'var(--pos-orange)', border: '1px solid var(--pos-orange)' }
                      : { background: 'var(--pos-teal-light)', color: 'var(--pos-teal-dark)', border: '1px solid var(--pos-teal)' }
                    }>
                    {savedTransaction?.payment_method === 'Belum Lunas' ? 'BELUM LUNAS (BON)' : 'LUNAS'}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mt-1.5 leading-none">
                    Transaksi Disimpan
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    No. Nota: <span className="font-bold text-teal-800">{savedTransaction?.invoice_number || savedTransaction?.id || '-'}</span>
                  </p>
                </div>
              </div>

              {/* GRID INFO UTAMA TRANSAKSI */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">👤 Pelanggan</p>
                  <p className="text-xs font-black text-slate-800 truncate">
                    {selectedCustomer ? selectedCustomer.name : 'Pelanggan Umum (Guest)'}
                  </p>
                  {selectedCustomer?.phone && (
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">{selectedCustomer.phone}</p>
                  )}
                </div>
                <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">👤 Kasir</p>
                  <p className="text-xs font-black text-slate-800 truncate">{kasirLabel || 'Staff Kasir'}</p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                    {new Date(savedTransaction?.created_at || waktuTransaksi || new Date()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </p>
                </div>
              </div>

              {/* RINCIAN PESANAN */}
              <div className="bg-white rounded-2xl p-4 mb-4 flex-1 flex flex-col" style={{ border: '1px solid #d1ede8' }}>
                <p className="font-black text-[10px] uppercase tracking-wider border-b pb-2 mb-3" style={{ color: 'var(--pos-teal)', borderColor: '#d1ede8' }}>
                  🛒 Rincian Pesanan
                </p>
                <div className="space-y-3 overflow-y-auto pos-scroll pr-2 min-h-[120px] max-h-[28vh]">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-sm border-b pb-2" style={{ borderColor: '#f0faf8' }}>
                      <div className="flex-1 pr-4">
                        <p className="font-bold text-slate-800 uppercase leading-tight">{item.name}</p>
                        {item.selected_variant && <p className="text-[9px] font-bold uppercase mt-0.5" style={{ color: 'var(--pos-orange)' }}>Varian: {item.selected_variant}</p>}
                        {item.duration > 0 && <p className="text-[9px] font-bold" style={{ color: 'var(--pos-teal)' }}>⏱ {item.duration} {item.duration_type}</p>}
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {formatQty(item.quantity)} × {formatRp(Number(item.price) + Number(item.variant_price_modifier || 0))}
                        </p>
                      </div>
                      <p className="font-black font-mono text-slate-900">
                        {formatRp(item.quantity * (Number(item.price) + Number(item.variant_price_modifier || 0)))}
                      </p>
                    </div>
                  ))}
                </div>

                {estimasiSelesai && (
                  <div className="mt-3 pt-2 border-t flex items-center gap-2" style={{ borderColor: '#d1ede8' }}>
                    <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: 'var(--pos-teal)' }}>⏰ Estimasi Selesai:</span>
                    <span className="text-xs font-black" style={{ color: 'var(--pos-teal-dark)' }}>{estimasiLabel}</span>
                  </div>
                )}

                <div className="border-t mt-3 pt-3 space-y-1.5 text-xs flex-shrink-0" style={{ borderColor: '#d1ede8' }}>
                  <div className="flex justify-between text-slate-500 font-medium"><span>Subtotal</span><span>{formatRp(subTotal)}</span></div>
                  {activeDiscountValue > 0 && <div className="flex justify-between text-rose-600 font-medium"><span>Diskon</span><span>- {formatRp(activeDiscountValue)}</span></div>}
                  {Number(biayaTambahan) > 0 && <div className="flex justify-between text-slate-600 font-medium"><span>Biaya Tambahan</span><span>+ {formatRp(biayaTambahan)}</span></div>}
                  {taxBreakdown?.taxAmount > 0 && <div className="flex justify-between text-slate-600 font-medium"><span>PPN / Pajak ({taxSettings.rate}%)</span><span>+ {formatRp(taxBreakdown.taxAmount)}</span></div>}
                  <div className="flex justify-between items-center pt-2 mt-2 border-t" style={{ borderColor: '#d1ede8' }}>
                    <span className="font-black uppercase text-slate-500 text-sm">Total Tagihan</span>
                    <span className="font-black font-mono text-xl" style={{ color: 'var(--pos-teal)' }}>{formatRp(totalAkhir)}</span>
                  </div>
                </div>
              </div>

              {/* QRIS STATIS NOTA */}
              {savedTransaction?.payment_method === 'Belum Lunas' && paymentSettings?.payment_qris_enabled && (paymentSettings?.xendit_merchant_id || ['AKTIF', 'DIPROSES'].includes((paymentSettings?.xendit_qris_status || '').toUpperCase())) && (
                <div className="bg-white rounded-2xl p-4 mb-4 flex flex-col items-center justify-center text-center border shrink-0 animate-in fade-in duration-300" style={{ borderColor: '#d1ede8' }}>
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">📋 SCAN QRIS STATIS TOKO</p>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent('https://agrapos.dev/merchant/' + (paymentSettings.xendit_merchant_id || 'ID-AGRAPOS-DEMO'))}`}
                    alt="QRIS Statis Toko"
                    className="w-24 h-24 object-contain mb-1.5"
                  />
                  <span className="font-mono text-[8px] text-slate-400 font-bold">{paymentSettings.xendit_merchant_id || 'ID-AGRAPOS-DEMO'}</span>
                </div>
              )}

              {/* CATATAN TRANSAKSI */}
              {catatan && (
                <div className="mb-4 text-xs text-slate-600 bg-white border border-slate-100 rounded-2xl px-4 py-3 italic shadow-sm flex gap-2 items-start shrink-0">
                  <span className="shrink-0">📝</span>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider not-italic mb-0.5">Catatan Invoice</p>
                    <p className="font-medium">&ldquo;{catatan}&rdquo;</p>
                  </div>
                </div>
              )}

              {/* TOMBOL AKSI CETAK & SHARE */}
              {savedTransaction && (
                <div className="mt-4 pt-4 flex-shrink-0 flex flex-col gap-2.5" style={{ borderTop: '1px solid #d1ede8' }}>
                  <button onClick={handlePrintBluetooth} className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shadow-lg shadow-teal-600/30 hover:brightness-110 active:scale-95 flex items-center justify-center gap-1.5 border-none cursor-pointer">
                    <BluetoothIcon sx={{ fontSize: 18 }} /> Cetak Bluetooth
                  </button>
                  <div className="flex items-center gap-2.5">
                    <button onClick={handlePrint} className="flex-1 py-3 bg-teal-50 text-teal-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-teal-100 hover:bg-teal-100 flex items-center justify-center gap-1.5 cursor-pointer">
                      <PrintIcon sx={{ fontSize: 16 }} /> Print Standar
                    </button>
                    <button onClick={handleKirimWA} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 hover:brightness-110 active:scale-95 flex items-center justify-center gap-1.5 border-none cursor-pointer">
                      <WhatsAppIcon sx={{ fontSize: 16 }} /> Kirim WA
                    </button>
                  </div>

                  <div className="text-center mt-1">
                    <span className="inline-flex items-center gap-1 text-[9px] text-slate-400 font-bold bg-white px-3 py-1 rounded-full border border-slate-100">
                      <PersonIcon sx={{ fontSize: 12 }} /> Customer: {selectedCustomer ? selectedCustomer.name : 'Guest'} {selectedCustomer?.phone ? `(${selectedCustomer.phone})` : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* KOLOM KANAN: NUMPAD & PEMBAYARAN */}
            <div className="flex-1 p-6 flex flex-col justify-center bg-white relative">
              {paymentFlow === 'pilih_aksi' ? (
                <div className="max-w-sm mx-auto w-full space-y-6 flex flex-col items-center justify-center">
                  <div className="text-center space-y-2 mb-4">
                    <h4 className="font-black text-slate-800 text-lg uppercase">Pilih Aksi Pembayaran</h4>
                    <p className="text-xs text-slate-500 font-medium">Transaksi udah disimpen. Mau diapain nih?</p>
                  </div>
                  <button onClick={() => { setPaymentFlow('bon_selesai'); }}
                    className="w-full bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 text-slate-700 p-5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all transform hover:scale-105 shadow-sm flex flex-col items-center gap-2">
                    <ScheduleIcon sx={{ fontSize: 28, color: '#64748b' }} /><span>Simpan (Belum Lunas)</span>
                  </button>
                  <div className="w-full flex items-center gap-3 text-slate-300">
                    <div className="flex-1 border-t border-slate-200"></div>
                    <span className="text-[10px] font-black uppercase">ATAU</span>
                    <div className="flex-1 border-t border-slate-200"></div>
                  </div>
                  <button onClick={() => setPaymentFlow('bayar_langsung')}
                    className="w-full text-white p-5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all transform hover:scale-105 shadow-xl flex flex-col items-center gap-2 pos-btn-teal">
                    <CreditCardIcon sx={{ fontSize: 28 }} /><span>Bayar Sekarang (Lunas)</span>
                  </button>
                </div>

              ) : paymentFlow === 'bon_selesai' ? (
                <div className="max-w-sm mx-auto w-full text-center space-y-6">
                  <div className="mb-4 text-amber-500 flex justify-center">
                    <ReceiptIcon sx={{ fontSize: 64 }} />
                  </div>
                  <h4 className="font-black text-amber-600 text-2xl uppercase">DISIMPAN!</h4>
                  <p className="text-sm text-slate-500 font-medium">Sip, transaksi ini masuk ke riwayat sebagai "Belum Lunas".</p>
                  <div className="text-[10px] font-bold text-slate-400 mt-2 mb-4 bg-slate-50 p-3 rounded-xl border">
                    Cetak Nota atau Kirim WA lewat panel sebelah kiri 👈
                  </div>
                  <button onClick={() => { if (onSuccess) onSuccess(); onClose(); }}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white p-4 rounded-xl font-black uppercase tracking-wider shadow-lg">
                    ✕ Tutup Layar Kasir
                  </button>
                </div>

              ) : paymentFlow === 'selesai' ? (
                <div className="max-w-sm mx-auto w-full text-center space-y-6">
                  <div className="mb-4 text-emerald-500 flex justify-center">
                    <CheckCircleIcon sx={{ fontSize: 64 }} />
                  </div>
                  <h4 className="font-black text-emerald-600 text-2xl uppercase">LUNAS!</h4>
                  <p className="text-sm text-slate-500 font-medium">Transaksi beres. Lu bisa print nota / kirim WA atau tutup kasir.</p>
                  <div className="text-[10px] font-bold text-slate-400 mt-2 mb-4 bg-emerald-50 text-emerald-700 p-3 rounded-xl border border-emerald-100">
                    Cetak Nota atau Kirim WA lewat panel sebelah kiri 👈
                  </div>
                  <button onClick={() => { if (onSuccess) onSuccess(); onClose(); }}
                    className="w-full bg-slate-800 text-white p-4 rounded-xl font-black uppercase tracking-wider shadow-lg">
                    ✕ Tutup Layar Kasir
                  </button>
                </div>

              ) : (
                <div className="max-w-sm mx-auto w-full space-y-4">
                  {!cart.some(i => i.is_ppob) && (
                    <label className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-500 cursor-pointer">
                      <input type="checkbox" checked={useSplitPayment} onChange={(e) => setUseSplitPayment(e.target.checked)} />
                      Split Payment (bayar campuran)
                    </label>
                  )}
                  {useSplitPayment && !cart.some(i => i.is_ppob) ? (
                    <div className="space-y-2 bg-slate-50 p-3 rounded-xl border">
                      {splitPayments.map((sp, idx) => (
                        <div key={idx} className="flex gap-2">
                          <select value={sp.method} onChange={(e) => {
                            const next = [...splitPayments];
                            next[idx] = { ...next[idx], method: e.target.value };
                            setSplitPayments(next);
                          }} className="flex-1 border rounded-lg px-2 py-1 text-xs font-bold">
                            {buildPaymentMethods(paymentSettings).map((m) => <option key={m.key} value={m.label}>{m.label}</option>)}
                          </select>
                          <input type="number" value={sp.amount || ''} placeholder="0" onChange={(e) => {
                            const next = [...splitPayments];
                            next[idx] = { ...next[idx], amount: Number(e.target.value) || 0 };
                            setSplitPayments(next);
                          }} className="w-28 border rounded-lg px-2 py-1 text-xs font-bold" />
                        </div>
                      ))}
                      <button type="button" onClick={() => setSplitPayments([...splitPayments, { method: 'Tunai', amount: 0 }])} className="text-[10px] font-black uppercase text-teal-600">+ Tambah Metode</button>
                    </div>
                  ) : (
                    <>
                      {/* ── PILIH METODE PEMBAYARAN (DINAMIS DARI SETTINGS) ── */}
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 text-center tracking-wider">Pilih Metode Pembayaran</label>
                        <div className={`grid gap-2 ${buildPaymentMethods(paymentSettings, cart).length <= 3 ? 'grid-cols-3' : buildPaymentMethods(paymentSettings, cart).length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                          {buildPaymentMethods(paymentSettings, cart).map(m => (
                            <button key={m.key} type="button" onClick={() => setMetodePembayaran(m.label)}
                              className={`p-2.5 rounded-xl text-[10px] font-black border transition flex flex-col items-center gap-1 ${metodePembayaran === m.label
                                ? 'text-white border-transparent shadow-md transform scale-105'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              style={metodePembayaran === m.label ? { background: 'var(--pos-teal)', borderColor: 'var(--pos-teal)' } : {}}>
                              <span className="text-base">{m.icon}</span>
                              <span>{m.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ── AREA INFO PEMBAYARAN SPESIFIK ── */}
                      {metodePembayaran === 'Tunai' ? (
                        <div className="space-y-3">
                          <label className="block text-[10px] font-black uppercase text-slate-400 text-center tracking-wider">Input Uang Tunai Diterima (Rupiah)</label>
                          <div className="rounded-2xl p-4 text-center" style={{ background: '#f8fffe', border: '2px solid #b2ddd6' }}>
                            <span className="text-3xl font-mono font-black text-slate-900">{formatRp(jumlahBayar)}</span>
                          </div>
                          <div className="grid grid-cols-4 gap-2.5">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '00', 0, '000'].map((num) => (
                              <button key={num} onClick={() => handleNumpad(num)}
                                className="bg-white border border-slate-200 shadow-sm hover:bg-slate-100 p-3.5 rounded-xl font-black font-mono text-xl transition active:scale-95">
                                {num}
                              </button>
                            ))}
                            <button onClick={() => handleNumpad('C')} className="col-span-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 p-3 rounded-xl font-black text-sm uppercase transition active:scale-95 tracking-wider">Clear (C)</button>
                            <button onClick={() => handleNumpad('DEL')} className="col-span-2 bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 p-3 rounded-xl font-black text-sm uppercase transition active:scale-95 tracking-wider">Hapus ⌫</button>
                          </div>
                          <button onClick={() => setJumlahBayar(totalAkhir)}
                            className="w-full bg-slate-100 border border-slate-200 text-slate-700 font-bold p-3 rounded-xl text-xs hover:bg-slate-200 transition uppercase tracking-wider mt-1">
                            💵 Pas Sesuai Tagihan
                          </button>
                        </div>
                      ) : metodePembayaran === 'Saldo Deposit' ? (
                        <div className="space-y-3">
                          <label className="block text-[10px] font-black uppercase text-slate-400 text-center tracking-wider">Potong Saldo Deposit (Rupiah)</label>
                          <div className="rounded-2xl p-4 text-center" style={{ background: '#fdf4ff', border: '2px solid #f0abfc' }}>
                            <span className="text-3xl font-mono font-black text-fuchsia-700">{formatRp(totalAkhir)}</span>
                          </div>
                          <div className="text-center bg-fuchsia-50 p-3 rounded-xl border border-fuchsia-100">
                            <p className="text-[10px] font-bold text-fuchsia-800">Saldo Deposit internal Anda akan dipotong sejumlah {formatRp(totalAkhir)}.</p>
                            <p className="text-[9px] text-fuchsia-600 mt-1">Pastikan saldo Anda cukup sebelum menyelesaikan pembayaran.</p>
                          </div>
                        </div>
                      ) : (() => {
                        // Kumpulkan info rekening yang relevan berdasarkan metode dipilih
                        const cfg = paymentSettings || {};
                        const vaNumbers = Array.isArray(cfg.va_numbers) ? cfg.va_numbers : [];
                        const transferBanks = Array.isArray(cfg.transfer_banks) ? cfg.transfer_banks : [];
                        const ewalletNumbers = Array.isArray(cfg.ewallet_numbers) ? cfg.ewallet_numbers : [];
                        const qrisMerchant = cfg.xendit_merchant_id || '';

                        const isQris = metodePembayaran === 'QRIS';
                        const isVA = metodePembayaran === 'Virtual Account';
                        const isTransfer = metodePembayaran === 'Transfer Bank';
                        const isEwallet = metodePembayaran === 'e-Wallet';

                        let rekeningList = [];
                        if (isVA) {
                          const suffix = String(tenantId).replace(/\D/g, '').substring(0, 7) || '1234567';
                          const xenditVAs = qrisMerchant ? [
                            { bank: 'BCA', code: '70070' },
                            { bank: 'Mandiri', code: '89407' },
                            { bank: 'BNI', code: '8810' },
                            { bank: 'BRI', code: '26215' }
                          ].map(v => ({
                            label: `🏦 VA ${v.bank} (Xendit Fixed)`,
                            number: `${v.code}${suffix}`,
                            name: cfg.store_name || 'MERCHANT'
                          })) : [];

                          const dynamicVAs = qrisMerchant ? [
                            { bank: 'BCA', code: '883011', suffix: '12' },
                            { bank: 'Mandiri', code: '894022', suffix: '34' }
                          ].map(v => ({
                            label: `🏦 VA ${v.bank} (Xendit Dinamis)`,
                            number: `${v.code}${totalAkhir}${v.suffix}`,
                            name: `${cfg.store_name || 'MERCHANT'} - ${formatRp(totalAkhir)}`
                          })) : [];

                          if (vaType === 'dinamis') {
                            rekeningList = [...dynamicVAs];
                            if (rekeningList.length === 0 && !qrisMerchant && vaNumbers.length === 0) {
                              rekeningList = [
                                { label: '🏦 VA BCA (DEMO Dinamis)', number: `883011${totalAkhir}12`, name: 'AGRAPOS DEMO MERCHANT' },
                                { label: '🏦 VA MANDIRI (DEMO Dinamis)', number: `894022${totalAkhir}34`, name: 'AGRAPOS DEMO MERCHANT' }
                              ];
                            }
                          } else {
                            // fixed VAs
                            rekeningList = [
                              ...xenditVAs,
                              ...vaNumbers.map(v => ({ label: `🏦 VA ${v.bank}`, number: v.number, name: v.name }))
                            ];
                            if (rekeningList.length === 0 && !qrisMerchant && vaNumbers.length === 0) {
                              rekeningList = [
                                { label: '🏦 VA BCA (DEMO Fixed)', number: `70070${suffix}`, name: 'AGRAPOS DEMO MERCHANT' },
                                { label: '🏦 VA MANDIRI (DEMO Fixed)', number: `89407${suffix}`, name: 'AGRAPOS DEMO MERCHANT' }
                              ];
                            }
                          }
                        } else if (isTransfer) {
                          rekeningList = transferBanks.map(t => ({ label: `💳 ${t.bank}`, number: t.number, name: t.name }));
                        } else if (isEwallet) {
                          rekeningList = ewalletNumbers.map(e => ({ label: `📲 ${e.provider}`, number: e.number, name: e.name }));
                        }

                        return (
                          <div className="rounded-2xl space-y-2 overflow-hidden" style={{ border: '2px solid #b2ddd6' }}>
                            <div className="px-4 pt-3 pb-2 flex items-center gap-2" style={{ background: 'var(--pos-teal-light)' }}>
                              <span className="text-xl">{isQris ? '📱' : isVA ? '🏦' : isTransfer ? '💳' : '📲'}</span>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--pos-teal-dark)' }}>Proses {metodePembayaran}</p>
                                <p className="text-[9px] font-bold" style={{ color: 'var(--pos-teal)' }}>Konfirmasi transfer setelah pelanggan bayar</p>
                              </div>
                            </div>

                            {/* ── QRIS AREA ── */}
                            {isQris && (
                              <div className="px-4 pb-4 flex flex-col items-center justify-center text-center space-y-4 pt-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status QRIS:</span>
                                  <span className={`text-[9px] px-2.5 py-1 font-black uppercase rounded-lg border ${
                                    String(cfg.xendit_qris_status || '').toUpperCase() === 'AKTIF'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                                      : String(cfg.xendit_qris_status || '').toUpperCase() === 'DIPROSES'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>
                                    {cfg.xendit_qris_status || 'Belum Terdaftar'}
                                  </span>
                                </div>

                                <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-[280px] mx-auto border border-slate-200">
                                  <button type="button" onClick={() => setQrisType('dinamis')} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${qrisType === 'dinamis' ? 'bg-white text-teal-800 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}>⚡ Dinamis</button>
                                  <button type="button" onClick={() => setQrisType('statis')} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${qrisType === 'statis' ? 'bg-white text-teal-800 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}>📋 Statis</button>
                                </div>
                                {qrisType === 'dinamis' ? (
                                  <div className="flex flex-col items-center space-y-2">
                                    {loadingXendit ? (
                                      <div className="text-center py-8">
                                        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menghubungi API Xendit...</p>
                                      </div>
                                    ) : errorXendit ? (
                                      <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold text-center">
                                        {errorXendit}
                                      </div>
                                    ) : xenditQrCode ? (
                                      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
                                        <img
                                          src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(xenditQrCode)}`}
                                          alt="QRIS Code Dinamis"
                                          className="w-32 h-32 object-contain"
                                        />
                                        <span className="text-[9px] font-black text-emerald-700 tracking-widest mt-2 uppercase">XENDIT DYNAMIC QRIS ⚡</span>
                                        <span className="font-mono text-[8px] text-slate-400 font-bold">Merchant ID: {qrisMerchant || 'ID-AGRAPOS-DEMO'} | Tx ID: {savedTransaction?.id}</span>

                                        <div className="mt-2.5 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-mono text-[8px] text-center w-full max-w-[200px]">
                                          <span className="font-bold text-slate-600">Simulasi CLI:</span><br />
                                          node simulate_payment.mjs {savedTransaction?.id} {Math.round(totalAkhir)}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-center text-xs text-slate-400 font-bold">Gagal memuat QRIS.</div>
                                    )}
                                    <div>
                                      <p className="text-[11px] font-mono font-black text-slate-900">{formatRp(totalAkhir)}</p>
                                      <p className="text-[8px] text-slate-400 font-medium mt-0.5">Nilai transaksi sudah diset otomatis</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center space-y-2">
                                    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
                                      <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=https://agrapos.dev/merchant/${qrisMerchant || 'ID-AGRAPOS-DEMO'}`}
                                        alt="QRIS Code Statis"
                                        className="w-32 h-32 object-contain"
                                      />
                                      <span className="text-[9px] font-black text-slate-800 tracking-widest mt-2 uppercase">QRIS STATIS TOKO 📋</span>
                                      <span className="font-mono text-[8px] text-slate-400 font-bold">{qrisMerchant || 'ID-AGRAPOS-DEMO'}</span>
                                      {cfg.qris_nmid && (
                                        <div className="text-[9px] text-slate-500 font-semibold mt-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                          NMID: <span className="font-mono font-black text-slate-700">{cfg.qris_nmid}</span>
                                          {cfg.qris_tid && <span> · TID: <span className="font-mono font-black text-slate-700">{cfg.qris_tid}</span></span>}
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-mono font-black text-slate-900">Nominal Bebas / Manual</p>
                                      <p className="text-[8px] text-slate-400 font-medium mt-0.5">Pelanggan memasukkan nominal transfer sendiri</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* ── VIRTUAL ACCOUNT AREA ── */}
                            {isVA && (
                              <div className="px-4 pb-2 pt-2 flex flex-col items-center justify-center text-center space-y-2">
                                <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-[280px] mx-auto border border-slate-200">
                                  <button type="button" onClick={() => setVaType('dinamis')} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${vaType === 'dinamis' ? 'bg-white text-teal-800 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}>⚡ Dinamis</button>
                                  <button type="button" onClick={() => setVaType('fixed')} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${vaType === 'fixed' ? 'bg-white text-teal-800 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}>📋 Fixed (Statis)</button>
                                </div>
                                {vaType === 'dinamis' && (
                                  <div className="flex justify-center gap-1.5 flex-wrap w-full py-1">
                                    {['BCA', 'Mandiri', 'BNI', 'BRI'].map(b => (
                                      <button
                                        key={b}
                                        type="button"
                                        onClick={() => setXenditVaBank(b)}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${xenditVaBank === b ? 'bg-teal-600 text-white border-transparent' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                                      >
                                        {b}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* ── RENDER DAFTAR REKENING / CODE ── */}
                            {/* Dynamic VA render */}
                            {isVA && vaType === 'dinamis' && (
                              <div className="px-4 pb-3 space-y-2">
                                {loadingXendit ? (
                                  <div className="text-center py-6">
                                    <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Generating VA Xendit...</p>
                                  </div>
                                ) : errorXendit ? (
                                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-semibold text-center rounded-xl">
                                    {errorXendit}
                                  </div>
                                ) : xenditVaNumber ? (
                                  <div className="bg-white rounded-xl p-3 border border-slate-100 flex items-center justify-between gap-3 shadow-sm">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[9px] font-black uppercase tracking-wider text-teal-600">🏦 VA {xenditVaBank} Dinamis (Xendit)</p>
                                      <p className="font-mono font-black text-sm text-slate-900 tracking-wider break-all">{xenditVaNumber}</p>
                                      <p className="text-[8px] text-slate-400 font-bold mt-0.5 truncate">a/n {selectedCustomer?.name || 'AgraPOS Customer'} - {formatRp(totalAkhir)}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => { navigator.clipboard?.writeText(xenditVaNumber); showToast('VA disalin!', 'silent'); }}
                                      className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase bg-teal-50 text-teal-700 border border-teal-100 hover:bg-teal-100 transition-all">
                                      Salin
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-[9px] text-slate-400 text-center font-bold">Pilih bank untuk menghasilkan VA.</p>
                                )}
                              </div>
                            )}

                            {/* Static/Manual rendering fallback */}
                            {!(isVA && vaType === 'dinamis') && rekeningList.length > 0 && (
                              <div className="px-4 pb-3 space-y-2">
                                {rekeningList.map((r, i) => (
                                  <div key={i} className="bg-white rounded-xl p-2.5 border border-slate-100 flex items-center justify-between gap-3 shadow-sm">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: 'var(--pos-teal)' }}>{r.label}</p>
                                      <p className="font-mono font-black text-sm text-slate-900 tracking-wider break-all">{r.number || '—'}</p>
                                      {r.name && <p className="text-[9px] text-slate-400 font-bold mt-0.5 truncate">a/n {r.name}</p>}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => { if (r.number) { navigator.clipboard?.writeText(r.number).then(() => showToast(`${r.label} disalin!`, 'silent')).catch(() => { }); } }}
                                      className="flex-shrink-0 px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all bg-teal-50 text-teal-700 border border-teal-100 hover:bg-teal-100"
                                      title="Salin nomor">
                                      Salin
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Warning/Empty slot messages */}
                            {!isQris && !isVA && rekeningList.length === 0 && (
                              <div className="px-4 pb-3 text-center">
                                <p className="text-[10px] text-slate-400 font-bold">⚠️ Info rekening belum dikonfigurasi.</p>
                                <p className="text-[9px] text-slate-300">Isi di Settings → Metode Pembayaran</p>
                              </div>
                            )}

                            {isVA && vaType !== 'dinamis' && rekeningList.length === 0 && (
                              <div className="px-4 pb-3 text-center">
                                <p className="text-[10px] text-slate-400 font-bold">⚠️ Info rekening VA Fixed belum dikonfigurasi.</p>
                                <p className="text-[9px] text-slate-300">Isi di Settings → Metode Pembayaran</p>
                              </div>
                            )}

                            {/* ── BUTTON CEK STATUS PEMBAYARAN MANUAL ── */}
                            {(isQris || isVA) && (
                              <div className="px-4 pb-3 flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() => checkPaymentStatus(true)}
                                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-slate-100 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                  🔄 Cek Status Pembayaran
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/xendit/webhook-payment`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          external_id: String(savedTransaction.id),
                                          amount: totalAkhir,
                                          bank_code: isVA ? xenditVaBank : undefined
                                        })
                                      });
                                      if (response.ok) {
                                        showToast('Simulasi Bayar Terkirim!', 'success');
                                        setTimeout(() => checkPaymentStatus(false), 800);
                                      } else {
                                        showToast('Gagal memicu simulasi.', 'error');
                                      }
                                    } catch (err) {
                                      showToast('Gagal terhubung ke backend.', 'error');
                                    }
                                  }}
                                  className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                  ⚡ Simulasikan Pembayaran Sukses (Sandbox)
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {metodePembayaran === 'Tunai' && Number(jumlahBayar) >= totalAkhir && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex justify-between items-center">
                          <span className="text-emerald-700 font-bold text-sm uppercase tracking-wider">Kembalian:</span>
                          <span className="font-mono font-black text-emerald-600 text-2xl">{formatRp(Number(jumlahBayar) - totalAkhir)}</span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button onClick={() => setPaymentFlow('pilih_aksi')}
                      className="px-6 py-3 border border-slate-200 text-slate-500 font-bold rounded-xl text-xs uppercase hover:bg-slate-50 transition tracking-wider">Kembali</button>
                    <button onClick={handleEksekusiPembayaran} disabled={prosesBayar}
                      className="flex-1 text-white p-3 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg transition-transform active:scale-95 disabled:opacity-50 pos-btn-teal">
                      {prosesBayar ? '⏳...' : '✅ Selesaikan Pembayaran'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── OVERLAY KAMERA ─── */}
      {showCamera && (
        <div className="fixed inset-0 z-[9999999] bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-4 py-3 flex justify-between items-center" style={{ background: 'var(--pos-teal)' }}>
              <p className="text-white font-black text-xs uppercase">📷 Scan Barcode</p>
              <button onClick={handleCloseCamera} className="text-white px-3 py-1.5 rounded-lg text-xs font-black" style={{ background: 'var(--pos-orange)' }}>✕ Tutup</button>
            </div>
            <div className="relative bg-black w-full" style={{ aspectRatio: '4/3' }}>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
            {cameraError && <div className="bg-rose-50 px-4 py-3 text-center text-rose-600 text-xs font-bold">{cameraError}</div>}
            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <form onSubmit={handleManualBarcode} className="flex gap-2">
                <input name="barcodeInput" type="text" placeholder="Ketik manual barcode..."
                  className="flex-1 bg-white border border-slate-300 rounded-xl p-2 text-xs font-mono outline-none" />
                <button type="submit" className="px-4 rounded-xl text-xs font-black text-white pos-btn-teal">Cari</button>
              </form>
              {scanResult && <p className="text-[9px] text-emerald-600 font-bold mt-1.5 font-mono">✓ Terdeteksi: {scanResult}</p>}
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI PPN */}
      {showPpnConfirm.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-fade-in-up">
            <h3 className="text-lg font-black text-slate-800 mb-2 uppercase">Konfirmasi PPN</h3>
            <p className="text-xs text-slate-600 mb-6 font-medium leading-relaxed">
              Apakah Anda yakin ingin <b className={showPpnConfirm.nextState ? 'text-teal-600' : 'text-rose-600'}>{showPpnConfirm.nextState ? 'MENGAKTIFKAN' : 'MEMATIKAN'}</b> PPN (Pajak) untuk transaksi ini dan selanjutnya?
            </p>
            {showPpnConfirm.nextState && (
              <div className="mb-6">
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Persentase PPN (%)</label>
                <input
                  type="number"
                  value={showPpnConfirm.tempRate || ''}
                  onChange={(e) => setShowPpnConfirm(prev => ({ ...prev, tempRate: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 transition outline-none text-center"
                />
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPpnConfirm({ show: false, nextState: false })}
                className="flex-1 py-3 bg-slate-100 text-slate-600 font-black uppercase tracking-wide rounded-xl text-xs hover:bg-slate-200 transition"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  const isEnabled = showPpnConfirm.nextState;
                  const newRate = isEnabled ? (showPpnConfirm.tempRate || 0) : taxSettings.rate;
                  setTaxSettings(prev => ({ ...prev, enabled: isEnabled, rate: newRate }));
                  if (currentTenantId) {
                    try {
                      await supabase.from('tenants').update({ tax_enabled: isEnabled, tax_rate: newRate }).eq('tenant_id', currentTenantId);
                      showToast(`PPN ${isEnabled ? `Aktif (${newRate}%)` : 'Dimatikan'} untuk transaksi selanjutnya`, isEnabled ? 'success' : 'error');
                    } catch (err) {
                      console.error('Failed to update PPN setting', err);
                    }
                  }
                  setShowPpnConfirm({ show: false, nextState: false, tempRate: 0 });
                }}
                className={`flex-1 py-3 font-black uppercase tracking-wide rounded-xl text-xs text-white shadow-lg transition ${showPpnConfirm.nextState ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/30' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30'}`}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOAST ─── */}
      {toastMsg && (
        <div
          className="fixed top-20 lg:top-24 left-1/2 z-[99999999] px-6 py-3.5 rounded-2xl shadow-2xl text-base font-black min-w-[280px] max-w-[90vw] flex items-center gap-3"
          style={{
            animation: 'toastPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
            transform: 'translateX(-50%)',
            background: toastMsg.type === 'error' ? '#e11d48' : 'var(--pos-teal)',
            color: 'white',
          }}
        >
          <span className="text-xl">{toastMsg.type === 'error' ? '⚠️' : '✅'}</span>
          <span className="text-xs font-black tracking-wide uppercase">{toastMsg.msg}</span>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-[99999999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl border border-emerald-100 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-sm animate-bounce">
              ✓
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Pembayaran Sukses!</h3>
              <p className="text-xs text-slate-500 font-medium">Transaksi #{savedTransaction?.invoice_number || savedTransaction?.id} berhasil diselesaikan.</p>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Nominal</p>
              <p className="text-2xl font-black text-emerald-600 font-mono">{formatRp(totalAkhir)}</p>
              <div className="flex justify-center gap-x-3 text-[10px] font-bold text-slate-600 uppercase mt-1">
                <span>Metode: {savedTransaction?.payment_method}</span>
                <span>•</span>
                <span>Kasir: {kasirLabel}</span>
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
                    handleKirimWA();
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
              ✕ Tutup Layar Kasir
            </button>
          </div>
        </div>
      )}

      {/* PPOBDialog is now inline above */}

      {showAddCustomerDialog && (
        <AddCustomerDialog tenantId={currentTenantId} onClose={() => setShowAddCustomerDialog(false)} onSaved={handleCustomerSaved} />
      )}
      {showAddProductDialog && (
        <AddProductDialog tenantId={currentTenantId} onClose={() => setShowAddProductDialog(false)} onSaved={handleProductSaved} />
      )}
    </div>
  );
}