import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
CREATE OR REPLACE FUNCTION platform_list_tenants(p_pin text)
RETURNS TABLE (
  tenant_id text,
  tenant_name text,
  status text,
  plan_id text,
  subscription_status text,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz,
  owner_name text,
  owner_email text,
  owner_phone text,
  staff_count bigint,
  transaction_count bigint,
  business_vertical text,
  enabled_modules jsonb,
  max_outlets integer,
  max_staff integer,
  max_products integer,
  max_outlets_override integer,
  max_staff_override integer,
  max_products_override integer,
  xendit_merchant_id text,
  xendit_va_status text,
  xendit_qris_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin(p_pin) THEN
    RAISE EXCEPTION 'Unauthorized platform access';
  END IF;
  RETURN QUERY
  SELECT
    t.tenant_id,
    t.tenant_name,
    COALESCE(t.status, 'active'),
    COALESCE(ts.plan_id, 'free'),
    COALESCE(ts.status, 'active'),
    ts.trial_ends_at,
    ts.current_period_start,
    ts.current_period_end,
    t.created_at,
    (SELECT s.name FROM staff s WHERE s.tenant_id = t.tenant_id AND lower(s.role) = 'owner' ORDER BY s.created_at ASC LIMIT 1),
    (SELECT lower(s.email) FROM staff s WHERE s.tenant_id = t.tenant_id AND lower(s.role) = 'owner' ORDER BY s.created_at ASC LIMIT 1),
    COALESCE(
      (SELECT s.phone FROM staff s WHERE s.tenant_id = t.tenant_id AND lower(s.role) = 'owner' ORDER BY s.created_at ASC LIMIT 1),
      t.phone
    ),
    (SELECT COUNT(*) FROM staff s WHERE s.tenant_id = t.tenant_id),
    (SELECT COUNT(*) FROM transactions tx WHERE tx.tenant_id = t.tenant_id),
    COALESCE(t.business_vertical, 'general'),
    COALESCE(t.enabled_modules, '["pos","history","catalog","staff","settings"]'::jsonb),
    COALESCE(sp.max_outlets, 1),
    COALESCE(sp.max_staff, 3),
    COALESCE(sp.max_products, 100),
    ts.max_outlets_override,
    ts.max_staff_override,
    ts.max_products_override,
    ps.xendit_merchant_id,
    COALESCE(ps.xendit_va_status, 'Belum Terdaftar'),
    COALESCE(ps.xendit_qris_status, 'Belum Terdaftar')
  FROM tenants t
  LEFT JOIN tenant_subscriptions ts ON ts.tenant_id = t.tenant_id
  LEFT JOIN subscription_plans sp ON sp.id = COALESCE(ts.plan_id, 'free')
  LEFT JOIN LATERAL (
    SELECT x_sett.xendit_merchant_id, x_sett.xendit_va_status, x_sett.xendit_qris_status
    FROM payment_settings x_sett
    WHERE x_sett.tenant_id = t.tenant_id
    ORDER BY x_sett.updated_at DESC
    LIMIT 1
  ) ps ON TRUE
  ORDER BY t.created_at DESC;
END;
$$;
`;

async function run() {
  console.log('Applying function fix on Supabase...');
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.error('exec_sql failed, trying run_sql...', error);
    const { data: d2, error: e2 } = await supabase.rpc('run_sql', { query: sql });
    if (e2) {
      console.error('run_sql also failed:', e2);
    } else {
      console.log('Applied successfully via run_sql.');
    }
  } else {
    console.log('Applied successfully via exec_sql.');
  }
}

run();
