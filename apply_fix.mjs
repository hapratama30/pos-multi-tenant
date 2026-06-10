
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const sql = fs.readFileSync('fix_registration_error.sql', 'utf8');

async function applyFix() {
  console.log('Applying registration fix...');
  const { data, error } = await supabase.rpc('run_sql', { query: sql });
  if (error) {
    console.error('Error:', error);
    // Try exec_sql if run_sql doesn't exist
    const { data: d2, error: e2 } = await supabase.rpc('exec_sql', { query: sql });
    if (e2) console.error('Error with exec_sql too:', e2);
    else console.log('Fix applied via exec_sql');
  } else {
    console.log('Fix applied via run_sql');
  }
}

applyFix();
