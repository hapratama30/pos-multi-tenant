-- Migration 028: Fix Deposit RLS & RPC

-- Create an RPC to safely insert manual deposit requests 
-- bypassing RLS (since backend uses ANON_KEY)
CREATE OR REPLACE FUNCTION submit_manual_deposit(
    p_tenant_id text,
    p_amount numeric,
    p_proof_image text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.manual_deposit_requests (tenant_id, amount, proof_image, status)
    VALUES (p_tenant_id, p_amount, p_proof_image, 'pending');
    RETURN true;
END;
$$;
