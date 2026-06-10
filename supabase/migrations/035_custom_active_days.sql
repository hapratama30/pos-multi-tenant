-- Migration 035: Custom active days setting for subscription upgrades and edits

-- 1. Drop old function signatures to prevent conflicts
DROP FUNCTION IF EXISTS platform_update_tenant_plan(text, text, text, text, timestamptz);
DROP FUNCTION IF EXISTS platform_apply_plan_preset(text, text, text, boolean);

-- 2. Create updated platform_update_tenant_plan with p_active_days argument
CREATE OR REPLACE FUNCTION platform_update_tenant_plan(
  p_pin text,
  p_tenant_id text,
  p_plan_id text,
  p_subscription_status text DEFAULT 'active',
  p_trial_ends_at timestamptz DEFAULT NULL,
  p_active_days integer DEFAULT 30
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_end timestamptz;
BEGIN
  IF NOT is_platform_admin(p_pin) THEN
    RAISE EXCEPTION 'Unauthorized platform access';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id = p_plan_id) THEN
    RAISE EXCEPTION 'Invalid plan_id: %', p_plan_id;
  END IF;

  -- Determine end period: Free plan has no expiration, trialing uses trial end date, paid plan uses custom p_active_days
  IF p_plan_id = 'free' THEN
    v_period_end := NULL;
  ELSIF p_subscription_status = 'trialing' AND p_trial_ends_at IS NOT NULL THEN
    v_period_end := p_trial_ends_at;
  ELSE
    v_period_end := timezone('utc'::text, now()) + (p_active_days * interval '1 day');
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
    'active_days', p_active_days
  ));
END;
$$;

-- 3. Create updated platform_apply_plan_preset with p_active_days argument
CREATE OR REPLACE FUNCTION platform_apply_plan_preset(
  p_pin text,
  p_tenant_id text,
  p_plan_id text,
  p_apply_modules boolean DEFAULT true,
  p_active_days integer DEFAULT 30
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_modules jsonb;
BEGIN
  IF NOT is_platform_admin(p_pin) THEN
    RAISE EXCEPTION 'Unauthorized platform access';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id = p_plan_id) THEN
    RAISE EXCEPTION 'Invalid plan_id';
  END IF;

  SELECT features INTO v_modules FROM subscription_plans WHERE id = p_plan_id;

  PERFORM platform_update_tenant_plan(p_pin, p_tenant_id, p_plan_id, 'active', NULL, p_active_days);

  IF p_apply_modules THEN
    IF v_modules @> '["all"]'::jsonb THEN
      UPDATE tenants SET enabled_modules = '["all"]'::jsonb WHERE tenant_id = p_tenant_id;
    ELSE
      UPDATE tenants SET enabled_modules = v_modules WHERE tenant_id = p_tenant_id;
    END IF;
  END IF;

  UPDATE tenant_subscriptions SET
    max_outlets_override = NULL,
    max_staff_override = NULL,
    max_products_override = NULL,
    updated_at = timezone('utc'::text, now())
  WHERE tenant_id = p_tenant_id;
END;
$$;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION platform_update_tenant_plan(text, text, text, text, timestamptz, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION platform_apply_plan_preset(text, text, text, boolean, integer) TO anon, authenticated;

COMMENT ON FUNCTION platform_update_tenant_plan IS 'Update subscription plan details with custom active days';
COMMENT ON FUNCTION platform_apply_plan_preset IS 'Apply plan preset modules and custom active days limit';
