import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const xenditAuthHeader = {
  Authorization: 'Basic ' + Buffer.from((process.env.XENDIT_SECRET_KEY || '') + ':').toString('base64'),
  'Content-Type': 'application/json',
};

async function test() {
  const subAccountId = '6a37dc56f5e4e7310c5b6b10';
  console.log(`Testing Static QR creation for sub-account: ${subAccountId}...`);
  try {
    const res = await axios.post(
      'https://api.xendit.co/qr_codes',
      {
        reference_id: `test-static-qr-${Date.now()}`,
        type: 'STATIC',
        currency: 'IDR'
      },
      {
        headers: {
          ...xenditAuthHeader,
          'api-version': '2022-07-31',
          'for-user-id': subAccountId
        }
      }
    );
    console.log('SUCCESS:', res.data);
  } catch (err) {
    console.log('ERROR:', err.response?.status, err.response?.data);
  }
}

test();
