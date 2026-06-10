-- Migration: Pengamanan RLS (Row Level Security) Multi-Tenant & Trigger Inisialisasi Data Default

-- 1. Fungsi pembantu untuk mendapatkan tenant_id dari user yang terautentikasi
CREATE OR REPLACE FUNCTION get_auth_tenant_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id text;
BEGIN
  -- Coba ambil dari user_metadata token JWT
  v_tenant_id := auth.jwt() -> 'user_metadata' ->> 'tenant_id';
  
  -- Jika tidak ada di metadata JWT, ambil dari tabel staff berdasarkan email
  IF v_tenant_id IS NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM staff
    WHERE email = auth.jwt() ->> 'email'
    LIMIT 1;
  END IF;
  
  RETURN v_tenant_id;
END;
$$;

-- 2. Fungsi inisialisasi default settings untuk tenant baru (Updated to be safe for multi-outlet)
CREATE OR REPLACE FUNCTION initialize_tenant_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Initialization is now handled in create_main_outlet_for_tenant() 
  -- to ensure we have an outlet_id for the settings.
  RETURN NEW;
END;
$$;

-- Buat trigger setelah insert di tenants
DROP TRIGGER IF EXISTS tr_initialize_tenant_settings ON tenants;
CREATE TRIGGER tr_initialize_tenant_settings
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION initialize_tenant_settings();

-- 3. Sisipkan default settings untuk tenant yang sudah ada agar tidak terjadi data kosong (null)
INSERT INTO payment_settings (tenant_id, payment_cash_enabled, payment_qris_enabled)
SELECT tenant_id, TRUE, FALSE
FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO printer_settings (tenant_id, printer_size, store_name, thank_you_text)
SELECT tenant_id, '58mm', tenant_name, 'Terima kasih atas kunjungan Anda'
FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- 4. Pengaktifan RLS pada tabel-tabel utama
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE duration_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;

-- 5. Kebijakan RLS (Isolasi Tenant Ketat)

-- Tabel tenants
DROP POLICY IF EXISTS tenants_isolation ON tenants;
CREATE POLICY tenants_isolation ON tenants FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id()) WITH CHECK (tenant_id = get_auth_tenant_id());

-- Tabel staff
DROP POLICY IF EXISTS staff_isolation ON staff;
CREATE POLICY staff_isolation ON staff FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id()) WITH CHECK (tenant_id = get_auth_tenant_id());

-- Tabel products
DROP POLICY IF EXISTS products_isolation ON products;
CREATE POLICY products_isolation ON products FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id()) WITH CHECK (tenant_id = get_auth_tenant_id());

-- Tabel transactions
DROP POLICY IF EXISTS transactions_isolation ON transactions;
CREATE POLICY transactions_isolation ON transactions FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id()) WITH CHECK (tenant_id = get_auth_tenant_id());

-- Tabel customers
DROP POLICY IF EXISTS customers_isolation ON customers;
CREATE POLICY customers_isolation ON customers FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id()) WITH CHECK (tenant_id = get_auth_tenant_id());

-- Tabel expenses
DROP POLICY IF EXISTS expenses_isolation ON expenses;
CREATE POLICY expenses_isolation ON expenses FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id()) WITH CHECK (tenant_id = get_auth_tenant_id());

-- Tabel discounts
DROP POLICY IF EXISTS discounts_isolation ON discounts;
CREATE POLICY discounts_isolation ON discounts FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id()) WITH CHECK (tenant_id = get_auth_tenant_id());

-- Tabel stock_items
DROP POLICY IF EXISTS stock_items_isolation ON stock_items;
CREATE POLICY stock_items_isolation ON stock_items FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id()) WITH CHECK (tenant_id = get_auth_tenant_id());

-- Tabel stock_logs
DROP POLICY IF EXISTS stock_logs_isolation ON stock_logs;
CREATE POLICY stock_logs_isolation ON stock_logs FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id()) WITH CHECK (tenant_id = get_auth_tenant_id());

-- Tabel payment_settings
DROP POLICY IF EXISTS payment_settings_isolation ON payment_settings;
CREATE POLICY payment_settings_isolation ON payment_settings FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id()) WITH CHECK (tenant_id = get_auth_tenant_id());

-- Tabel printer_settings
DROP POLICY IF EXISTS printer_settings_isolation ON printer_settings;
CREATE POLICY printer_settings_isolation ON printer_settings FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id()) WITH CHECK (tenant_id = get_auth_tenant_id());

-- Tabel payment_accounts
DROP POLICY IF EXISTS payment_accounts_isolation ON payment_accounts;
CREATE POLICY payment_accounts_isolation ON payment_accounts FOR ALL TO authenticated USING (tenant_id = get_auth_tenant_id()) WITH CHECK (tenant_id = get_auth_tenant_id());

-- 6. Kebijakan RLS Master Data (Melihat Data Global & Data Milik Tenant Sendiri)

-- Tabel product_categories
DROP POLICY IF EXISTS product_categories_isolation ON product_categories;
CREATE POLICY product_categories_isolation ON product_categories
  FOR ALL TO authenticated
  USING (tenant_id IS NULL OR tenant_id = get_auth_tenant_id())
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- Tabel product_units
DROP POLICY IF EXISTS product_units_isolation ON product_units;
CREATE POLICY product_units_isolation ON product_units
  FOR ALL TO authenticated
  USING (tenant_id IS NULL OR tenant_id = get_auth_tenant_id())
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- Tabel duration_units
DROP POLICY IF EXISTS duration_units_isolation ON duration_units;
CREATE POLICY duration_units_isolation ON duration_units
  FOR ALL TO authenticated
  USING (tenant_id IS NULL OR tenant_id = get_auth_tenant_id())
  WITH CHECK (tenant_id = get_auth_tenant_id());
