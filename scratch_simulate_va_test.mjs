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
    console.log('Attempting to simulate FVA payment WITHOUT for-user-id header...');
    const response = await axios.post(
      'https://api.xendit.co/callback_virtual_accounts/test_va_simulation_123/simulate_payment',
      {
        amount: 50000
      },
      { headers }
    );
    console.log('✅ VA Simulated Successfully! Response:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ VA Simulation Failed:', error.response?.status, error.response?.data || error.message);
  }
}

run();
