
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function recreateViaRPC() {
  const email = 'test@gmail.com';
  const password = 'password123';
  const tenantName = 'Kedai Kopi Mumpuni';
  const ownerName = 'Agus Pratama';
  const phone = '081234567890';

  console.log('--- RECREATING VIA RPC ---');

  // 1. Create Auth User
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: ownerName, role: 'Owner' }
  });

  if (authError) {
    console.error('Auth Error:', authError);
    return;
  }
  console.log('Auth user created:', authData.user.id);

  // 2. Sign In to get session
  const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    console.error('Sign In Error:', signInError);
    return;
  }
  console.log('Signed in successfully');

  // 3. Call RPC using user's session
  const userClient = createClient(process.env.SUPABASE_URL, 'sb_publishable_vVxCp5XLDKYAbQW8WI9XfQ_hMh1BAnn', {
    global: { headers: { Authorization: `Bearer ${sessionData.session.access_token}` } }
  });

  const { data: regData, error: regError } = await userClient.rpc('complete_tenant_registration', {
    p_tenant_name: tenantName,
    p_phone: phone,
    p_owner_name: ownerName
  });

  if (regError) {
    console.error('RPC Error:', regError);
    // If it still fails, it means the trigger is definitely broken
    return;
  }
  const tenantId = regData.tenant_id;
  console.log('Registration success:', tenantId);

  // 4. Populate Data (use Admin client)
  console.log('Populating data...');
  
  // Categories
  const categories = [
    { name: 'Kopi & Latte', code: 'KOP' },
    { name: 'Makanan Berat', code: 'MKN' },
    { name: 'Cemilan', code: 'SNK' }
  ];
  await supabaseAdmin.from('product_categories').upsert(categories.map(c => ({ ...c, tenant_id: tenantId })), { onConflict: 'tenant_id,name' });

  // Products
  const products = [
    { name: 'Caffe Latte Art', price: 28000, category: 'Kopi & Latte' },
    { name: 'Caramel Macchiato', price: 32000, category: 'Kopi & Latte' },
    { name: 'Nasi Goreng Wagyu', price: 45000, category: 'Makanan Berat' },
    { name: 'Ayam Geprek Spesial', price: 25000, category: 'Makanan Berat' },
    { name: 'French Fries Cheese', price: 18000, category: 'Cemilan' }
  ];
  await supabaseAdmin.from('products').upsert(products.map(p => ({ ...p, tenant_id: tenantId, is_active: true })), { onConflict: 'tenant_id,name' });

  // Stock Items
  const stockItems = [
    { name: 'Biji Kopi Arabika', unit: 'kg', current_stock: 10 },
    { name: 'Susu UHT', unit: 'liter', current_stock: 24 },
    { name: 'Beras Premium', unit: 'kg', current_stock: 25 }
  ];
  await supabaseAdmin.from('stock_items').upsert(stockItems.map(s => ({ ...s, tenant_id: tenantId })), { onConflict: 'tenant_id,name' });

  // Update Plan
  await supabaseAdmin.from('tenants').update({ plan_id: 'pro', enabled_modules: ['all'] }).eq('tenant_id', tenantId);

  console.log('--- RECREATION VIA RPC SUCCESSFUL ---');
}

recreateViaRPC();
