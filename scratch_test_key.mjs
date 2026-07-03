import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const xenditKey = process.env.XENDIT_SECRET_KEY;
const authHeader = 'Basic ' + Buffer.from(xenditKey + ':').toString('base64');

async function check() {
  try {
    console.log('Testing XENDIT_SECRET_KEY validity...');
    console.log('Key prefix:', xenditKey?.substring(0, 15) + '...');
    const response = await axios.get('https://api.xendit.co/balance', {
      headers: { 'Authorization': authHeader }
    });
    console.log('✅ Key is VALID! Balance:', response.data);
  } catch (error) {
    console.error('❌ Key is INVALID:', error.response?.status, error.response?.data || error.message);
  }
}

check();
