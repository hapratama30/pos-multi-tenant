-- Migration to add original_price to subscription_plans
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS price_original numeric DEFAULT 0;

-- Update the update function to handle price_original
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

GRANT EXECUTE ON FUNCTION platform_update_subscription_plan(text, text, text, numeric, numeric, integer, integer, integer, jsonb) TO anon, authenticated;
