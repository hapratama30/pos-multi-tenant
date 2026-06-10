-- Migration 025: Isolasi Pengaturan berdasarkan Outlet

-- 1. Tambah outlet_id di tabel pengaturan
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS outlet_id bigint;
ALTER TABLE printer_settings ADD COLUMN IF NOT EXISTS outlet_id bigint;
ALTER TABLE payment_accounts ADD COLUMN IF NOT EXISTS outlet_id bigint;

-- 2. Populate outlet_id dengan main outlet untuk data yang sudah ada
UPDATE payment_settings ps
SET outlet_id = o.id
FROM outlets o
WHERE ps.tenant_id = o.tenant_id AND o.is_main = true AND ps.outlet_id IS NULL;

UPDATE printer_settings pr
SET outlet_id = o.id
FROM outlets o
WHERE pr.tenant_id = o.tenant_id AND o.is_main = true AND pr.outlet_id IS NULL;

UPDATE payment_accounts pa
SET outlet_id = o.id
FROM outlets o
WHERE pa.tenant_id = o.tenant_id AND o.is_main = true AND pa.outlet_id IS NULL;

-- 3. Ubah Unique Constraint di payment_settings
ALTER TABLE payment_settings DROP CONSTRAINT IF EXISTS payment_settings_tenant_id_key;
ALTER TABLE payment_settings DROP CONSTRAINT IF EXISTS payment_settings_tenant_outlet_key;
ALTER TABLE payment_settings ADD CONSTRAINT payment_settings_tenant_outlet_key UNIQUE (tenant_id, outlet_id);

-- 4. Ubah Unique Constraint di printer_settings
ALTER TABLE printer_settings DROP CONSTRAINT IF EXISTS printer_settings_tenant_id_key;
ALTER TABLE printer_settings DROP CONSTRAINT IF EXISTS printer_settings_tenant_outlet_key;
ALTER TABLE printer_settings ADD CONSTRAINT printer_settings_tenant_outlet_key UNIQUE (tenant_id, outlet_id);

-- 5. Tambah kolom pengaturan pajak di tabel outlets
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS tax_enabled boolean DEFAULT false;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 11;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS tax_inclusive boolean DEFAULT false;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS invoice_prefix text DEFAULT 'INV';

-- 6. Migrate existing tenant tax settings to main outlet
UPDATE outlets o
SET 
  tax_enabled = t.tax_enabled,
  tax_rate = t.tax_rate,
  tax_inclusive = t.tax_inclusive,
  invoice_prefix = t.invoice_prefix
FROM tenants t
WHERE o.tenant_id = t.tenant_id AND o.is_main = true;
