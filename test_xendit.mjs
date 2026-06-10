import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const xenditAuthHeader = {
  Authorization: 'Basic ' + Buffer.from((process.env.XENDIT_SECRET_KEY || '') + ':').toString('base64'),
  'Content-Type': 'application/json',
};

const xenditMerchantId = '6a1d48d20e5c25fdcc226ab7';

async function test() {
  try {
    const res = await axios.post(
      'https://api.xendit.co/callback_virtual_accounts',
      {
        external_id: 'fixed-va-TJA018C3985ZP-bca',
        bank_code: 'BCA',
        name: 'Toko TJA018',
        is_closed: false
      },
      {
        headers: {
          ...xenditAuthHeader,
          'for-user-id': xenditMerchantId
        }
      }
    );
    console.log('POST SUCCESS:', res.data);
  } catch (err) {
    console.log('POST ERROR:', err.response?.status, err.response?.data);
  }
}

test();
