-- Migration 014: Super Admin platform controls (tenant, subscription, stats)
-- PIN: landing_admin_pin (VITE_SUPERADMIN_PIN) atau platform_admin_pin

CREATE OR REPLACE FUNCTION is_platform_admin(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_platform_pin text;
  v_landing_pin text;
BEGIN
  IF p_pin IS NULL OR length(trim(p_pin)) = 0 THEN
    RETURN false;
  END IF;
  SELECT value INTO v_platform_pin FROM app_secrets WHERE key = 'platform_admin_pin' LIMIT 1;
  SELECT value INTO v_landing_pin FROM app_secrets WHERE key = 'landing_admin_pin' LIMIT 1;
  RETURN p_pin = COALESCE(v_platform_pin, v_landing_pin)
      OR (v_landing_pin IS NOT NULL AND p_pin = v_landing_pin);
END;
$$;

-- Return type berubah vs migration 009 — harus drop dulu
DROP FUNCTION IF EXISTS platform_list_tenants(text);

CREATE FUNCTION platform_list_tenants(p_pin text)
RETURNS TABLE (
  tenant_id text,
  tenant_name text,
  status text,
  plan_id text,
  subscription_status text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz,
  owner_name text,
  owner_email text,
  owner_phone text,
  staff_count bigint,
  transaction_count bigint
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
    ts.current_period_end,
    t.created_at,
    (
      SELECT s.name FROM staff s
      WHERE s.tenant_id = t.tenant_id AND lower(s.role) = 'owner'
      ORDER BY s.created_at ASC LIMIT 1
    ),
    (
      SELECT lower(s.email) FROM staff s
      WHERE s.tenant_id = t.tenant_id AND lower(s.role) = 'owner'
      ORDER BY s.created_at ASC LIMIT 1
    ),
    COALESCE(
      (
        SELECT s.phone FROM staff s
        WHERE s.tenant_id = t.tenant_id AND lower(s.role) = 'owner'
        ORDER BY s.created_at ASC LIMIT 1
      ),
      t.phone
    ),
    (SELECT COUNT(*) FROM staff s WHERE s.tenant_id = t.tenant_id),
    (SELECT COUNT(*) FROM transactions tx WHERE tx.tenant_id = t.tenant_id)
  FROM tenants t
  LEFT JOIN tenant_subscriptions ts ON ts.tenant_id = t.tenant_id
  ORDER BY t.created_at DESC;
END;
$$;

DROP FUNCTION IF EXISTS platform_list_plans(text);

CREATE FUNCTION platform_list_plans(p_pin text)
RETURNS SETOF subscription_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin(p_pin) THEN
    RAISE EXCEPTION 'Unauthorized platform access';
  END IF;
  RETURN QUERY SELECT * FROM subscription_plans ORDER BY price_monthly ASC;
END;
$$;

DROP FUNCTION IF EXISTS platform_get_stats(text);

CREATE FUNCTION platform_get_stats(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT is_platform_admin(p_pin) THEN
    RAISE EXCEPTION 'Unauthorized platform access';
  END IF;
  SELECT jsonb_build_object(
    'total_tenants', (SELECT COUNT(*) FROM tenants),
    'active_tenants', (SELECT COUNT(*) FROM tenants WHERE COALESCE(status, 'active') = 'active'),
    'suspended_tenants', (SELECT COUNT(*) FROM tenants WHERE status = 'suspended'),
    'total_transactions', (SELECT COUNT(*) FROM transactions),
    'registrations_this_month', (
      SELECT COUNT(*) FROM tenants
      WHERE created_at >= date_trunc('month', timezone('utc'::text, now()))
    ),
    'pro_subscribers', (
      SELECT COUNT(*) FROM tenant_subscriptions WHERE plan_id = 'pro' AND status = 'active'
    ),
    'enterprise_subscribers', (
      SELECT COUNT(*) FROM tenant_subscriptions WHERE plan_id = 'enterprise' AND status = 'active'
    )
  ) INTO v_result;
  RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS platform_update_tenant_plan(text, text, text, text, timestamptz);

CREATE FUNCTION platform_update_tenant_plan(
  p_pin text,
  p_tenant_id text,
  p_plan_id text,
  p_subscription_status text DEFAULT 'active',
  p_trial_ends_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin(p_pin) THEN
    RAISE EXCEPTION 'Unauthorized platform access';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id = p_plan_id) THEN
    RAISE EXCEPTION 'Invalid plan_id: %', p_plan_id;
  END IF;
  INSERT INTO tenant_subscriptions (tenant_id, plan_id, status, trial_ends_at, updated_at)
  VALUES (p_tenant_id, p_plan_id, p_subscription_status, p_trial_ends_at, timezone('utc'::text, now()))
  ON CONFLICT (tenant_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    trial_ends_at = EXCLUDED.trial_ends_at,
    updated_at = timezone('utc'::text, now());
  INSERT INTO platform_audit_logs (actor_email, action, target_tenant_id, details)
  VALUES ('superadmin', 'plan_change', p_tenant_id, jsonb_build_object(
    'plan_id', p_plan_id,
    'status', p_subscription_status,
    'trial_ends_at', p_trial_ends_at
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION platform_list_tenants(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION platform_list_plans(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION platform_get_stats(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION platform_update_tenant_plan(text, text, text, text, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION platform_update_tenant_status(text, text, text, text) TO anon, authenticated;
