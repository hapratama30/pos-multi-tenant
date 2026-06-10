-- Migration 009: SaaS subscription billing + platform admin

CREATE TABLE IF NOT EXISTS subscription_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_monthly numeric DEFAULT 0,
  max_outlets integer DEFAULT 1,
  max_staff integer DEFAULT 5,
  max_products integer DEFAULT 500,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO subscription_plans (id, name, price_monthly, max_outlets, max_staff, max_products, features)
VALUES
  ('free', 'Free', 0, 1, 3, 100, '["pos","history","catalog"]'::jsonb),
  ('pro', 'Pro', 99000, 3, 10, 1000, '["pos","history","catalog","reports","stock","xendit"]'::jsonb),
  ('enterprise', 'Enterprise', 299000, 99, 99, 99999, '["all"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  tenant_id text PRIMARY KEY REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  plan_id text REFERENCES subscription_plans(id) DEFAULT 'free',
  status text DEFAULT 'active',
  trial_ends_at timestamptz,
  current_period_start timestamptz DEFAULT timezone('utc'::text, now()),
  current_period_end timestamptz,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_subscriptions_read ON tenant_subscriptions;
CREATE POLICY tenant_subscriptions_read ON tenant_subscriptions
  FOR SELECT TO authenticated
  USING (tenant_id = get_auth_tenant_id());

-- Platform audit log
CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_email text,
  action text NOT NULL,
  target_tenant_id text,
  details jsonb,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;

-- Platform admin can read all tenants (service role only via backend; read-only for platform admins)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspend_reason text;

-- Default subscription for existing tenants
INSERT INTO tenant_subscriptions (tenant_id, plan_id, status)
SELECT tenant_id, 'free', 'active' FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

CREATE OR REPLACE FUNCTION initialize_tenant_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO tenant_subscriptions (tenant_id, plan_id, status)
  VALUES (NEW.tenant_id, 'free', 'active')
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_initialize_tenant_subscription ON tenants;
CREATE TRIGGER tr_initialize_tenant_subscription
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION initialize_tenant_subscription();

-- RPC for platform admin (uses app_secrets platform_admin_pin)
CREATE OR REPLACE FUNCTION is_platform_admin(p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pin text;
BEGIN
  SELECT value INTO v_pin FROM app_secrets WHERE key = 'platform_admin_pin' LIMIT 1;
  IF v_pin IS NULL THEN
    RETURN false;
  END IF;
  RETURN p_pin = v_pin;
END;
$$;

CREATE OR REPLACE FUNCTION platform_list_tenants(p_pin text)
RETURNS TABLE (
  tenant_id text,
  tenant_name text,
  status text,
  plan_id text,
  created_at timestamptz,
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
    t.created_at,
    (SELECT COUNT(*) FROM staff s WHERE s.tenant_id = t.tenant_id),
    (SELECT COUNT(*) FROM transactions tx WHERE tx.tenant_id = t.tenant_id)
  FROM tenants t
  LEFT JOIN tenant_subscriptions ts ON ts.tenant_id = t.tenant_id
  ORDER BY t.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION platform_update_tenant_status(p_pin text, p_tenant_id text, p_status text, p_reason text DEFAULT NULL)
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
    status = p_status,
    suspended_at = CASE WHEN p_status = 'suspended' THEN timezone('utc'::text, now()) ELSE NULL END,
    suspend_reason = p_reason
  WHERE tenant_id = p_tenant_id;
  INSERT INTO platform_audit_logs (actor_email, action, target_tenant_id, details)
  VALUES ('platform-admin', 'tenant_status_change', p_tenant_id, jsonb_build_object('status', p_status, 'reason', p_reason));
END;
$$;
