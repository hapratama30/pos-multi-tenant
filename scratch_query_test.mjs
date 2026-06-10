import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery(outlet_id) {
  let mutationsQuery = supabase.from('balance_mutations').select('*').eq('tenant_id', 'T1A86BC39B52F');
  
  if (outlet_id) {
    mutationsQuery = mutationsQuery.eq('outlet_id', outlet_id);
  } else {
    mutationsQuery = mutationsQuery.is('outlet_id', null);
  }

  const { data: mutations, error: mError } = await mutationsQuery.order('created_at', { ascending: false }).limit(20);
  console.log("For outlet_id:", outlet_id, "Returned data length:", mutations?.length, "first row outlet_id:", mutations?.[0]?.outlet_id);
}

async function run() {
  await testQuery("5");
  await testQuery("6");
  await testQuery("");
}
run();
