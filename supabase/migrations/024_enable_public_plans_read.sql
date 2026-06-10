-- Migration 024: Memungkinkan publik (anon) untuk membaca paket langganan
-- Ini diperlukan agar paket muncul di Landing Page tanpa perlu PIN Superadmin

-- 1. Aktifkan RLS pada tabel subscription_plans
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- 2. Buat policy agar semua orang (termasuk anon) bisa melihat paket yang aktif
DROP POLICY IF EXISTS "Allow public read active plans" ON subscription_plans;
CREATE POLICY "Allow public read active plans" ON subscription_plans
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- 3. Pastikan kolom-kolom baru (price_original) juga bisa diakses
-- (Sudah otomatis bisa diakses jika policy SELECT di atas aktif)

-- 4. Berikan izin akses level tabel ke role anon dan authenticated
GRANT SELECT ON subscription_plans TO anon, authenticated;
