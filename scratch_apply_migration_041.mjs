import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const sql = fs.readFileSync('supabase/migrations/041_add_activation_url_to_payment_settings.sql', 'utf8');

async function run() {
  console.log('Applying migration 041...');
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.error('Error via exec_sql:', error);
    const { data: d2, error: e2 } = await supabase.rpc('run_sql', { query: sql });
    if (e2) {
       console.error('Error via run_sql:', e2);
    } else {
       console.log('Success via run_sql:', d2);
    }
  } else {
    console.log('Success via exec_sql:', data);
  }
}

run();
