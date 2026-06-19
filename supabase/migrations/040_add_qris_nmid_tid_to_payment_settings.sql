-- Migration 040: Add qris_nmid and qris_tid columns to payment_settings
ALTER TABLE payment_settings
  ADD COLUMN IF NOT EXISTS qris_nmid text,
  ADD COLUMN IF NOT EXISTS qris_tid text;
