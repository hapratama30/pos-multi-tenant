import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  console.log('Querying landing_content...');
  try {
    const res = await supabase.from('landing_content').select('content').eq('id', 'global').maybeSingle();
    console.log('Result:', res);
  } catch (e) {
    console.error(e);
  }
}
main();
