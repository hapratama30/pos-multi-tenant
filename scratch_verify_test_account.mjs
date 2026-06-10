
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verifyState() {
  const email = 'test@gmail.com';
  console.log(`Checking state for ${email}...`);

  // 1. Check Auth
  const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  const authUser = users.find(u => u.email === email);
  console.log('Auth User:', authUser ? `Found (ID: ${authUser.id})` : 'Not Found');

  // 2. Check Staff table
  const { data: staff, error: staffError } = await supabaseAdmin.from('staff').select('*').eq('email', email).maybeSingle();
  console.log('Staff Table:', staff ? `Found (Tenant: ${staff.tenant_id})` : 'Not Found');

  if (staff) {
      // 3. Check Tenant table
      const { data: tenant } = await supabaseAdmin.from('tenants').select('*').eq('tenant_id', staff.tenant_id).maybeSingle();
      console.log('Tenant Table:', tenant ? `Found (${tenant.tenant_name})` : 'Not Found');
  }
}

verifyState();
