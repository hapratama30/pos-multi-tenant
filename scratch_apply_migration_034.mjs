import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const sql = fs.readFileSync('supabase/migrations/034_auto_expiration_period.sql', 'utf8');

async function run() {
  console.log('Applying migration 034...');
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.error('Error applying migration via exec_sql:', error);
    const { data: d2, error: e2 } = await supabase.rpc('run_sql', { query: sql });
    if (e2) {
       console.error('Error applying migration via run_sql:', e2);
       console.log('Failed to apply migration.');
    } else {
       console.log('Migration applied successfully via run_sql:', d2);
    }
  } else {
    console.log('Migration applied successfully via exec_sql:', data);
  }
}

run();
