-- Migration 019: Tambah kolom cashier_name & staff_id pada tabel transactions untuk pencatatan kasir
-- Jalankan di Supabase SQL Editor

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS cashier_name text,
  ADD COLUMN IF NOT EXISTS staff_id bigint;
