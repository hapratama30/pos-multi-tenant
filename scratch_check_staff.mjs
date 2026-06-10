
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function populateDemoData() {
  const tenantId = 'tenant-l29ea7'; // Account for test@gmail.com
  console.log('Populating data for tenant:', tenantId);

  // 1. Categories
  const categories = [
    { name: 'Kopi & Latte', code: 'KOP' },
    { name: 'Makanan Berat', code: 'MKN' },
    { name: 'Cemilan', code: 'SNK' }
  ];
  for (const cat of categories) {
    await supabaseAdmin.from('product_categories').upsert({ tenant_id: tenantId, name: cat.name, code: cat.code }, { onConflict: 'tenant_id,name' });
  }

  // 2. Products
  const products = [
    { name: 'Caffe Latte Art', price: 28000, category: 'Kopi & Latte' },
    { name: 'Caramel Macchiato', price: 32000, category: 'Kopi & Latte' },
    { name: 'Nasi Goreng Wagyu', price: 45000, category: 'Makanan Berat' },
    { name: 'Ayam Geprek Spesial', price: 25000, category: 'Makanan Berat' },
    { name: 'French Fries Cheese', price: 18000, category: 'Cemilan' }
  ];
  for (const prod of products) {
    await supabaseAdmin.from('products').upsert({ tenant_id: tenantId, name: prod.name, price: prod.price, category: prod.category, is_active: true }, { onConflict: 'tenant_id,name' });
  }

  // 3. Stock Items
  const stockItems = [
    { name: 'Biji Kopi Arabika', unit: 'kg', current_stock: 10 },
    { name: 'Susu UHT', unit: 'liter', current_stock: 24 },
    { name: 'Beras Premium', unit: 'kg', current_stock: 25 }
  ];
  for (const item of stockItems) {
    await supabaseAdmin.from('stock_items').upsert({ tenant_id: tenantId, name: item.name, unit: item.unit, current_stock: item.current_stock }, { onConflict: 'tenant_id,name' });
  }

  // 4. Update Subscription to Pro
  await supabaseAdmin.from('tenants').update({ plan_id: 'pro', enabled_modules: ['all'] }).eq('tenant_id', tenantId);

  console.log('--- DATA DEMO SIAP ---');
}

populateDemoData();
