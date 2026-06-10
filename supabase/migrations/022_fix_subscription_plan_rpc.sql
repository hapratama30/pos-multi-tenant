-- Consolidated migration for updating subscription plans
-- This ensures the function signature matches the frontend call exactly.

CREATE OR REPLACE FUNCTION platform_update_subscription_plan(
  p_pin text,
  p_plan_id text,
  p_name text,
  p_price_monthly numeric,
  p_price_original numeric,
  p_max_outlets integer,
  p_max_staff integer,
  p_max_products integer,
  p_features jsonb
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

  UPDATE subscription_plans SET
    name = p_name,
    price_monthly = p_price_monthly,
    price_original = p_price_original,
    max_outlets = p_max_outlets,
    max_staff = p_max_staff,
    max_products = p_max_products,
    features = p_features,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_plan_id;

  INSERT INTO platform_audit_logs (actor_email, action, details)
  VALUES ('superadmin', 'plan_update', jsonb_build_object(
    'plan_id', p_plan_id,
    'name', p_name,
    'price_monthly', p_price_monthly,
    'price_original', p_price_original,
    'features', p_features
  ));
END;
$$;

-- Ensure permissions are granted
GRANT EXECUTE ON FUNCTION platform_update_subscription_plan(text, text, text, numeric, numeric, integer, integer, integer, jsonb) TO anon, authenticated;

-- Force a schema cache refresh (by doing a dummy comment change)
COMMENT ON FUNCTION platform_update_subscription_plan IS 'Update subscription plan details by superadmin';
