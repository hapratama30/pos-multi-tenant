-- Migration: Pembuatan tabel printer_settings, migrasi data printer/WA, dan rename settings ke payment_settings

-- 1. Buat tabel printer_settings
CREATE TABLE IF NOT EXISTS printer_settings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id text NOT NULL,
  printer_size text DEFAULT '58mm',
  receipt_header text,
  receipt_footer text,
  thank_you_text text DEFAULT 'Terima kasih atas kunjungan Anda',
  store_logo_url text,
  store_name text,
  store_address text,
  store_phone text,
  show_logo boolean DEFAULT true,
  show_qty boolean DEFAULT true,
  show_subtotal boolean DEFAULT true,
  show_catatan boolean DEFAULT true,
  show_kasir boolean DEFAULT true,
  separator_style text DEFAULT 'dash',
  wa_greeting text,
  wa_greeting_cust text,
  wa_closing text,
  wa_closing_store text,
  wa_show_estimasi boolean DEFAULT true,
  wa_show_kasir boolean DEFAULT true,
  wa_show_item_detail boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Pastikan tenant_id memiliki constraint UNIQUE di printer_settings untuk mendukung UPSERT (ON CONFLICT)
ALTER TABLE printer_settings DROP CONSTRAINT IF EXISTS printer_settings_tenant_id_key;
ALTER TABLE printer_settings ADD CONSTRAINT printer_settings_tenant_id_key UNIQUE (tenant_id);

-- 2. Salin data printer & WA yang sudah ada dari tabel settings ke printer_settings (Hanya jika kolom tersebut ada di tabel settings)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'settings' 
      AND column_name = 'printer_size'
  ) THEN
    INSERT INTO printer_settings (
      tenant_id, printer_size, receipt_header, receipt_footer, thank_you_text,
      store_logo_url, store_name, store_address, store_phone, show_logo,
      show_qty, show_subtotal, show_catatan, show_kasir, separator_style,
      wa_greeting, wa_greeting_cust, wa_closing, wa_closing_store,
      wa_show_estimasi, wa_show_kasir, wa_show_item_detail
    )
    SELECT
      tenant_id, printer_size, receipt_header, receipt_footer, thank_you_text,
      store_logo_url, store_name, store_address, store_phone, show_logo,
      show_qty, show_subtotal, show_catatan, show_kasir, separator_style,
      wa_greeting, wa_greeting_cust, wa_closing, wa_closing_store,
      wa_show_estimasi, wa_show_kasir, wa_show_item_detail
    FROM settings
    ON CONFLICT (tenant_id) DO NOTHING;
  END IF;
END $$;

-- 3. Ganti nama tabel settings menjadi payment_settings (Hanya jika tabel settings ada)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'settings'
  ) THEN
    ALTER TABLE settings RENAME TO payment_settings;
  END IF;
END $$;

-- Ganti nama constraint UNIQUE tenant_id dari settings_tenant_id_key menjadi payment_settings_tenant_id_key (jika constraint lama ada)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE table_schema = 'public'
      AND table_name = 'payment_settings'
      AND constraint_name = 'settings_tenant_id_key'
  ) THEN
    ALTER TABLE payment_settings RENAME CONSTRAINT settings_tenant_id_key TO payment_settings_tenant_id_key;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'payment_settings'
      AND constraint_name = 'payment_settings_tenant_id_key'
  ) THEN
    ALTER TABLE payment_settings ADD CONSTRAINT payment_settings_tenant_id_key UNIQUE (tenant_id);
  END IF;
END $$;

-- 4. Hapus kolom-kolom printer & WA lama dari tabel payment_settings agar bersih
ALTER TABLE payment_settings DROP COLUMN IF EXISTS printer_size;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS receipt_header;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS receipt_footer;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS thank_you_text;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS store_logo_url;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS store_name;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS store_address;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS store_phone;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS show_logo;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS show_qty;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS show_subtotal;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS show_catatan;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS show_kasir;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS separator_style;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS wa_greeting;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS wa_greeting_cust;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS wa_closing;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS wa_closing_store;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS wa_show_estimasi;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS wa_show_kasir;
ALTER TABLE payment_settings DROP COLUMN IF EXISTS wa_show_item_detail;

-- Hapus kolom wa_template lama jika masih tersisa
ALTER TABLE payment_settings DROP COLUMN IF EXISTS wa_template;

-- 5. Aktifkan Row Level Security (RLS) di kedua tabel
ALTER TABLE printer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- 6. Buat policy RLS untuk printer_settings
DROP POLICY IF EXISTS printer_settings_all ON printer_settings;
CREATE POLICY printer_settings_all ON printer_settings
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 7. Buat policy RLS untuk payment_settings
DROP POLICY IF EXISTS payment_settings_all ON payment_settings;
CREATE POLICY payment_settings_all ON payment_settings
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
