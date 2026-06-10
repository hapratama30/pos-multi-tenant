-- Migration 038: Add show_as_popup column to broadcast_messages table

ALTER TABLE public.broadcast_messages
ADD COLUMN IF NOT EXISTS show_as_popup boolean DEFAULT false;

-- Re-verify RLS policies (everyone can read)
-- Because show_as_popup is just a boolean, existing SELECT policy using (is_active = true) still applies
