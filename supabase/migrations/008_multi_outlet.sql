-- Migration 008: Multi-outlet / multi-cabang

CREATE TABLE IF NOT EXISTS outlets (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id text NOT NULL,
  name text NOT NULL,
  address text,
  phone text,
  is_main boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS outlets_isolation ON outlets;
CREATE POLICY outlets_isolation ON outlets
  FOR ALL TO authenticated
  USING (tenant_id = get_auth_tenant_id())
  WITH CHECK (tenant_id = get_auth_tenant_id());

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS outlet_id bigint;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS outlet_id bigint;
ALTER TABLE held_carts ADD COLUMN IF NOT EXISTS outlet_id bigint;
ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS outlet_id bigint;

-- Auto-create main outlet for existing tenants
INSERT INTO outlets (tenant_id, name, address, phone, is_main, is_active)
SELECT t.tenant_id, COALESCE(t.tenant_name, 'Outlet Utama'), t.address, t.phone, true, true
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM outlets o WHERE o.tenant_id = t.tenant_id AND o.is_main = true
);

CREATE OR REPLACE FUNCTION create_main_outlet_for_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_outlet_id bigint;
BEGIN
  -- 1. Create the main outlet
  INSERT INTO outlets (tenant_id, name, address, phone, is_main, is_active)
  VALUES (NEW.tenant_id, COALESCE(NEW.tenant_name, 'Outlet Utama'), NEW.address, NEW.phone, true, true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_outlet_id;

  -- If insert didn't happen (conflict), get the existing id
  IF v_outlet_id IS NULL THEN
    SELECT id INTO v_outlet_id FROM outlets WHERE tenant_id = NEW.tenant_id AND is_main = true LIMIT 1;
  END IF;

  -- 2. Initialize settings for this outlet
  IF v_outlet_id IS NOT NULL THEN
    -- payment_settings
    INSERT INTO payment_settings (
      tenant_id, outlet_id, payment_cash_enabled, payment_qris_enabled, payment_va_enabled, payment_transfer_enabled, payment_ewallet_enabled
    ) VALUES (
      NEW.tenant_id, v_outlet_id, TRUE, FALSE, FALSE, FALSE, FALSE
    ) ON CONFLICT (tenant_id, outlet_id) DO NOTHING;

    -- printer_settings
    INSERT INTO printer_settings (
      tenant_id, outlet_id, printer_size, store_name, thank_you_text, show_logo, show_qty, show_subtotal, show_catatan, show_kasir, separator_style
    ) VALUES (
      NEW.tenant_id, v_outlet_id, '58mm', NEW.tenant_name, 'Terima kasih atas kunjungan Anda', TRUE, TRUE, TRUE, TRUE, TRUE, 'dash'
    ) ON CONFLICT (tenant_id, outlet_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_create_main_outlet ON tenants;
CREATE TRIGGER tr_create_main_outlet
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION create_main_outlet_for_tenant();
