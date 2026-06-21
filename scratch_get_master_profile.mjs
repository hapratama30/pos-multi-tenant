import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const xenditAuthHeader = {
  Authorization: 'Basic ' + Buffer.from((process.env.XENDIT_SECRET_KEY || '') + ':').toString('base64'),
  'Content-Type': 'application/json',
};

async function run() {
  console.log('Fetching master account profile from Xendit...');
  try {
    const response = await axios.get(
      'https://api.xendit.co/users/me',
      { headers: xenditAuthHeader }
    );
    console.log('Master Account Profile:', JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('Error /users/me:', err.response?.data || err.message);
  }
}

run();
