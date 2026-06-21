import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const xenditAuthHeader = {
  Authorization: 'Basic ' + Buffer.from((process.env.XENDIT_SECRET_KEY || '') + ':').toString('base64'),
  'Content-Type': 'application/json',
};

async function testStaticQR() {
  console.log('Testing Static QR creation on Master Account...');
  try {
    const res = await axios.post(
      'https://api.xendit.co/qr_codes',
      {
        reference_id: `master-static-qr-${Date.now()}`,
        type: 'STATIC',
        currency: 'IDR'
      },
      {
        headers: {
          ...xenditAuthHeader,
          'api-version': '2022-07-31'
        }
      }
    );
    console.log('Static QR Success:', res.data.qr_string);
  } catch (err) {
    console.log('Static QR Error:', err.response?.status, err.response?.data);
  }
}

async function testFixedVA() {
  console.log('Testing Fixed VA creation on Master Account...');
  try {
    const res = await axios.post(
      'https://api.xendit.co/callback_virtual_accounts',
      {
        external_id: `master-fixed-va-${Date.now()}-bca`,
        bank_code: 'BCA',
        name: 'Master Account BCA',
        is_closed: false
      },
      { headers: xenditAuthHeader }
    );
    console.log('Fixed VA Success:', res.data.account_number);
  } catch (err) {
    console.log('Fixed VA Error:', err.response?.status, err.response?.data);
  }
}

async function run() {
  await testStaticQR();
  await testFixedVA();
}

run();
