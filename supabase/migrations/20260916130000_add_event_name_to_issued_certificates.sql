-- Migration: Add event_name column to issued_certificates table
ALTER TABLE public.issued_certificates
  ADD COLUMN IF NOT EXISTS event_name text;

