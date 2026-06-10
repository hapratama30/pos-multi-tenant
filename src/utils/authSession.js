import { supabase } from '../supabaseClient';
import { findStaffForLogin, linkStaffAuthUserId } from './staffLookup';

const USER_STORAGE_KEY = 'pos_current_user';

export async function resolveUserFromSession(session) {
  if (!session?.user?.email) return null;

  const { staffData, staffError } = await findStaffForLogin(
    session.user.email,
    session.user.id
  );

  if (staffError || !staffData) return null;
  if (staffData.status === 'Nonaktif') return null;

  linkStaffAuthUserId(staffData.id, session.user.id).catch(() => {});

  const { data: tenantData } = await supabase
    .from('tenants')
    .select('tenant_name, business_vertical, enabled_modules')
    .eq('tenant_id', staffData.tenant_id)
    .maybeSingle();

  const { data: subData } = await supabase
    .from('tenant_subscriptions')
    .select('plan_id, status, trial_ends_at, current_period_end')
    .eq('tenant_id', staffData.tenant_id)
    .maybeSingle();

  let activePlan = subData?.plan_id || 'free';
  let activeModules = tenantData?.enabled_modules || ['pos', 'history', 'catalog', 'staff', 'settings'];

  if (activePlan !== 'free') {
    const now = new Date();
    let isExpired = false;
    if (subData?.status === 'trialing' && subData?.trial_ends_at) {
      isExpired = new Date(subData.trial_ends_at) < now;
    } else if (subData?.current_period_end) {
      isExpired = new Date(subData.current_period_end) < now;
    }

    if (isExpired) {
      activePlan = 'free';
      activeModules = ['pos', 'history', 'catalog', 'staff', 'settings'];
      
      // Update database secara background/asinkron agar tidak memblokir login user
      supabase
        .from('tenant_subscriptions')
        .update({
          plan_id: 'free',
          status: 'expired',
          updated_at: now.toISOString()
        })
        .eq('tenant_id', staffData.tenant_id)
        .then(() => {
          console.log(`[Auto-Expiry] Tenant ${staffData.tenant_id} subscription plan downgraded to free due to expiration.`);
        })
        .catch(err => {
          console.error('[Auto-Expiry Error] Failed to update subscription status:', err);
        });

      supabase
        .from('tenants')
        .update({
          enabled_modules: activeModules
        })
        .eq('tenant_id', staffData.tenant_id)
        .then(() => {
          console.log(`[Auto-Expiry] Tenant ${staffData.tenant_id} modules downgraded to free preset.`);
        })
        .catch(err => {
          console.error('[Auto-Expiry Error] Failed to update tenant modules:', err);
        });
    }
  }

  return {
    id: staffData.id,
    staff_id: staffData.id,
    uid: session.user.id,
    email: session.user.email,
    tenant_id: staffData.tenant_id,
    tenant_name: tenantData?.tenant_name || 'Toko Anda',
    name: staffData.name,
    role: staffData.role || 'Kasir',
    permissions: staffData.permissions,
    outlet_id: staffData.outlet_id || null,
    tax_enabled: false,
    tax_rate: 11,
    tax_inclusive: false,
    business_vertical: tenantData?.business_vertical || 'general',
    plan_id: activePlan,
    enabled_modules: activeModules,
  };
}

export async function restoreAuthSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
  const user = await resolveUserFromSession(session);
  if (!user) {
    localStorage.removeItem(USER_STORAGE_KEY);
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    return null;
  }
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  return user;
}

export function persistUserSession(user) {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export async function syncUserMetadata(tenantId, extra = {}) {
  try {
    await supabase.auth.updateUser({
      data: { tenant_id: tenantId, ...extra },
    });
  } catch {
    /* optional */
  }
}

export async function updateJwtTenantMetadata(tenantId, role, name) {
  await syncUserMetadata(tenantId, { role, name });
}

/**
 * Listener auth — jangan panggil getSession di dalam callback (deadlock).
 * INITIAL_SESSION diabaikan; init dilakukan di App.jsx.
 */
export function subscribeAuthChanges(onUserChange) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') return;

    setTimeout(async () => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(USER_STORAGE_KEY);
        onUserChange(null);
        return;
      }
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        const user = await resolveUserFromSession(session);
        if (user) {
          persistUserSession(user);
          onUserChange(user);
        }
      }
    }, 0);
  });
  return () => subscription.unsubscribe();
}
