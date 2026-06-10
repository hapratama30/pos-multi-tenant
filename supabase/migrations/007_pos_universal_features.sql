-- Migration 007: PPN/tax, void/refund, split payment, shifts, held carts, product stock

-- Tax settings on tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tax_enabled boolean DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 11;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tax_inclusive boolean DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS invoice_prefix text DEFAULT 'INV';

-- Product sellable stock
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_qty numeric DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_stock boolean DEFAULT false;

-- Transaction enhancements
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS subtotal numeric;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS split_payments jsonb DEFAULT '[]'::jsonb;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS shift_id bigint;

-- Invoice sequence per tenant
CREATE TABLE IF NOT EXISTS tenant_invoice_sequences (
  tenant_id text PRIMARY KEY,
  last_number bigint DEFAULT 0
);

CREATE OR REPLACE FUNCTION next_invoice_number(p_tenant_id text, p_prefix text DEFAULT 'INV')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_num bigint;
BEGIN
  INSERT INTO tenant_invoice_sequences (tenant_id, last_number)
  VALUES (p_tenant_id, 1)
  ON CONFLICT (tenant_id) DO UPDATE SET last_number = tenant_invoice_sequences.last_number + 1
  RETURNING last_number INTO v_num;
  RETURN p_prefix || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(v_num::text, 4, '0');
END;
$$;

-- Cash shifts
CREATE TABLE IF NOT EXISTS cash_shifts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id text NOT NULL,
  staff_id bigint,
  cashier_name text,
  opening_balance numeric DEFAULT 0,
  closing_balance numeric,
  expected_balance numeric,
  difference numeric,
  status text DEFAULT 'open',
  opened_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  closed_at timestamptz,
  notes text
);

ALTER TABLE cash_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cash_shifts_isolation ON cash_shifts;
CREATE POLICY cash_shifts_isolation ON cash_shifts
  FOR ALL TO authenticated
  USING (tenant_id = get_auth_tenant_id())
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- Held carts (persist hold)
CREATE TABLE IF NOT EXISTS held_carts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id text NOT NULL,
  staff_id bigint,
  label text DEFAULT 'Hold',
  cart_data jsonb NOT NULL,
  customer_data jsonb,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE held_carts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS held_carts_isolation ON held_carts;
CREATE POLICY held_carts_isolation ON held_carts
  FOR ALL TO authenticated
  USING (tenant_id = get_auth_tenant_id())
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- Stock deduction on checkout
CREATE OR REPLACE FUNCTION deduct_product_stock(p_tenant_id text, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  pid bigint;
  qty numeric;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    pid := (item->>'id')::bigint;
    qty := COALESCE((item->>'qty')::numeric, 1);
    UPDATE products
    SET stock_qty = GREATEST(0, COALESCE(stock_qty, 0) - qty)
    WHERE id = pid AND tenant_id = p_tenant_id AND track_stock = true;
  END LOOP;
END;
$$;
