-- Migration 010: Vertical business modules (F&B, Laundry, Retail)

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_vertical text DEFAULT 'general';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS enabled_modules jsonb DEFAULT '["general"]'::jsonb;

-- F&B: table management
CREATE TABLE IF NOT EXISTS fnb_tables (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id text NOT NULL,
  outlet_id bigint,
  table_number text NOT NULL,
  capacity integer DEFAULT 4,
  status text DEFAULT 'available',
  current_order_id bigint,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE fnb_tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fnb_tables_isolation ON fnb_tables;
CREATE POLICY fnb_tables_isolation ON fnb_tables
  FOR ALL TO authenticated
  USING (tenant_id = get_auth_tenant_id())
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- Laundry: order pipeline
CREATE TABLE IF NOT EXISTS laundry_orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id text NOT NULL,
  transaction_id bigint,
  tag_code text NOT NULL,
  customer_name text,
  customer_phone text,
  items_description text,
  weight_kg numeric,
  status text DEFAULT 'received',
  received_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  estimated_ready timestamptz,
  completed_at timestamptz,
  notes text
);

ALTER TABLE laundry_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS laundry_orders_isolation ON laundry_orders;
CREATE POLICY laundry_orders_isolation ON laundry_orders
  FOR ALL TO authenticated
  USING (tenant_id = get_auth_tenant_id())
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- Retail: wholesale price tiers on products
ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_price numeric;
ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_min_qty numeric DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS retail_price numeric;

-- Sync retail_price from price for existing products
UPDATE products SET retail_price = price WHERE retail_price IS NULL;
