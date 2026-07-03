import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const xenditKey = process.env.XENDIT_SECRET_KEY;
const authHeader = 'Basic ' + Buffer.from(xenditKey + ':').toString('base64');
const qrId = 'qr_78a57d90-7976-476a-9936-e7308b3f3d22';

const subaccounts = [
  null,
  '6a1d48d20e5c25fdcc226ab7',
  '6a37cd3292b0d4d9e2946c55',
  '6a37dc56f5e4e7310c5b6b10'
];

async function run() {
  for (const sub of subaccounts) {
    const headers = {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'api-version': '2022-07-31'
    };
    if (sub) {
      headers['for-user-id'] = sub;
    }

    try {
      console.log(`Trying simulation with subaccount: ${sub || 'MASTER'}...`);
      const response = await axios.post(
        `https://api.xendit.co/qr_codes/${qrId}/payments/simulate`,
        {},
        { headers }
      );
      console.log(`✅ SUCCESS! subaccount: ${sub || 'MASTER'}`);
      console.log(response.data);
      return;
    } catch (error) {
      console.error(`❌ Failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }
  }
}

run();
