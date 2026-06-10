
-- Fix to automatically sync enabled_modules when plan_id changes
CREATE OR REPLACE FUNCTION sync_tenant_modules_on_plan_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_features jsonb;
BEGIN
  -- Get features from the new plan
  SELECT features INTO v_features FROM subscription_plans WHERE id = NEW.plan_id;
  
  IF v_features IS NOT NULL THEN
    UPDATE tenants 
    SET enabled_modules = v_features
    WHERE tenant_id = NEW.tenant_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_tenant_modules ON tenant_subscriptions;
CREATE TRIGGER tr_sync_tenant_modules
  AFTER INSERT OR UPDATE OF plan_id ON tenant_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_tenant_modules_on_plan_change();

-- Sync existing tenants
UPDATE tenants t
SET enabled_modules = sp.features
FROM tenant_subscriptions ts
JOIN subscription_plans sp ON sp.id = ts.plan_id
WHERE t.tenant_id = ts.tenant_id;
