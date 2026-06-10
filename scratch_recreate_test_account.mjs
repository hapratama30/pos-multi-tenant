
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function recreateAccount() {
  const email = 'test@gmail.com';
  const password = 'password123';
  const tenantName = 'Kedai Kopi Mumpuni';
  const ownerName = 'Agus Pratama';
  const phone = '081234567890';

  console.log('--- RECREATING TEST ACCOUNT ---');

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
  const uid = authData.user.id;
  console.log('Auth user created:', uid);

  // 2. Create Tenant
  const tenantId = 'T' + Math.random().toString(36).substring(2, 14).toUpperCase();
  const { error: tError } = await supabaseAdmin.from('tenants').insert({
    tenant_id: tenantId,
    tenant_name: tenantName,
    phone: phone,
    status: 'active',
    plan_id: 'pro'
  });

  if (tError) {
    console.error('Tenant Error:', tError);
    return;
  }
  console.log('Tenant created:', tenantId);

  // 3. Create Staff/Owner
  const { error: sError } = await supabaseAdmin.from('staff').insert({
    tenant_id: tenantId,
    auth_user_id: uid,
    name: ownerName,
    email: email,
    phone: phone,
    role: 'Owner',
    status: 'Aktif'
  });

  if (sError) {
    console.error('Staff Error:', sError);
    return;
  }
  console.log('Staff/Owner linked');

  // 4. Populate Demo Data
  console.log('Populating demo data...');
  
  // Categories
  const categories = [
    { name: 'Kopi & Latte', code: 'KOP' },
    { name: 'Makanan Berat', code: 'MKN' },
    { name: 'Cemilan', code: 'SNK' }
  ];
  await supabaseAdmin.from('product_categories').insert(categories.map(c => ({ ...c, tenant_id: tenantId })));

  // Products
  const products = [
    { name: 'Caffe Latte Art', price: 28000, category: 'Kopi & Latte' },
    { name: 'Caramel Macchiato', price: 32000, category: 'Kopi & Latte' },
    { name: 'Nasi Goreng Wagyu', price: 45000, category: 'Makanan Berat' },
    { name: 'Ayam Geprek Spesial', price: 25000, category: 'Makanan Berat' },
    { name: 'French Fries Cheese', price: 18000, category: 'Cemilan' }
  ];
  const { data: insertedProds } = await supabaseAdmin.from('products').insert(products.map(p => ({ ...p, tenant_id: tenantId, is_active: true }))).select();

  // Stock Items
  const stockItems = [
    { name: 'Biji Kopi Arabika', unit: 'kg', current_stock: 10 },
    { name: 'Susu UHT', unit: 'liter', current_stock: 24 },
    { name: 'Beras Premium', unit: 'kg', current_stock: 25 }
  ];
  await supabaseAdmin.from('stock_items').insert(stockItems.map(s => ({ ...s, tenant_id: tenantId })));

  // Transactions (Backdated)
  const { data: outlet } = await supabaseAdmin.from('outlets').select('id').eq('tenant_id', tenantId).eq('is_main', true).single();
  if (outlet) {
      const today = new Date();
      const txs = [];
      for (let i = 0; i < 15; i++) {
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        const date = new Date();
        date.setDate(today.getDate() - (i % 7));
        txs.push({
            tenant_id: tenantId,
            outlet_id: outlet.id,
            total: randomProduct.price * qty,
            payment_method: 'Tunai',
            status: 'completed',
            created_at: date.toISOString(),
            items: [{ name: randomProduct.name, price: randomProduct.price, quantity: qty }]
        });
      }
      await supabaseAdmin.from('transactions').insert(txs);
  }

  console.log('--- RECREATION SUCCESSFUL ---');
  console.log('Email: ' + email);
  console.log('Password: ' + password);
}

recreateAccount();
