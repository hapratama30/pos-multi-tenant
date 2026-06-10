-- Migration 036: Add active_days column to subscription_plans and update platform_update_subscription_plan RPC

-- 1. Add column to subscription_plans table
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS active_days integer DEFAULT 30;

-- Update existing records
UPDATE subscription_plans SET active_days = 30 WHERE active_days IS NULL;

-- 2. Drop old RPC function signatures to prevent conflicts
DROP FUNCTION IF EXISTS platform_update_subscription_plan(text, text, text, numeric, numeric, integer, integer, integer, jsonb);

-- 3. Recreate platform_update_subscription_plan with active_days support
CREATE OR REPLACE FUNCTION platform_update_subscription_plan(
  p_pin text,
  p_plan_id text,
  p_name text,
  p_price_monthly numeric,
  p_price_original numeric,
  p_max_outlets integer,
  p_max_staff integer,
  p_max_products integer,
  p_features jsonb,
  p_active_days integer DEFAULT 30
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

  INSERT INTO subscription_plans (
    id, name, price_monthly, price_original, max_outlets, max_staff, max_products, features, active_days, created_at, updated_at
  )
  VALUES (
    p_plan_id, p_name, p_price_monthly, p_price_original, p_max_outlets, p_max_staff, p_max_products, p_features, p_active_days, timezone('utc'::text, now()), timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price_monthly = EXCLUDED.price_monthly,
    price_original = EXCLUDED.price_original,
    max_outlets = EXCLUDED.max_outlets,
    max_staff = EXCLUDED.max_staff,
    max_products = EXCLUDED.max_products,
    features = EXCLUDED.features,
    active_days = EXCLUDED.active_days,
    updated_at = timezone('utc'::text, now());

  INSERT INTO platform_audit_logs (actor_email, action, details)
  VALUES ('superadmin', 'plan_update', jsonb_build_object(
    'plan_id', p_plan_id,
    'name', p_name,
    'price_monthly', p_price_monthly,
    'price_original', p_price_original,
    'features', p_features,
    'active_days', p_active_days
  ));
END;
$$;

-- 4. Re-grant execute permission
GRANT EXECUTE ON FUNCTION platform_update_subscription_plan(text, text, text, numeric, numeric, integer, integer, integer, jsonb, integer) TO anon, authenticated;

-- 5. Redefine platform_update_tenant_plan to read active_days from subscription_plans table as default fallback
CREATE OR REPLACE FUNCTION platform_update_tenant_plan(
  p_pin text,
  p_tenant_id text,
  p_plan_id text,
  p_subscription_status text DEFAULT 'active',
  p_trial_ends_at timestamptz DEFAULT NULL,
  p_active_days integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_end timestamptz;
  v_plan_days integer;
BEGIN
  IF NOT is_platform_admin(p_pin) THEN
    RAISE EXCEPTION 'Unauthorized platform access';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id = p_plan_id) THEN
    RAISE EXCEPTION 'Invalid plan_id: %', p_plan_id;
  END IF;

  -- Determine end period: Free plan has no expiration, trialing uses trial end date, paid plan uses custom p_active_days or fallback to plan's configured active_days
  IF p_plan_id = 'free' THEN
    v_period_end := NULL;
  ELSIF p_subscription_status = 'trialing' AND p_trial_ends_at IS NOT NULL THEN
    v_period_end := p_trial_ends_at;
  ELSE
    SELECT COALESCE(active_days, 30) INTO v_plan_days FROM subscription_plans WHERE id = p_plan_id;
    v_period_end := timezone('utc'::text, now()) + (COALESCE(p_active_days, v_plan_days) * interval '1 day');
  END IF;

  INSERT INTO tenant_subscriptions (
    tenant_id, plan_id, status, trial_ends_at, 
    current_period_start, current_period_end, updated_at
  )
  VALUES (
    p_tenant_id, p_plan_id, p_subscription_status, p_trial_ends_at, 
    timezone('utc'::text, now()), v_period_end, timezone('utc'::text, now())
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    trial_ends_at = EXCLUDED.trial_ends_at,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    updated_at = timezone('utc'::text, now());

  INSERT INTO platform_audit_logs (actor_email, action, target_tenant_id, details)
  VALUES ('superadmin', 'plan_change', p_tenant_id, jsonb_build_object(
    'plan_id', p_plan_id,
    'status', p_subscription_status,
    'trial_ends_at', p_trial_ends_at,
    'current_period_end', v_period_end,
    'active_days', COALESCE(p_active_days, v_plan_days)
  ));
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION platform_update_tenant_plan(text, text, text, text, timestamptz, integer) TO anon, authenticated;
