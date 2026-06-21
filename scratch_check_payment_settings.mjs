import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Querying payment_settings...');
  const { data: settings, error: err1 } = await supabase.from('payment_settings').select('*');
  if (err1) {
    console.error('Error fetching settings:', err1);
  } else {
    console.log('payment_settings rows:', JSON.stringify(settings, null, 2));
  }
}

check();
