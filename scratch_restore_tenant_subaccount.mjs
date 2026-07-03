import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const tenantId = 'TDE6C1A9CBDB3';
const subaccountId = '6a37dc56f5e4e7310c5b6b10';

async function update() {
  console.log(`Restoring payment_settings for ${tenantId} to subaccount ${subaccountId}...`);
  const { data, error } = await supabase
    .from('payment_settings')
    .update({ xendit_merchant_id: subaccountId })
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('❌ Failed to restore settings:', error);
  } else {
    console.log('✅ Successfully restored xendit_merchant_id to subaccount!');
  }
}

update();
