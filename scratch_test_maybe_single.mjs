import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const tenantId = 'TDE6C1A9CBDB3';
  const { data, error } = await supabase
    .from('payment_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('outlet_id', null);

  if (error) {
    console.error('QUERY ERROR:', error);
  } else {
    console.log('QUERY SUCCESS:', data);
  }
}

test();
