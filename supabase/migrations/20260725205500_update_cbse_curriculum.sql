-- Add class_number and subject columns to cbse_curriculum table to allow filtering
ALTER TABLE public.cbse_curriculum
ADD COLUMN IF NOT EXISTS class_number text DEFAULT 'All',
ADD COLUMN IF NOT EXISTS subject text DEFAULT 'General';
