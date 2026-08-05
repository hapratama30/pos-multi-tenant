import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: tenant } = await supabase.from('tenants').select('*').eq('tenant_id', 'T66F2B428A4EC').single();
  const { data: staff } = await supabase.from('staff').select('*').eq('tenant_id', 'T66F2B428A4EC');
  console.log('TENANT:', tenant);
  console.log('STAFF:', staff);
}
run();
