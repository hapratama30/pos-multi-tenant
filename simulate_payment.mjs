import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config();

const transactionId = process.argv[2];
const amount = Number(process.argv[3]) || 18000;
const targetEnv = process.argv[4] || 'local'; // 'local' | 'vercel' | 'xendit-va' | 'xendit-qris'
const subaccountId = process.argv[5]; // subaccount ID for XenPlatform if applicable

const xenditKey = process.env.XENDIT_SECRET_KEY;

if (!transactionId) {
  console.error('❌ ERROR: Silakan masukkan ID Transaksi / QR ID!');
  console.log('Penggunaan: node simulate_payment.mjs <id> [nominal] [target] [subaccount_id]');
  console.log('\n--- TARGET YANG TERSEDIA ---');
  console.log('1. local       : Tembak langsung ke localhost (default)');
  console.log('2. vercel      : Tembak langsung ke server live Vercel (tanpa masuk log Xendit)');
  console.log('3. xendit-va   : Memicu API Simulasi VA resmi Xendit lewat server Vercel Anda (TERCATAT di Webhook Logs!)');
  console.log('4. xendit-qris : Memicu API Simulasi QRIS resmi Xendit (TERCATAT di Webhook Logs Xendit!)');
  console.log('\nContoh VA Resmi  : node simulate_payment.mjs 173 18000 xendit-va');
  console.log('Contoh QRIS Resmi: node simulate_payment.mjs qr_1d2d3d4d... 18000 xendit-qris 6a37dc56f5e4e7310c5b6b10');
  process.exit(1);
}

// A. JALUR SIMULASI RESMI XENDIT (Tercatat di Webhook Logs Dashboard Xendit)
if (targetEnv === 'xendit-va' || targetEnv === 'xendit-qris') {
  // Jika xendit-va, kita tembak lewat endpoint server Vercel agar Vercel yang melakukan request ke Xendit
  // Ini menghindari error CORS / IP Whitelisting / Token mismatch secara lokal.
  if (targetEnv === 'xendit-va') {
    const serverUrl = 'https://agrapos.vercel.app/api/xendit/simulate-va-payment';
    console.log(`🚀 Memicu simulasi VA resmi via server Vercel: ${serverUrl}`);
    try {
      const response = await axios.post(serverUrl, {
        externalId: String(transactionId),
        amount: amount,
        subaccountId: subaccountId || null
      });
      console.log(`✅ BERHASIL MEMICU SIMULASI RESMI XENDIT!`);
      console.log(`📡 Server Xendit akan mengirim webhook resmi ke server Vercel Anda sekarang.`);
      console.log(`💬 Respons Server:`, JSON.stringify(response.data, null, 2));
      console.log(`\n👉 Silakan refresh halaman Webhook Logs di Dashboard Xendit Anda. Log baru yang HIJAU pasti sudah muncul!`);
    } catch (error) {
      console.error('❌ GAGAL MEMICU SIMULASI VA:', error.response?.status, error.response?.data || error.message);
    }
    process.exit(0);
  }

  // Jika QRIS, tetap tembak langsung dari lokal (karena QRIS simulator API tidak diblokir/404 seperti VA)
  if (!xenditKey) {
    console.error('❌ ERROR: XENDIT_SECRET_KEY tidak ditemukan di file .env Anda!');
    process.exit(1);
  }

  const authHeader = 'Basic ' + Buffer.from(xenditKey + ':').toString('base64');
  const url = `https://api.xendit.co/qr_codes/${transactionId}/payments/simulate`;
  console.log(`🚀 Mengirim simulasi pembayaran QRIS ke API Resmi Xendit: ${url}`);

  try {
    const headers = {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'api-version': '2022-07-31'
    };
    if (subaccountId) {
      headers['for-user-id'] = subaccountId;
      console.log(`👤 Menggunakan Header Subaccount (for-user-id): ${subaccountId}`);
    }

    const response = await axios.post(url, {}, { headers });
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
