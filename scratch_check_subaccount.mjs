import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const xenditKey = process.env.XENDIT_SECRET_KEY;
const authHeader = 'Basic ' + Buffer.from(xenditKey + ':').toString('base64');
const subaccountId = '6a37dc56f5e4e7310c5b6b10';

async function check() {
  try {
    console.log(`Checking subaccount ${subaccountId}...`);
    const response = await axios.get(`https://api.xendit.co/v2/accounts/${subaccountId}`, {
      headers: { 'Authorization': authHeader }
    });
    console.log('✅ Subaccount details:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Subaccount check failed:', error.response?.status, error.response?.data || error.message);
  }
}

check();
