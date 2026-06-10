import axios from 'axios';

const transactionId = process.argv[2];
const amount = Number(process.argv[3]) || 13000;

if (!transactionId) {
  console.error('❌ ERROR: Silakan masukkan ID Transaksi!');
  console.log('Penggunaan: node simulate_payment.mjs <id_transaksi> [nominal]');
  console.log('Contoh: node simulate_payment.mjs 6a1d48d20e5c25fdcc226ab7 13000');
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

const serverUrl = 'http://localhost:5000/api/xendit/webhook-payment';

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
