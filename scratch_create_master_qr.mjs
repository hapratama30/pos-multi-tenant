import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const xenditKey = process.env.XENDIT_SECRET_KEY;
const authHeader = 'Basic ' + Buffer.from(xenditKey + ':').toString('base64');

async function run() {
  const headers = {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
    'api-version': '2022-07-31'
  };

  try {
    console.log('1. Creating test QR code on Master account...');
    const response = await axios.post(
      'https://api.xendit.co/qr_codes',
      {
        reference_id: `test-qr-master-${Date.now()}`,
        type: 'DYNAMIC',
        currency: 'IDR',
        amount: 15000
      },
      { headers }
    );
    const qrId = response.data.id;
    console.log('✅ QR Code Created successfully! ID:', qrId);

    console.log(`2. Getting details of QR Code ${qrId}...`);
    const details = await axios.get(`https://api.xendit.co/qr_codes/${qrId}`, { headers });
    console.log('✅ Details fetched successfully:', details.data.id);

    console.log(`3. Simulating payment of QR Code ${qrId}...`);
    const simulate = await axios.post(
      `https://api.xendit.co/qr_codes/${qrId}/payments/simulate`,
      {},
      { headers }
    );
    console.log('✅ Simulated successfully!', simulate.data.status);
  } catch (error) {
    console.error('❌ Failed:', error.response?.status, error.response?.data || error.message);
  }
}

run();
