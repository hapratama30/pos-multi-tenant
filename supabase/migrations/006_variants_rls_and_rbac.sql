-- Migration 006: Variants RLS, RBAC helpers, staff password cleanup

-- Ensure variants table exists with tenant_id
CREATE TABLE IF NOT EXISTS variants (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id text NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'topping',
  price_modifier numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS variants_isolation ON variants;
CREATE POLICY variants_isolation ON variants
  FOR ALL TO authenticated
  USING (tenant_id = get_auth_tenant_id())
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- RBAC helper functions
CREATE OR REPLACE FUNCTION get_auth_staff_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM staff
  WHERE email = auth.jwt() ->> 'email'
    AND tenant_id = get_auth_tenant_id()
  LIMIT 1;
  RETURN COALESCE(v_role, 'Kasir');
END;
$$;

CREATE OR REPLACE FUNCTION is_staff_admin_or_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN get_auth_staff_role() IN ('Owner', 'Admin');
END;
$$;

-- Kasir cannot delete transactions; only Owner/Admin can
DROP POLICY IF EXISTS transactions_isolation ON transactions;
DROP POLICY IF EXISTS transactions_select ON transactions;
DROP POLICY IF EXISTS transactions_insert ON transactions;
DROP POLICY IF EXISTS transactions_update ON transactions;
DROP POLICY IF EXISTS transactions_delete ON transactions;
CREATE POLICY transactions_select ON transactions
  FOR SELECT TO authenticated
  USING (tenant_id = get_auth_tenant_id());

CREATE POLICY transactions_insert ON transactions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_auth_tenant_id());

CREATE POLICY transactions_update ON transactions
  FOR UPDATE TO authenticated
  USING (tenant_id = get_auth_tenant_id())
  WITH CHECK (tenant_id = get_auth_tenant_id());

CREATE POLICY transactions_delete ON transactions
  FOR DELETE TO authenticated
  USING (tenant_id = get_auth_tenant_id() AND is_staff_admin_or_owner());

-- Staff management restricted to Owner/Admin
DROP POLICY IF EXISTS staff_isolation ON staff;
CREATE POLICY staff_select ON staff
  FOR SELECT TO authenticated
  USING (tenant_id = get_auth_tenant_id());

CREATE POLICY staff_insert ON staff
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_auth_tenant_id() AND is_staff_admin_or_owner());

CREATE POLICY staff_update ON staff
  FOR UPDATE TO authenticated
  USING (tenant_id = get_auth_tenant_id() AND is_staff_admin_or_owner())
  WITH CHECK (tenant_id = get_auth_tenant_id() AND is_staff_admin_or_owner());

CREATE POLICY staff_delete ON staff
  FOR DELETE TO authenticated
  USING (tenant_id = get_auth_tenant_id() AND is_staff_admin_or_owner());

-- Remove plain-text password column if present (auth via Supabase only)
ALTER TABLE staff DROP COLUMN IF EXISTS password;
