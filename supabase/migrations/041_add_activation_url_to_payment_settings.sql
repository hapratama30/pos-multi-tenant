-- Migration 041: Add xendit_activation_url column to payment_settings
ALTER TABLE payment_settings
  ADD COLUMN IF NOT EXISTS xendit_activation_url text;
