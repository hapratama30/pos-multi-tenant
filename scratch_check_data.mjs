import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data: tenants, error: tErr } = await supabase.from('tenants').select('*');
  if (tErr) {
    console.error('Error fetching tenants:', tErr);
    return;
  }
  console.log('--- TENANTS ---');
  console.log(tenants);

  const { data: subs, error: sErr } = await supabase.from('tenant_subscriptions').select('*');
  if (sErr) {
    console.error('Error fetching subscriptions:', sErr);
    return;
  }
  console.log('--- SUBSCRIPTIONS ---');
  console.log(subs);
}

checkData();
