import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('balance_mutations').select('*').eq('tenant_id', 'T1A86BC39B52F').eq('outlet_id', '6');
  console.log("Error:", error);
  console.log("Data length:", data?.length);
  console.log("Data:", data);
}

test();
