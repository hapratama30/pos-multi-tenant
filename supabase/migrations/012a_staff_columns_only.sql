-- Patch cepat: hanya tambah kolom (jalanin ini DULU jika migration 012 error)
-- Copy-paste ke Supabase SQL Editor → Run

ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS auth_user_id uuid;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS outlet_id bigint;

UPDATE public.staff SET email = lower(trim(email)) WHERE email IS NOT NULL;

-- Cek hasil:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'staff';
