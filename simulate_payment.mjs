import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config();

const transactionId = process.argv[2];
const amount = Number(process.argv[3]) || 18000;
const targetEnv = process.argv[4] || 'local'; // 'local' | 'vercel' | 'xendit-va' | 'xendit-qris'

const xenditKey = process.env.XENDIT_SECRET_KEY;

if (!transactionId) {
  console.error('❌ ERROR: Silakan masukkan ID Transaksi / QR ID!');
  console.log('Penggunaan: node simulate_payment.mjs <id> [nominal] [target]');
  console.log('\n--- TARGET YANG TERSEDIA ---');
  console.log('1. local       : Tembak langsung ke localhost (default)');
  console.log('2. vercel      : Tembak langsung ke server live Vercel (tanpa masuk log Xendit)');
  console.log('3. xendit-va   : Memicu API Simulasi VA resmi Xendit (TERCATAT di Webhook Logs Xendit!)');
  console.log('4. xendit-qris : Memicu API Simulasi QRIS resmi Xendit (TERCATAT di Webhook Logs Xendit!)');
  console.log('\nContoh VA Resmi  : node simulate_payment.mjs 173 18000 xendit-va');
  console.log('Contoh QRIS Resmi: node simulate_payment.mjs qr_1d2d3d4d... 18000 xendit-qris');
  process.exit(1);
}

// A. JALUR SIMULASI RESMI XENDIT (Tercatat di Webhook Logs Dashboard Xendit)
if (targetEnv === 'xendit-va' || targetEnv === 'xendit-qris') {
  if (!xenditKey) {
    console.error('❌ ERROR: XENDIT_SECRET_KEY tidak ditemukan di file .env Anda!');
    process.exit(1);
  }

  // Create Auth Header (Basic Auth with base64 encoded Secret Key + ':')
  const authHeader = 'Basic ' + Buffer.from(xenditKey + ':').toString('base64');
  let url = '';
  let payload = {};

  if (targetEnv === 'xendit-va') {
    url = `https://api.xendit.co/callback_virtual_accounts/${transactionId}/simulate_payment`;
    payload = {
      amount: amount
    };
    console.log(`🚀 Mengirim simulasi pembayaran VA ke API Resmi Xendit: ${url}`);
  } else {
    url = `https://api.xendit.co/qr_codes/${transactionId}/payments/simulate`;
    console.log(`🚀 Mengirim simulasi pembayaran QRIS ke API Resmi Xendit: ${url}`);
  }

  try {
    const headers = {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    };
    if (targetEnv === 'xendit-qris') {
      headers['api-version'] = '2022-07-31';
    }

    const response = await axios.post(url, payload, { headers });
    console.log(`✅ BERHASIL MEMICU SIMULASI RESMI XENDIT!`);
    console.log(`📡 Server Xendit akan mengirim webhook resmi ke server Vercel Anda sekarang.`);
    console.log(`💬 Respons API Xendit:`, JSON.stringify(response.data, null, 2));
    console.log(`\n👉 Silakan refresh halaman Webhook Logs di Dashboard Xendit Anda. Log baru yang HIJAU pasti sudah muncul!`);
  } catch (error) {
    console.error('❌ GAGAL MEMICU SIMULASI API XENDIT:', error.response?.status, error.response?.data || error.message);
  }
  process.exit(0);
}

// B. JALUR TEMBAK LANGSUNG (Bypass Xendit - Tidak tercatat di Webhook Logs Xendit)
const payload = {
  event: 'qr.payment',
  data: {
    qr_code: {
      reference_id: transactionId
    },
    qr_payment: {
      amount: amount
    }
  }
};

const baseUrl = targetEnv === 'vercel' ? 'https://agrapos.vercel.app' : 'http://localhost:5000';
const serverUrl = `${baseUrl}/api/xendit/webhook-payment`;

console.log(`🚀 Mengirim webhook tiruan langsung ke: ${serverUrl}`);
console.log(`📦 Payload: ${JSON.stringify(payload, null, 2)}\n`);

try {
  const response = await axios.post(serverUrl, payload, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  console.log(`✅ BERHASIL! Status: ${response.status} (${response.statusText})`);
  console.log(`💬 Respons Server: "${response.data}"`);
} catch (error) {
  console.error('❌ GAGAL MENGIRIM WEBHOOK:', error.response?.status, error.response?.data || error.message);
}
