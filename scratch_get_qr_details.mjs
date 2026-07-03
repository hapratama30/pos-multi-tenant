import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const xenditKey = process.env.XENDIT_SECRET_KEY;
const authHeader = 'Basic ' + Buffer.from(xenditKey + ':').toString('base64');
const qrId = 'qr_78a57d90-7976-476a-9936-e7308b3f3d22';
const subaccountId = '6a37dc56f5e4e7310c5b6b10';

async function run() {
  const headers = {
    'Authorization': authHeader,
    'api-version': '2022-07-31'
  };
  if (subaccountId) {
    headers['for-user-id'] = subaccountId;
  }

  try {
    console.log(`Querying QR details for ID: ${qrId}...`);
    const response = await axios.get(`https://api.xendit.co/qr_codes/${qrId}`, { headers });
    console.log('✅ Found! Details:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Failed:', error.response?.status, error.response?.data || error.message);
  }
}

run();
