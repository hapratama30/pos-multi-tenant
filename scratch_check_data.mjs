import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: settings } = await supabase.from('payment_settings').select('*').eq('tenant_id', 'TF9DC786D6E85');
  console.log('PAYMENT SETTINGS for tenant:', settings);
}
run();
