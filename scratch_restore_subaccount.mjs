import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function restore() {
  const tenantId = 'TDE6C1A9CBDB3';
  const subAccountId = '6a37dc56f5e4e7310c5b6b10';
  console.log(`Restoring xendit_merchant_id to '${subAccountId}' in database for tenant ${tenantId}...`);
  
  const { data, error } = await supabase
    .from('payment_settings')
    .update({
      xendit_merchant_id: subAccountId,
      xendit_va_status: 'Aktif',
      xendit_qris_status: 'Aktif',
      payment_qris_enabled: true,
      payment_va_enabled: true,
      updated_at: new Date().toISOString()
    })
    .eq('tenant_id', tenantId)
    .select();

  if (error) {
    console.error('Restore database failed:', error);
  } else {
    console.log('Restore database succeeded, rows:', data);
  }
}

restore();
