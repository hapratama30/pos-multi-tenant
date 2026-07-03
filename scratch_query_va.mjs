import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const xenditKey = process.env.XENDIT_SECRET_KEY;
const authHeader = 'Basic ' + Buffer.from(xenditKey + ':').toString('base64');
const subaccountId = '6a37dc56f5e4e7310c5b6b10';

async function check() {
  try {
    console.log('Querying FVA using GET with external_id parameter...');
    const response = await axios.get('https://api.xendit.co/callback_virtual_accounts', {
      headers: {
        'Authorization': authHeader,
        'for-user-id': subaccountId
      },
      params: {
        external_id: '178'
      }
    });
    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Failed:', error.response?.status, error.response?.data || error.message);
  }
}

check();
