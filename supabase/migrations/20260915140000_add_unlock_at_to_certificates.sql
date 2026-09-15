-- Migration: Add unlock_at column to issued_certificates for scheduled release
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

ALTER TABLE public.issued_certificates
ADD COLUMN IF NOT EXISTS unlock_at timestamp with time zone DEFAULT NULL;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
