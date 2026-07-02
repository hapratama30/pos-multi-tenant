import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data: plans, error: pErr } = await supabase.from('subscription_plans').select('*');
  if (pErr) {
    console.error('Error fetching subscription_plans:', pErr);
    return;
  }
  console.log('--- SUBSCRIPTION PLANS ---');
  console.log(JSON.stringify(plans, null, 2));

  const { data: tenant, error: tErr } = await supabase
    .from('tenants')
    .select('tenant_id, tenant_name, plan_id, enabled_modules')
    .eq('tenant_id', 'T9A85A4A1CB07')
    .maybeSingle();
  if (tErr) {
    console.error('Error fetching tenant T9A85A4A1CB07:', tErr);
  } else {
    console.log('--- NEW TENANT DETAIL ---');
    console.log(tenant);
  }

  const { data: sub, error: sErr } = await supabase
    .from('tenant_subscriptions')
    .select('*')
    .eq('tenant_id', 'T9A85A4A1CB07')
    .maybeSingle();
  if (sErr) {
    console.error('Error fetching tenant sub T9A85A4A1CB07:', sErr);
  } else {
    console.log('--- NEW SUBSCRIPTION DETAIL ---');
    console.log(sub);
  }
}

checkData();
