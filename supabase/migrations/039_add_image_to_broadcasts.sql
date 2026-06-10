-- Migration 039: Add image, button_text, and button_url columns to broadcast_messages table

ALTER TABLE public.broadcast_messages
ADD COLUMN IF NOT EXISTS image text,
ADD COLUMN IF NOT EXISTS button_text text,
ADD COLUMN IF NOT EXISTS button_url text;
