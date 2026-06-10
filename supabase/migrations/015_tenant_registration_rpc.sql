-- Migration 015: Pendaftaran tenant baru (bypass RLS via SECURITY DEFINER)
-- Jalankan setelah migration 014

-- Cek email tersedia (boleh dipanggil anon saat form daftar)
CREATE OR REPLACE FUNCTION check_registration_email(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) < 5 THEN
    RETURN false;
  END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM staff WHERE lower(trim(email)) = lower(trim(p_email))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_registration_email(text) TO anon, authenticated;

-- Selesaikan pendaftaran setelah auth.signUp (user sudah authenticated)
CREATE OR REPLACE FUNCTION complete_tenant_registration(
  p_tenant_name text,
  p_phone text,
  p_owner_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_email text;
  v_tenant_id text;
  v_name text;
  v_phone text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_email := lower(trim(auth.jwt() ->> 'email'));
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'email_not_in_token';
  END IF;

  IF EXISTS (SELECT 1 FROM staff WHERE lower(trim(email)) = v_email) THEN
    RAISE EXCEPTION 'email_already_registered';
  END IF;

  v_name := trim(p_owner_name);
  v_phone := trim(p_phone);
  IF v_name IS NULL OR length(v_name) < 2 THEN
    RAISE EXCEPTION 'owner_name_required';
  END IF;
  IF p_tenant_name IS NULL OR length(trim(p_tenant_name)) < 2 THEN
    RAISE EXCEPTION 'tenant_name_required';
  END IF;
  IF v_phone IS NULL OR length(regexp_replace(v_phone, '\D', '', 'g')) < 10 THEN
    RAISE EXCEPTION 'phone_required';
  END IF;

  -- Format ID tenant (unik)
  v_tenant_id := 'T' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  INSERT INTO tenants (tenant_id, tenant_name, phone, status)
  VALUES (v_tenant_id, trim(p_tenant_name), v_phone, 'active');

  -- Triggers: settings, outlet, subscription otomatis dari migration 004/008/009

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff' AND column_name = 'auth_user_id'
  ) THEN
    INSERT INTO staff (tenant_id, auth_user_id, name, email, phone, role, status)
    VALUES (v_tenant_id, v_uid, v_name, v_email, v_phone, 'Owner', 'Aktif');
  ELSE
    INSERT INTO staff (tenant_id, name, email, phone, role, status)
    VALUES (v_tenant_id, v_name, v_email, v_phone, 'Owner', 'Aktif');
  END IF;

  RETURN jsonb_build_object(
    'tenant_id', v_tenant_id,
    'tenant_name', trim(p_tenant_name),
    'owner_email', v_email
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'email_already_registered';
END;
$$;

GRANT EXECUTE ON FUNCTION complete_tenant_registration(text, text, text) TO authenticated;
