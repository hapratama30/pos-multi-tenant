-- Migration 029: Add outlet_id column to master data tables (Categories, Units, Durations)

ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS outlet_id bigint;
ALTER TABLE product_units ADD COLUMN IF NOT EXISTS outlet_id bigint;
ALTER TABLE duration_units ADD COLUMN IF NOT EXISTS outlet_id bigint;
