-- Migration 026: Platform Global Settings (Feature Toggles)

CREATE TABLE IF NOT EXISTS public.platform_settings (
    id integer primary key CHECK (id = 1), -- Ensure single row
    feature_flags jsonb not null default '{"deposit_qris_enabled": true, "deposit_transfer_enabled": true, "pos_split_payment_enabled": true}',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default row if not exists
INSERT INTO public.platform_settings (id, feature_flags)
VALUES (1, '{"deposit_qris_enabled": true, "deposit_transfer_enabled": true, "pos_split_payment_enabled": true}')
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow public to read feature flags (so frontend can hide/show UI easily)
CREATE POLICY "Public read platform settings" ON public.platform_settings FOR SELECT USING (true);

-- Allow Service Role full access
CREATE POLICY "Service Role full access on platform_settings" ON public.platform_settings USING (true) WITH CHECK (true);
