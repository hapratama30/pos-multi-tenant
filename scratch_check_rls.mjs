import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase.rpc('get_rls_status', {});
  if (error) {
    // If RPC doesn't exist, run raw query via a temporary function or just query information_schema
    const { data: tables, error: sqlError } = await supabase.from('product_categories').select('count');
    console.log('Test select:', tables, sqlError);
    
    // Let's run a query to check pg_tables
    // We don't have SQL execution endpoint directly, but we can check policies via a schema query if we have postgres access, or we can check via the admin client.
  }
  
  // Let's check RLS by checking pg_class
  const { data: rlsData, error: rlsError } = await supabase.rpc('execute_sql', {
    sql: "SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('product_categories', 'product_units', 'duration_units', 'products');"
  });
  console.log('RLS Status:', rlsData, rlsError);
}

main();
