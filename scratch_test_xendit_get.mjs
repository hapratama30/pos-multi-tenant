import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const xenditAuthHeader = {
  Authorization: 'Basic ' + Buffer.from((process.env.XENDIT_SECRET_KEY || '') + ':').toString('base64'),
  'Content-Type': 'application/json',
};

async function run() {
  const accountId = '6a1d48d20e5c25fdcc226ab7';
  console.log(`Fetching account details for ${accountId} from Xendit...`);
  try {
    const response = await axios.get(
      `https://api.xendit.co/v2/accounts/${accountId}`,
      { headers: xenditAuthHeader }
    );
    console.log('Xendit Account Data:', JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

run();
