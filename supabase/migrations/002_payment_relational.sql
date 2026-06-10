-- Migration: Restrukturisasi tabel settings dan pembuatan tabel payment_accounts secara relasional (non-JSON)

-- 1. Tambahkan kolom boolean untuk channel pembayaran aktif di tabel settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS payment_cash_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS payment_qris_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS payment_va_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS payment_transfer_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS payment_ewallet_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Pastikan tenant_id memiliki constraint UNIQUE untuk mendukung UPSERT (ON CONFLICT)
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_tenant_id_key;
ALTER TABLE settings ADD CONSTRAINT settings_tenant_id_key UNIQUE (tenant_id);

-- Kolom Printer & WhatsApp Settings yang dibutuhkan
ALTER TABLE settings ADD COLUMN IF NOT EXISTS printer_size text DEFAULT '58mm';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_header text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_footer text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS thank_you_text text DEFAULT 'Terima kasih atas kunjungan Anda';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_logo_url text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_name text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_address text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_phone text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_logo boolean DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_qty boolean DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_subtotal boolean DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_catatan boolean DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_kasir boolean DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS separator_style text DEFAULT 'dash';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS wa_greeting text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS wa_greeting_cust text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS wa_closing text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS wa_closing_store text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS wa_show_estimasi boolean DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS wa_show_kasir boolean DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS wa_show_item_detail boolean DEFAULT true;

-- 2. Hapus kolom-kolom JSON lama jika sebelumnya pernah ada
ALTER TABLE settings DROP COLUMN IF EXISTS payment_methods;
ALTER TABLE settings DROP COLUMN IF EXISTS va_numbers;
ALTER TABLE settings DROP COLUMN IF EXISTS transfer_banks;
ALTER TABLE settings DROP COLUMN IF EXISTS ewallet_numbers;

-- 3. Buat tabel payment_accounts untuk menyimpan nomor rekening, VA, dan e-wallet secara relasional
CREATE TABLE IF NOT EXISTS payment_accounts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id text NOT NULL,
  type text NOT NULL, -- 'va', 'transfer', 'ewallet'
  provider text NOT NULL, -- nama Bank (e.g., 'BCA', 'Mandiri') atau e-wallet (e.g., 'GoPay', 'OVO')
  number text NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Aktifkan Row Level Security (RLS) di tabel payment_accounts
ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;

-- 5. Buat policy RLS agar data dapat dibaca/diubah secara aman (atau bebas untuk anon & authenticated dalam development/multi-tenant setup)
DROP POLICY IF EXISTS payment_accounts_all ON payment_accounts;
CREATE POLICY payment_accounts_all ON payment_accounts
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
