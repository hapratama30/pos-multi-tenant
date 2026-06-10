-- Fix login: case-insensitive email lookup + staff self-read policy (tanpa auth_user_id)

UPDATE staff SET email = lower(trim(email)) WHERE email IS NOT NULL;

CREATE OR REPLACE FUNCTION get_auth_tenant_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id text;
BEGIN
  v_tenant_id := auth.jwt() -> 'user_metadata' ->> 'tenant_id';

  IF v_tenant_id IS NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM staff
    WHERE lower(email) = lower(auth.jwt() ->> 'email')
    LIMIT 1;
  END IF;

  RETURN v_tenant_id;
END;
$$;

DROP POLICY IF EXISTS staff_select ON staff;
CREATE POLICY staff_select ON staff
  FOR SELECT TO authenticated
  USING (
    tenant_id = get_auth_tenant_id()
    OR lower(email) = lower(auth.jwt() ->> 'email')
  );
