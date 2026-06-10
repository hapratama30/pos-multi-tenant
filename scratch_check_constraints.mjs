
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkConstraints() {
  const tables = ['tenant_balances', 'payment_settings', 'printer_settings', 'tenant_subscriptions', 'outlets'];
  for (const table of tables) {
    const { data, error } = await supabase.rpc('get_table_constraints', { t_name: table }).catch(e => ({error: e}));
    // Since I don't have get_table_constraints RPC, I'll try a dummy insert with ON CONFLICT
    console.log(`Checking ${table}...`);
    const { error: err } = await supabase.from(table).insert({ tenant_id: 'TEST_CHECK' }).onConflict('tenant_id').ignore();
    if (err) {
      console.log(`${table} error:`, err.message);
    } else {
      console.log(`${table} is OK`);
      // Cleanup
      await supabase.from(table).delete().eq('tenant_id', 'TEST_CHECK');
    }
  }
}

checkConstraints();
