import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const tenantId = 'TDE6C1A9CBDB3';

async function update() {
  console.log(`Updating payment_settings for ${tenantId} to MASTER...`);
  const { data, error } = await supabase
    .from('payment_settings')
    .update({ xendit_merchant_id: 'MASTER' })
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('❌ Failed to update settings:', error);
  } else {
    console.log('✅ Successfully updated xendit_merchant_id to MASTER!');
  }
}

update();
