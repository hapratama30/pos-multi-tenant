
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function nukeAccount() {
  const email = 'test@gmail.com';
  const tenantId = 'tenant-l29ea7';

  console.log(`--- NUKING ACCOUNT: ${email} & TENANT: ${tenantId} ---`);

  // 1. Delete from tables (order matters for foreign keys if any)
  const tables = [
    'transactions', 
    'products', 
    'product_categories', 
    'stock_items', 
    'stock_logs',
    'outlets',
    'tenant_balances',
    'payment_settings',
    'printer_settings',
    'tenant_subscriptions',
    'staff'
  ];

  for (const table of tables) {
    console.log(`Deleting from ${table}...`);
    const { error } = await supabaseAdmin.from(table).delete().eq('tenant_id', tenantId);
    if (error) console.log(`Warning deleting ${table}:`, error.message);
  }

  // 2. Delete Tenant itself
  console.log('Deleting tenant...');
  const { error: tErr } = await supabaseAdmin.from('tenants').delete().eq('tenant_id', tenantId);
  if (tErr) console.log('Error deleting tenant:', tErr.message);

  // 3. Delete Auth User
  console.log('Searching for auth user...');
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  const user = users.find(u => u.email === email);
  
  if (user) {
    console.log(`Deleting auth user ID: ${user.id}`);
    const { error: aErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (aErr) console.error('Error deleting auth user:', aErr.message);
    else console.log('Auth user deleted successfully');
  } else {
    console.log('Auth user not found');
  }

  console.log('--- NUKE COMPLETE. DATABASE IS CLEAN FOR test@gmail.com ---');
}

nukeAccount();
