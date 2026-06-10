
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixData() {
  const tenantId = 'tenant-l29ea7';
  
  // Get main outlet ID
  const { data: outlet } = await supabaseAdmin.from('outlets').select('id').eq('tenant_id', tenantId).eq('is_main', true).single();
  
  if (!outlet) {
    console.error('Main outlet not found');
    return;
  }
  
  const outletId = outlet.id;
  console.log(`Fixing data for tenant ${tenantId}, linking to outlet ${outletId}`);

  // Update products
  const { error: pErr } = await supabaseAdmin.from('products').update({ outlet_id: outletId }).eq('tenant_id', tenantId).is('outlet_id', null);
  if (pErr) console.error('Error updating products:', pErr);
  else console.log('Products updated');

  // Update categories
  const { error: cErr } = await supabaseAdmin.from('product_categories').update({ outlet_id: outletId }).eq('tenant_id', tenantId).is('outlet_id', null);
  if (cErr) console.error('Error updating categories:', cErr);
  else console.log('Categories updated');

  // Update stock items
  const { error: sErr } = await supabaseAdmin.from('stock_items').update({ outlet_id: outletId }).eq('tenant_id', tenantId).is('outlet_id', null);
  if (sErr) console.error('Error updating stock items:', sErr);
  else console.log('Stock items updated');
}

fixData();
