-- Kolom integrasi Xendit (dipakai frontend + server.mjs)
ALTER TABLE payment_settings
  ADD COLUMN IF NOT EXISTS xendit_merchant_id text,
  ADD COLUMN IF NOT EXISTS xendit_va_status text DEFAULT 'Belum Terdaftar',
  ADD COLUMN IF NOT EXISTS xendit_qris_status text DEFAULT 'Belum Terdaftar';
