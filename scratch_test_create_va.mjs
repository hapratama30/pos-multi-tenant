import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const xenditAuthHeader = {
  Authorization: 'Basic ' + Buffer.from((process.env.XENDIT_SECRET_KEY || '') + ':').toString('base64'),
  'Content-Type': 'application/json',
};

async function test() {
  const subAccountId = '6a37dc56f5e4e7310c5b6b10';
  console.log(`Testing Virtual Account creation for sub-account: ${subAccountId}...`);
  try {
    const res = await axios.post(
      'https://api.xendit.co/callback_virtual_accounts',
      {
        external_id: `test-va-${Date.now()}`,
        bank_code: 'BCA',
        name: 'Toko Kopi Admin Test',
        is_closed: false
      },
      {
        headers: {
          ...xenditAuthHeader,
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
