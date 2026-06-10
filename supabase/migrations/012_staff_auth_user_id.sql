-- Migration 012: Tambah kolom auth_user_id & outlet_id di staff
-- PENTING: Jalankan SELURUH file ini sekaligus (Ctrl+A → Run) di Supabase SQL Editor.

-- ── 1. Pastikan tabel staff ada ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'staff'
  ) THEN
    RAISE EXCEPTION 'Tabel public.staff tidak ditemukan. Buat schema dasar dulu.';
  END IF;
END $$;

-- ── 2. Tambah kolom (WAJIB sebelum function/policy di bawah) ─────────────────
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS auth_user_id uuid;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS outlet_id bigint;

-- ── 3. Normalisasi email ───────────────────────────────────────────────────
UPDATE public.staff SET email = lower(trim(email)) WHERE email IS NOT NULL;

-- ── 4. Index (hanya jika kolom sudah ada) ────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff' AND column_name = 'auth_user_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS staff_auth_user_id_idx ON public.staff(auth_user_id)';
  END IF;
END $$;

-- ── 5. Function get_auth_tenant_id (dengan fallback auth_user_id) ───────────
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id text;
  v_has_auth_col boolean;
BEGIN
  v_tenant_id := auth.jwt() -> 'user_metadata' ->> 'tenant_id';

  IF v_tenant_id IS NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM public.staff
    WHERE lower(email) = lower(auth.jwt() ->> 'email')
    LIMIT 1;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff' AND column_name = 'auth_user_id'
  ) INTO v_has_auth_col;

  IF v_tenant_id IS NULL AND v_has_auth_col AND auth.uid() IS NOT NULL THEN
    EXECUTE 'SELECT tenant_id FROM public.staff WHERE auth_user_id = $1 LIMIT 1'
      INTO v_tenant_id
      USING auth.uid();
  END IF;

  RETURN v_tenant_id;
END;
$$;

-- ── 6. Policy staff SELECT (email match; auth_user_id hanya jika kolom ada) ───
DROP POLICY IF EXISTS staff_select ON public.staff;
DROP POLICY IF EXISTS staff_isolation ON public.staff;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff' AND column_name = 'auth_user_id'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY staff_select ON public.staff
      FOR SELECT TO authenticated
      USING (
        tenant_id = public.get_auth_tenant_id()
        OR lower(email) = lower(auth.jwt() ->> 'email')
        OR auth_user_id = auth.uid()
      )
    $policy$;
  ELSE
    EXECUTE $policy$
      CREATE POLICY staff_select ON public.staff
      FOR SELECT TO authenticated
      USING (
        tenant_id = public.get_auth_tenant_id()
        OR lower(email) = lower(auth.jwt() ->> 'email')
      )
    $policy$;
  END IF;
END $$;

COMMENT ON COLUMN public.staff.auth_user_id IS 'UUID auth.users — diisi saat register/login';
