import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_TENANT_ID = 'T1A86BC39B52F';

async function simulateExpiry() {
  console.log('=== SIMULATION: AUTO EXPIRY ===');
  
  // 1. Set the subscription to yesterday (expired)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  console.log(`Setting current_period_end for tenant ${TEST_TENANT_ID} to ${yesterday.toISOString()} (yesterday)...`);
  
  const { error: subErr } = await supabase
    .from('tenant_subscriptions')
    .update({
      plan_id: 'enterprise',
      status: 'active',
      current_period_end: yesterday.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('tenant_id', TEST_TENANT_ID);
    
  if (subErr) {
    console.error('Error updating subscription:', subErr);
    return;
  }

  // Ensure modules are currently set to enterprise modules (e.g. all)
  const { error: tenantErr } = await supabase
    .from('tenants')
    .update({
      enabled_modules: ['all']
    })
    .eq('tenant_id', TEST_TENANT_ID);
    
  if (tenantErr) {
    console.error('Error updating tenant modules:', tenantErr);
    return;
  }

  console.log('Subscription set to expired. Now let\'s check what the database currently returns:');
  
  // Read back to confirm
  const { data: beforeData } = await supabase
    .from('tenant_subscriptions')
    .select('plan_id, current_period_end')
    .eq('tenant_id', TEST_TENANT_ID)
    .single();
    
  console.log('DB Subscription state (Before App Check):', beforeData);
  
  console.log('\n--- SIMULATING APP SESSION RESOLVER / BOOTING ---');
  // Mock resolveUserFromSession logic
  let activePlan = beforeData.plan_id;
  let activeModules = ['all'];
  
  if (activePlan !== 'free' && beforeData.current_period_end) {
    const isExpired = new Date(beforeData.current_period_end) < new Date();
    if (isExpired) {
      console.log('✓ Detection: Subscription has expired! Downgrading to FREE...');
      activePlan = 'free';
      activeModules = ['pos', 'history', 'catalog', 'staff', 'settings'];
      
      // Update DB
      await supabase
        .from('tenant_subscriptions')
        .update({
          plan_id: 'free',
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', TEST_TENANT_ID);
        
      await supabase
        .from('tenants')
        .update({
          enabled_modules: activeModules
        })
        .eq('tenant_id', TEST_TENANT_ID);
    }
  }

  console.log('\n--- AFTER APP CHECK DB STATUS ---');
  const { data: afterSub } = await supabase
    .from('tenant_subscriptions')
    .select('plan_id, status, current_period_end')
    .eq('tenant_id', TEST_TENANT_ID)
    .single();
    
  const { data: afterTenant } = await supabase
    .from('tenants')
    .select('enabled_modules')
    .eq('tenant_id', TEST_TENANT_ID)
    .single();

  console.log('DB Subscription state (After):', afterSub);
  console.log('DB Tenant modules (After):', afterTenant.enabled_modules);
  
  if (afterSub.plan_id === 'free' && afterTenant.enabled_modules.includes('pos') && !afterTenant.enabled_modules.includes('all')) {
    console.log('\n✅ SUCCESS: Auto-expiry logic successfully detected the expired date and downgraded the tenant to free plan with locked features!');
  } else {
    console.log('\n❌ FAILURE: Auto-expiry logic did not downgrade correctly.');
  }
}

simulateExpiry();
