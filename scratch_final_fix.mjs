
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function finalFix() {
  const tenantId = 'tenant-l29ea7';
  const email = 'test@gmail.com';
  
  console.log('--- FINAL DATA SYNC ---');

  // 1. Get Outlet
  const { data: outlets } = await supabaseAdmin.from('outlets').select('*').eq('tenant_id', tenantId);
  const mainOutlet = outlets.find(o => o.is_main) || outlets[0];
  
  if (!mainOutlet) {
    console.error('No outlet found for tenant');
    return;
  }
  const outletId = mainOutlet.id;
  console.log('Using Outlet ID:', outletId);

  // 2. Clear existing
  await supabaseAdmin.from('products').delete().eq('tenant_id', tenantId);
  await supabaseAdmin.from('product_categories').delete().eq('tenant_id', tenantId);
  
  // 3. Categories
  const categories = [
    { tenant_id: tenantId, outlet_id: outletId, name: 'Makanan', type: 'ritel', code: 'makanan' },
    { tenant_id: tenantId, outlet_id: outletId, name: 'Minuman', type: 'ritel', code: 'minuman' },
    { tenant_id: tenantId, outlet_id: outletId, name: 'Jasa', type: 'jasa', code: 'jasa' }
  ];
  await supabaseAdmin.from('product_categories').insert(categories);
  console.log('Categories inserted');

  // 4. Products
  const products = [
    { tenant_id: tenantId, outlet_id: outletId, name: 'Nasi Goreng', price: 25000, category: 'Makanan', is_active: true, unit: 'Pcs' },
    { tenant_id: tenantId, outlet_id: outletId, name: 'Mie Goreng', price: 22000, category: 'Makanan', is_active: true, unit: 'Pcs' },
    { tenant_id: tenantId, outlet_id: outletId, name: 'Es Teh', price: 5000, category: 'Minuman', is_active: true, unit: 'Pcs' },
    { tenant_id: tenantId, outlet_id: outletId, name: 'Kopi Hitam', price: 10000, category: 'Minuman', is_active: true, unit: 'Pcs' },
    { tenant_id: tenantId, outlet_id: outletId, name: 'Cuci Motor', price: 15000, category: 'Jasa', is_active: true, unit: 'Unit', duration: 30, duration_type: 'Menit' }
  ];
  await supabaseAdmin.from('products').insert(products);
  console.log('Products inserted');

  console.log('--- SYNC COMPLETE ---');
}

finalFix();
