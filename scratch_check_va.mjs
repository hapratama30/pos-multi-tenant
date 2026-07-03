import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const xenditKey = process.env.XENDIT_SECRET_KEY;
const subaccountId = '6a37dc56f5e4e7310c5b6b10';
const authHeader = 'Basic ' + Buffer.from(xenditKey + ':').toString('base64');

async function check() {
  const headers = {
    'Authorization': authHeader,
    'for-user-id': subaccountId
  };

  try {
    console.log('Querying Xendit for VA with external_id = "178"...');
    // Try to get all VAs for the subaccount
    const response = await axios.get('https://api.xendit.co/callback_virtual_accounts', { headers });
    console.log('Xendit response (first 3 VAs):');
    console.log(JSON.stringify(response.data.slice(0, 3), null, 2));

    // Try specifically with external_id filter if possible, or filter manually
    const found = response.data.find(v => v.external_id === '178');
    if (found) {
      console.log('✅ Found FVA in list:', JSON.stringify(found, null, 2));
    } else {
      console.log('❌ Could not find FVA with external_id = "178" in the list of VAs.');
    }
  } catch (error) {
    console.error('Error fetching VAs from Xendit:', error.response?.status, error.response?.data || error.message);
  }
}

check();
