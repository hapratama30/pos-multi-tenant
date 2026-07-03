import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const xenditKey = process.env.XENDIT_SECRET_KEY;
const authHeader = 'Basic ' + Buffer.from(xenditKey + ':').toString('base64');
const subaccountId = '6a37dc56f5e4e7310c5b6b10';

async function run() {
  const headers = {
    'Authorization': authHeader,
    'api-version': '2022-07-31',
    'for-user-id': subaccountId
  };

  try {
    console.log(`Listing QR codes for subaccount ${subaccountId}...`);
    // Wait, let's try to query by reference_id = "184"
    const response = await axios.get(
      'https://api.xendit.co/qr_codes?reference_id=184',
      { headers }
    );
    console.log('✅ Response by reference_id=184:', JSON.stringify(response.data, null, 2));

    // Also let's query the recent QR codes
    const responseRecent = await axios.get(
      'https://api.xendit.co/qr_codes?limit=5',
      { headers }
    );
    console.log('✅ Response recent 5:', JSON.stringify(responseRecent.data, null, 2));
  } catch (error) {
    console.error('❌ Failed:', error.response?.status, error.response?.data || error.message);
  }
}

run();
