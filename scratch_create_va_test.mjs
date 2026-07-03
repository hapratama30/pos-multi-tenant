import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const xenditKey = process.env.XENDIT_SECRET_KEY;
const authHeader = 'Basic ' + Buffer.from(xenditKey + ':').toString('base64');
const subaccountId = '6a37dc56f5e4e7310c5b6b10';

async function run() {
  const headers = {
    'Authorization': authHeader,
    'for-user-id': subaccountId,
    'Content-Type': 'application/json'
  };

  try {
    console.log('Attempting to create a test FVA directly on Xendit Sandbox...');
    const response = await axios.post(
      'https://api.xendit.co/callback_virtual_accounts',
      {
        external_id: 'test_va_simulation_123',
        bank_code: 'BCA',
        name: 'Test VA User',
        expected_amount: 50000,
        is_closed: true
      },
      { headers }
    );
    console.log('✅ VA Created Successfully! Response data:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ VA Creation Failed:', error.response?.status, error.response?.data || error.message);
  }
}

run();
