import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const xenditKey = process.env.XENDIT_SECRET_KEY;
const authHeader = 'Basic ' + Buffer.from(xenditKey + ':').toString('base64');

async function run() {
  const headers = {
    'Authorization': authHeader,
    'Content-Type': 'application/json'
  };

  try {
    console.log('Attempting to simulate FVA payment with /external_id=... in path...');
    const response = await axios.post(
      'https://api.xendit.co/callback_virtual_accounts/external_id=test_master_va_sim_456/simulate_payment',
      {
        amount: 60000
      },
      { headers }
    );
    console.log('✅ VA Simulated Successfully! Response:', response.data);
  } catch (error) {
    console.error('❌ Failed! Status:', error.response?.status);
    console.error('Error Details:', JSON.stringify(error.response?.data, null, 2));
  }
}

run();
