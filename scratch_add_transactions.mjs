
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addDemoTransactions() {
  const tenantId = 'tenant-l29ea7';
  const outletId = (await supabaseAdmin.from('outlets').select('id').eq('tenant_id', tenantId).eq('is_main', true).single()).data.id;
  
  console.log('Adding demo transactions for tenant:', tenantId);

  const products = (await supabaseAdmin.from('products').select('*').eq('tenant_id', tenantId)).data;
  
  if (!products || products.length === 0) {
    console.error('No products found');
    return;
  }

  const today = new Date();
  for (let i = 0; i < 10; i++) {
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    const qty = Math.floor(Math.random() * 3) + 1;
    const total = randomProduct.price * qty;
    
    // Create transaction with backdated dates for chart
    const date = new Date();
    date.setDate(today.getDate() - (i % 5)); // Transactions spread over last 5 days
    
    await supabaseAdmin.from('transactions').insert({
      tenant_id: tenantId,
      outlet_id: outletId,
      total: total,
      payment_method: 'Tunai',
      status: 'completed',
      created_at: date.toISOString(),
      items: [{
        id: randomProduct.id,
        name: randomProduct.name,
        price: randomProduct.price,
        quantity: qty
      }]
    });
  }

  console.log('--- TRANSAKSI DEMO SIAP ---');
}

addDemoTransactions();
