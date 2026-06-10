import { supabase } from '../supabaseClient';
import { getSuperAdminPinForRpc } from './landingContent';

function requirePin(pin) {
  const p = pin || getSuperAdminPinForRpc();
  if (!p) throw new Error('Sesi PIN habis. Kunci panel lalu masuk lagi.');
  return p;
}

export async function fetchPlatformStats(pin) {
  const { data, error } = await supabase.rpc('platform_get_stats', { p_pin: requirePin(pin) });
  if (error) throw error;
  return data || {};
}

export async function fetchPlatformTenants(pin) {
  const { data, error } = await supabase.rpc('platform_list_tenants', { p_pin: requirePin(pin) });
  if (error) throw error;
  return data || [];
}

export async function fetchSubscriptionPlans(pin) {
  const { data, error } = await supabase.rpc('platform_list_plans', { p_pin: requirePin(pin) });
  if (error) throw error;
  return data || [];
}

export async function fetchPublicSubscriptionPlans() {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_monthly', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateTenantStatus(tenantId, suspend, reason, pin) {
  const { error } = await supabase.rpc('platform_update_tenant_status', {
    p_pin: requirePin(pin),
    p_tenant_id: tenantId,
    p_status: suspend ? 'suspended' : 'active',
    p_reason: reason || (suspend ? 'Suspended by super admin' : null),
  });
  if (error) throw error;
}

export async function updateTenantPlan(tenantId, planId, subscriptionStatus, trialEndsAt, activeDays, pin) {
  const { error } = await supabase.rpc('platform_update_tenant_plan', {
    p_pin: requirePin(pin),
    p_tenant_id: tenantId,
    p_plan_id: planId,
    p_subscription_status: subscriptionStatus || 'active',
    p_trial_ends_at: trialEndsAt || null,
    p_active_days: Number(activeDays) || 30
  });
  if (error) throw error;
}

export async function applyPlanPreset(tenantId, planId, applyModules = true, activeDays, pin) {
  const { error } = await supabase.rpc('platform_apply_plan_preset', {
    p_pin: requirePin(pin),
    p_tenant_id: tenantId,
    p_plan_id: planId,
    p_apply_modules: applyModules,
    p_active_days: Number(activeDays) || 30
  });
  if (error) throw error;
}

export async function updateTenantModules(tenantId, businessVertical, enabledModules, pin) {
  const { error } = await supabase.rpc('platform_update_tenant_modules', {
    p_pin: requirePin(pin),
    p_tenant_id: tenantId,
    p_business_vertical: businessVertical,
    p_enabled_modules: enabledModules,
  });
  if (error) throw error;
}

export async function updateTenantLimits(tenantId, limits, pin) {
  const { error } = await supabase.rpc('platform_update_tenant_limits', {
    p_pin: requirePin(pin),
    p_tenant_id: tenantId,
    p_max_outlets: limits.maxOutlets ?? null,
    p_max_staff: limits.maxStaff ?? null,
    p_max_products: limits.maxProducts ?? null,
  });
  if (error) throw error;
}

export async function updateSubscriptionPlan(planId, data, pin) {
  const { error } = await supabase.rpc('platform_update_subscription_plan', {
    p_pin: requirePin(pin),
    p_plan_id: planId,
    p_name: data.name,
    p_price_monthly: data.price_monthly,
    p_price_original: data.price_original || 0,
    p_max_outlets: data.max_outlets,
    p_max_staff: data.max_staff,
    p_max_products: data.max_products,
    p_features: data.features,
    p_active_days: Number(data.active_days || 30)
  });
  if (error) throw error;
}

export async function deleteSubscriptionPlan(planId, pin) {
  const { error } = await supabase.rpc('platform_delete_subscription_plan', {
    p_pin: requirePin(pin),
    p_plan_id: planId
  });
  if (error) throw error;
}

export function whatsAppUrl(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}

export function formatRupiah(n) {
  if (n === null || n === undefined) return 'Rp 0';
  const val = Number(n);
  // Pastikan tidak ada double Rp jika toLocaleString sudah menyertakannya
  const formatted = val.toLocaleString('id-ID');
  if (formatted.startsWith('Rp')) {
    return formatted;
  }
  return 'Rp ' + formatted;
}
