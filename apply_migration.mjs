import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const sql = fs.readFileSync('supabase/migrations/032_withdrawal_requests.sql', 'utf8');

async function run() {
  console.log('Applying migration...');
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.error('Error applying migration via exec_sql:', error);
    // Let's try alternative if exec_sql doesn't exist
    const { data: d2, error: e2 } = await supabase.rpc('run_sql', { query: sql });
    if (e2) {
       console.error('Error applying migration via run_sql:', e2);
       console.log('Could not apply migration. You may need to apply it manually via Supabase Dashboard.');
    } else {
       console.log('Migration applied successfully via run_sql:', d2);
    }
  } else {
    console.log('Migration applied successfully via exec_sql:', data);
  }
}

run();
