import axios from 'axios';

const transactionId = process.argv[2];
const amount = Number(process.argv[3]) || 18000;
const targetEnv = process.argv[4] || 'local'; // 'local' or 'vercel'

if (!transactionId) {
  console.error('❌ ERROR: Silakan masukkan ID Transaksi!');
  console.log('Penggunaan: node simulate_payment.mjs <id_transaksi> [nominal] [local|vercel]');
  console.log('Contoh untuk Vercel Live: node simulate_payment.mjs 1092 18000 vercel');
  console.log('Contoh untuk Local: node simulate_payment.mjs 1092 18000 local');
  process.exit(1);
}

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

console.log(`🚀 Mengirim simulasi webhook QRIS ke: ${serverUrl}`);
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
