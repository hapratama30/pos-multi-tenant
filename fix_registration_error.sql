
-- Fix for "no unique or exclusion constraint matching the ON CONFLICT specification"
-- This happens because unique constraints were changed to composite (tenant_id, outlet_id)
-- but trigger functions still use ON CONFLICT (tenant_id).

-- 1. Update initialize_tenant_settings to remove broken ON CONFLICT
-- Actually, we should probably stop initializing settings here and move it to outlet creation
CREATE OR REPLACE FUNCTION initialize_tenant_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- We don't have outlet_id here, so we can't insert into payment_settings/printer_settings
  -- since they now require (tenant_id, outlet_id) uniqueness and likely outlet_id is NOT NULL
  -- or we want them tied to an outlet.
  
  -- For now, let's just make it do nothing to avoid the crash, 
  -- and we will handle initialization in create_main_outlet_for_tenant or via the app.
  RETURN NEW;
END;
$$;

-- 2. Drop the obsolete tenant balance trigger that uses broken ON CONFLICT
-- This trigger was added in migration 017 but is now broken due to migration 030
DROP TRIGGER IF EXISTS tr_create_tenant_balance ON public.tenants;
DROP FUNCTION IF EXISTS public.create_tenant_balance();

-- 3. Update initialize_tenant_subscription to be safe
-- tenant_subscriptions still has tenant_id as PRIMARY KEY, so this is actually OK,
-- but let's make sure it's correct.
CREATE OR REPLACE FUNCTION initialize_tenant_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO tenant_subscriptions (tenant_id, plan_id, status)
  VALUES (NEW.tenant_id, 'free', 'active')
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 4. Move settings initialization to outlet creation
CREATE OR REPLACE FUNCTION create_main_outlet_for_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert the outlet
  -- Use a dummy check to avoid duplicate main outlets if needed, 
  -- but simple INSERT is fine if it's a new tenant.
  -- To make it safe for existing tenants:
  IF NOT EXISTS (SELECT 1 FROM outlets WHERE tenant_id = NEW.tenant_id AND is_main = true) THEN
    INSERT INTO outlets (tenant_id, name, address, phone, is_main, is_active)
    VALUES (NEW.tenant_id, COALESCE(NEW.tenant_name, 'Outlet Utama'), NEW.address, NEW.phone, true, true);
  END IF;
  
  -- Now that we have the outlet (it was just inserted or already existed),
  -- we can initialize settings for it.
  -- We need the ID of the main outlet.
  DECLARE
    v_outlet_id bigint;
  BEGIN
    SELECT id INTO v_outlet_id FROM outlets WHERE tenant_id = NEW.tenant_id AND is_main = true LIMIT 1;
    
    IF v_outlet_id IS NOT NULL THEN
      -- Initialize payment_settings
      INSERT INTO payment_settings (
        tenant_id, outlet_id, payment_cash_enabled, payment_qris_enabled, payment_va_enabled, payment_transfer_enabled, payment_ewallet_enabled
      ) VALUES (
        NEW.tenant_id, v_outlet_id, TRUE, FALSE, FALSE, FALSE, FALSE
      ) ON CONFLICT (tenant_id, outlet_id) DO NOTHING;

      -- Initialize printer_settings
      INSERT INTO printer_settings (
        tenant_id, outlet_id, printer_size, store_name, thank_you_text, show_logo, show_qty, show_subtotal, show_catatan, show_kasir, separator_style
      ) VALUES (
        NEW.tenant_id, v_outlet_id, '58mm', NEW.tenant_name, 'Terima kasih atas kunjungan Anda', TRUE, TRUE, TRUE, TRUE, TRUE, 'dash'
      ) ON CONFLICT (tenant_id, outlet_id) DO NOTHING;
      
      -- Initialize tenant_balances (already handled by tr_create_outlet_balance in migration 030, but let's be safe)
      INSERT INTO tenant_balances (tenant_id, outlet_id, balance)
      VALUES (NEW.tenant_id, v_outlet_id, 0)
      ON CONFLICT (tenant_id, outlet_id) DO NOTHING;
    END IF;
  END;

  RETURN NEW;
END;
$$;

-- Re-apply the trigger to make sure it uses the updated function
DROP TRIGGER IF EXISTS tr_create_main_outlet ON tenants;
CREATE TRIGGER tr_create_main_outlet
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION create_main_outlet_for_tenant();
