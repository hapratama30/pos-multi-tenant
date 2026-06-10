-- Migration 033: Add platform_delete_subscription_plan RPC

CREATE OR REPLACE FUNCTION platform_delete_subscription_plan(
  p_pin text,
  p_plan_id text
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

  -- 2. Cek apakah ada tenant yang menggunakan paket ini
  IF EXISTS (SELECT 1 FROM tenant_subscriptions WHERE plan_id = p_plan_id) THEN
    RAISE EXCEPTION 'Tidak dapat menghapus paket yang masih digunakan oleh tenant';
  END IF;

  -- 3. Hapus data paket
  DELETE FROM subscription_plans WHERE id = p_plan_id;

  -- 4. Catat log audit
  INSERT INTO platform_audit_logs (actor_email, action, details)
  VALUES ('superadmin', 'plan_delete', jsonb_build_object(
    'plan_id', p_plan_id
  ));
END;
$$;

-- Berikan izin akses
GRANT EXECUTE ON FUNCTION platform_delete_subscription_plan(text, text) TO anon, authenticated;

-- Force refresh cache PostgREST
NOTIFY pgrst, 'reload schema';
COMMENT ON FUNCTION platform_delete_subscription_plan IS 'Delete subscription plan by superadmin - restricted if plan is in use';
