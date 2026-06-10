-- Migration 030: Isolate PPOB Balances, Mutations and Transactions by Outlet/Branch

-- 1. Adjust tenant_balances Table
ALTER TABLE public.tenant_balances DROP CONSTRAINT IF EXISTS tenant_balances_pkey;
ALTER TABLE public.tenant_balances ADD COLUMN IF NOT EXISTS outlet_id bigint;

-- Assign existing NULL outlet_ids to the main outlet
UPDATE public.tenant_balances tb
SET outlet_id = (
    SELECT o.id 
    FROM outlets o 
    WHERE o.tenant_id = tb.tenant_id AND o.is_main = true 
    LIMIT 1
)
WHERE tb.outlet_id IS NULL;

-- Remove rows with NULL outlet_id (if any left without outlets) to enforce NOT NULL constraint
DELETE FROM public.tenant_balances WHERE outlet_id IS NULL;

ALTER TABLE public.tenant_balances ALTER COLUMN outlet_id SET NOT NULL;
ALTER TABLE public.tenant_balances ADD CONSTRAINT tenant_balances_pkey PRIMARY KEY (tenant_id, outlet_id);

-- 2. Adjust balance_mutations Table
ALTER TABLE public.balance_mutations ADD COLUMN IF NOT EXISTS outlet_id bigint;

UPDATE public.balance_mutations bm
SET outlet_id = (
    SELECT o.id 
    FROM outlets o 
    WHERE o.tenant_id = bm.tenant_id AND o.is_main = true 
    LIMIT 1
)
WHERE bm.outlet_id IS NULL;

-- 3. Adjust ppob_transactions Table
ALTER TABLE public.ppob_transactions ADD COLUMN IF NOT EXISTS outlet_id bigint;

UPDATE public.ppob_transactions pt
SET outlet_id = (
    SELECT o.id 
    FROM outlets o 
    WHERE o.tenant_id = pt.tenant_id AND o.is_main = true 
    LIMIT 1
)
WHERE pt.outlet_id IS NULL;

-- 3a. Adjust manual_deposit_requests Table
ALTER TABLE public.manual_deposit_requests ADD COLUMN IF NOT EXISTS outlet_id bigint;

UPDATE public.manual_deposit_requests md
SET outlet_id = (
    SELECT o.id 
    FROM outlets o 
    WHERE o.tenant_id = md.tenant_id AND o.is_main = true 
    LIMIT 1
)
WHERE md.outlet_id IS NULL;

-- 4. Trigger to auto-create balance for new outlets
CREATE OR REPLACE FUNCTION public.create_outlet_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.tenant_balances (tenant_id, outlet_id, balance)
    VALUES (NEW.tenant_id, NEW.id, 0)
    ON CONFLICT (tenant_id, outlet_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_create_outlet_balance ON public.outlets;
CREATE TRIGGER tr_create_outlet_balance
    AFTER INSERT ON public.outlets
    FOR EACH ROW
    EXECUTE FUNCTION public.create_outlet_balance();

-- Create balance rows for all existing outlets
INSERT INTO public.tenant_balances (tenant_id, outlet_id, balance)
SELECT tenant_id, id, 0 
FROM public.outlets
ON CONFLICT (tenant_id, outlet_id) DO NOTHING;

-- 5. Update deduct_tenant_balance function
CREATE OR REPLACE FUNCTION deduct_tenant_balance(
    p_tenant_id text,
    p_outlet_id bigint,
    p_amount numeric,
    p_description text,
    p_ref_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance numeric;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;

    SELECT balance INTO v_current_balance
    FROM public.tenant_balances
    WHERE tenant_id = p_tenant_id AND outlet_id = p_outlet_id
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        INSERT INTO public.tenant_balances (tenant_id, outlet_id, balance)
        VALUES (p_tenant_id, p_outlet_id, 0);
        v_current_balance := 0;
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN FALSE;
    END IF;

    UPDATE public.tenant_balances
    SET balance = balance - p_amount,
        updated_at = now()
    WHERE tenant_id = p_tenant_id AND outlet_id = p_outlet_id;

    INSERT INTO public.balance_mutations (tenant_id, outlet_id, amount, balance_after, mutation_type, description, ref_id)
    VALUES (p_tenant_id, p_outlet_id, -p_amount, v_current_balance - p_amount, 'PPOB_PURCHASE', p_description, p_ref_id);

    RETURN TRUE;
END;
$$;

-- 6. Update add_tenant_balance function
CREATE OR REPLACE FUNCTION add_tenant_balance(
    p_tenant_id text,
    p_outlet_id bigint,
    p_amount numeric,
    p_description text,
    p_ref_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance numeric;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;

    SELECT balance INTO v_current_balance
    FROM public.tenant_balances
    WHERE tenant_id = p_tenant_id AND outlet_id = p_outlet_id
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        INSERT INTO public.tenant_balances (tenant_id, outlet_id, balance)
        VALUES (p_tenant_id, p_outlet_id, 0);
        v_current_balance := 0;
    END IF;

    UPDATE public.tenant_balances
    SET balance = balance + p_amount,
        updated_at = now()
    WHERE tenant_id = p_tenant_id AND outlet_id = p_outlet_id;

    INSERT INTO public.balance_mutations (tenant_id, outlet_id, amount, balance_after, mutation_type, description, ref_id)
    VALUES (p_tenant_id, p_outlet_id, p_amount, v_current_balance + p_amount, 'TOPUP', p_description, p_ref_id);

    RETURN TRUE;
END;
$$;

-- 7. Update submit_manual_deposit function
CREATE OR REPLACE FUNCTION submit_manual_deposit(
    p_tenant_id text,
    p_outlet_id bigint,
    p_amount numeric,
    p_proof_image text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.manual_deposit_requests (tenant_id, outlet_id, amount, proof_image, status)
    VALUES (p_tenant_id, p_outlet_id, p_amount, p_proof_image, 'pending');
    RETURN true;
END;
$$;
