-- Migration 016: Super Admin — modul tenant, limit override, detail lengkap

-- Perbarui preset fitur di subscription_plans agar selaras dengan modul platform
UPDATE subscription_plans SET features = '["pos","history","catalog","staff","settings"]'::jsonb WHERE id = 'free';
UPDATE subscription_plans SET features = '["pos","history","catalog","variants","customers","staff","settings","reports","expenses","discounts","xendit","stock","outlets","shifts","fnb"]'::jsonb WHERE id = 'pro';
UPDATE subscription_plans SET features = '["all"]'::jsonb WHERE id = 'enterprise';

ALTER TABLE tenant_subscriptions
  ADD COLUMN IF NOT EXISTS max_outlets_override integer,
  ADD COLUMN IF NOT EXISTS max_staff_override integer,
  ADD COLUMN IF NOT EXISTS max_products_override integer;

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
  LEFT JOIN payment_settings ps ON ps.tenant_id = t.tenant_id
  ORDER BY t.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION platform_update_tenant_modules(
  p_pin text,
  p_tenant_id text,
  p_business_vertical text,
  p_enabled_modules jsonb
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
  UPDATE tenants SET
    business_vertical = COALESCE(NULLIF(trim(p_business_vertical), ''), 'general'),
    enabled_modules = COALESCE(p_enabled_modules, '[]'::jsonb)
  WHERE tenant_id = p_tenant_id;
  INSERT INTO platform_audit_logs (actor_email, action, target_tenant_id, details)
  VALUES ('superadmin', 'modules_update', p_tenant_id, jsonb_build_object(
    'business_vertical', p_business_vertical,
    'enabled_modules', p_enabled_modules
  ));
END;
$$;

CREATE OR REPLACE FUNCTION platform_update_tenant_limits(
  p_pin text,
  p_tenant_id text,
  p_max_outlets integer DEFAULT NULL,
  p_max_staff integer DEFAULT NULL,
  p_max_products integer DEFAULT NULL
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
  INSERT INTO tenant_subscriptions (tenant_id, plan_id, status, max_outlets_override, max_staff_override, max_products_override, updated_at)
  SELECT p_tenant_id, COALESCE(ts.plan_id, 'free'), COALESCE(ts.status, 'active'), p_max_outlets, p_max_staff, p_max_products, timezone('utc'::text, now())
  FROM tenants t
  LEFT JOIN tenant_subscriptions ts ON ts.tenant_id = t.tenant_id
  WHERE t.tenant_id = p_tenant_id
  ON CONFLICT (tenant_id) DO UPDATE SET
    max_outlets_override = EXCLUDED.max_outlets_override,
    max_staff_override = EXCLUDED.max_staff_override,
    max_products_override = EXCLUDED.max_products_override,
    updated_at = timezone('utc'::text, now());
  INSERT INTO platform_audit_logs (actor_email, action, target_tenant_id, details)
  VALUES ('superadmin', 'limits_update', p_tenant_id, jsonb_build_object(
    'max_outlets', p_max_outlets,
    'max_staff', p_max_staff,
    'max_products', p_max_products
  ));
END;
$$;

CREATE OR REPLACE FUNCTION platform_apply_plan_preset(
  p_pin text,
  p_tenant_id text,
  p_plan_id text,
  p_apply_modules boolean DEFAULT true
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

  PERFORM platform_update_tenant_plan(p_pin, p_tenant_id, p_plan_id, 'active', NULL);

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

GRANT EXECUTE ON FUNCTION platform_list_tenants(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION platform_update_tenant_modules(text, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION platform_update_tenant_limits(text, text, integer, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION platform_apply_plan_preset(text, text, text, boolean) TO anon, authenticated;
