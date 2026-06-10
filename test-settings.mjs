import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('platform_settings').select('*');
  console.log('GET:', { data, error });
  
  const { error: upsertError } = await supabase.from('platform_settings').upsert({ id: 1, feature_flags: {} });
  console.log('UPSERT:', upsertError);
}

test();
