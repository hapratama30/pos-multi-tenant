-- Migration 034: Auto expiration period for subscription plans (30 days for premium plans)

CREATE OR REPLACE FUNCTION platform_update_tenant_plan(
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
DECLARE
  v_period_end timestamptz;
BEGIN
  IF NOT is_platform_admin(p_pin) THEN
    RAISE EXCEPTION 'Unauthorized platform access';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id = p_plan_id) THEN
    RAISE EXCEPTION 'Invalid plan_id: %', p_plan_id;
  END IF;

  -- Determine end period: Free plan has no expiration, trialing uses trial end date, paid plan defaults to 30 days
  IF p_plan_id = 'free' THEN
    v_period_end := NULL;
  ELSIF p_subscription_status = 'trialing' AND p_trial_ends_at IS NOT NULL THEN
    v_period_end := p_trial_ends_at;
  ELSE
    v_period_end := timezone('utc'::text, now()) + interval '30 days';
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
    'current_period_end', v_period_end
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION platform_update_tenant_plan(text, text, text, text, timestamptz) TO anon, authenticated;

COMMENT ON FUNCTION platform_update_tenant_plan IS 'Update subscription plan details with automatic 30-day expiration calculation';
