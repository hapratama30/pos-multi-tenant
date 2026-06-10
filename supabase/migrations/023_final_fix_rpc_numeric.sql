-- FINAL FIX: platform_update_subscription_plan
-- 0. Pastikan kolom-kolom yang diperlukan ada di tabel subscription_plans
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS price_original numeric DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());

-- Menghapus versi lama untuk menghindari konflik signature (ambiguitas parameter)
DROP FUNCTION IF EXISTS platform_update_subscription_plan(text, text, text, numeric, integer, integer, integer, jsonb);
DROP FUNCTION IF EXISTS platform_update_subscription_plan(text, text, text, numeric, numeric, integer, integer, integer, jsonb);

-- Membuat fungsi baru dengan tipe data NUMERIC untuk semua angka agar sinkron dengan JavaScript Number
CREATE OR REPLACE FUNCTION platform_update_subscription_plan(
  p_pin text,
  p_plan_id text,
  p_name text,
  p_price_monthly numeric,
  p_price_original numeric,
  p_max_outlets numeric,
  p_max_staff numeric,
  p_max_products numeric,
  p_features jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Validasi PIN Superadmin
  IF NOT is_platform_admin(p_pin) THEN
    RAISE EXCEPTION 'Unauthorized platform access';
  END IF;

  -- 2. Update data paket
  UPDATE subscription_plans SET
    name = p_name,
    price_monthly = p_price_monthly,
    price_original = p_price_original,
    max_outlets = p_max_outlets::integer,  -- Cast ke integer untuk kolom tabel
    max_staff = p_max_staff::integer,      -- Cast ke integer untuk kolom tabel
    max_products = p_max_products::integer, -- Cast ke integer untuk kolom tabel
    features = p_features,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_plan_id;

  -- 3. Catat log audit
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

-- Berikan izin akses
GRANT EXECUTE ON FUNCTION platform_update_subscription_plan(text, text, text, numeric, numeric, numeric, numeric, numeric, jsonb) TO anon, authenticated;

-- Force refresh cache PostgREST
NOTIFY pgrst, 'reload schema';
COMMENT ON FUNCTION platform_update_subscription_plan IS 'Update subscription plan details by superadmin - Numeric compatible version';
