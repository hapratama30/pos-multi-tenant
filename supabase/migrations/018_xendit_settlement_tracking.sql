-- Migration 018: Lacak Status Pencairan (Settlement) QRIS & VA Xendit
-- Jalankan di Supabase SQL Editor

-- 1. Tambah kolom settlement_status & settled_at pada tabel transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS settlement_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS settled_at timestamp with time zone;

-- 2. Buat indeks untuk mempercepat kueri filter pencairan
CREATE INDEX IF NOT EXISTS transactions_settlement_idx
  ON transactions(tenant_id, payment_method, settlement_status);
