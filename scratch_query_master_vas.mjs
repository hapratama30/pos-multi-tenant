import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const xenditKey = process.env.XENDIT_SECRET_KEY;
const authHeader = 'Basic ' + Buffer.from(xenditKey + ':').toString('base64');

async function check() {
  try {
    console.log('Querying Master account for active VAs...');
    // We try to fetch the banks or recent VAs
    // Since FVA v1 does not have a query endpoint, let's try to query by our account number or external_id directly
    const externalId = '179';
    console.log(`Checking if FVA with external_id "${externalId}" exists under Master account...`);
    const response = await axios.get(`https://api.xendit.co/callback_virtual_accounts?external_id=${externalId}`, {
      headers: { 'Authorization': authHeader }
    });
    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Failed:', error.response?.status, error.response?.data || error.message);
  }
}

check();
