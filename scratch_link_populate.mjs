
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function linkAndPopulate() {
  const email = 'test@gmail.com';
  const password = 'password123';
  const tenantId = 'tenant-l29ea7';
  const tenantName = 'Kedai Kopi Mumpuni';
  const ownerName = 'Agus Pratama';
  const phone = '081234567890';

  console.log('--- LINKING EXISTING TENANT ---');

  // 1. Ensure Auth User exists
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  let authUser = users.find(u => u.email === email);
  
  if (!authUser) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: ownerName, role: 'Owner' }
    });
    if (error) { console.error('Auth Error:', error); return; }
    authUser = data.user;
  }
  const uid = authUser.id;
  console.log('Auth user ready:', uid);

  // 2. Link to Staff table
  const { error: staffError } = await supabaseAdmin.from('staff').insert({
    tenant_id: tenantId,
    auth_user_id: uid,
    name: ownerName,
    email: email,
    phone: phone,
    role: 'Owner',
    status: 'Aktif'
  });

  if (staffError) { console.error('Staff Error:', staffError); return; }
  console.log('Staff linked to tenant:', tenantId);

  // 3. Update Tenant Name
  await supabaseAdmin.from('tenants').update({ tenant_name: tenantName, plan_id: 'pro', enabled_modules: ['all'] }).eq('tenant_id', tenantId);
  console.log('Tenant name updated');

  // 4. Clean up old data for this tenant
  console.log('Cleaning up old data...');
  await supabaseAdmin.from('products').delete().eq('tenant_id', tenantId);
  await supabaseAdmin.from('product_categories').delete().eq('tenant_id', tenantId);
  await supabaseAdmin.from('stock_items').delete().eq('tenant_id', tenantId);
  await supabaseAdmin.from('transactions').delete().eq('tenant_id', tenantId);

  // 5. Populate New Demo Data
  console.log('Populating new demo data...');
  
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
  await supabaseAdmin.from('products').insert(products.map(p => ({ ...p, tenant_id: tenantId, is_active: true })));

  // Stock Items
  const stockItems = [
    { name: 'Biji Kopi Arabika', unit: 'kg', current_stock: 10 },
    { name: 'Susu UHT', unit: 'liter', current_stock: 24 },
    { name: 'Beras Premium', unit: 'kg', current_stock: 25 }
  ];
  await supabaseAdmin.from('stock_items').insert(stockItems.map(s => ({ ...s, tenant_id: tenantId })));

  // Transactions (Backdated)
  const { data: outlet } = await supabaseAdmin.from('outlets').select('id').eq('tenant_id', tenantId).eq('is_main', true).maybeSingle();
  if (outlet) {
      const today = new Date();
      const txs = [];
      for (let i = 0; i < 20; i++) {
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

  console.log('--- DEMO ACCOUNT READY ---');
  console.log('Email: ' + email);
  console.log('Password: ' + password);
}

linkAndPopulate();
