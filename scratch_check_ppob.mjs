import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const tenantId = 'T1A86BC39B52F';

  // Check product_categories
  const { data: cats } = await supabase.from('product_categories').select('*').or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
  console.log('\n=== product_categories ===');
  (cats || []).forEach(c => console.log(JSON.stringify({id: c.id, name: c.name, type: c.type, tenant_id: c.tenant_id, outlet_id: c.outlet_id})));

  // Check duration_units
  const { data: durs } = await supabase.from('duration_units').select('*').or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
  console.log('\n=== duration_units ===');
  (durs || []).forEach(d => console.log(JSON.stringify({id: d.id, name: d.name, tenant_id: d.tenant_id, outlet_id: d.outlet_id})));

  // Check product_units
  const { data: units } = await supabase.from('product_units').select('*').or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
  console.log('\n=== product_units ===');
  (units || []).forEach(u => console.log(JSON.stringify({id: u.id, name: u.name, tenant_id: u.tenant_id, outlet_id: u.outlet_id})));
}
check();
