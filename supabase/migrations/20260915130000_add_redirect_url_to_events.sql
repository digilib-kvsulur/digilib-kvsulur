-- Migration: Add redirect_url column to library_events table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

ALTER TABLE public.library_events
ADD COLUMN IF NOT EXISTS redirect_url text;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
