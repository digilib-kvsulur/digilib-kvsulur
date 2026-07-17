-- Modify book_requests table to allow null book_id for purchase requests
ALTER TABLE public.book_requests 
ALTER COLUMN book_id DROP NOT NULL;

-- Add additional columns to store book information directly in requests
ALTER TABLE public.book_requests 
ADD COLUMN IF NOT EXISTS requested_title TEXT,
ADD COLUMN IF NOT EXISTS requested_author TEXT,
ADD COLUMN IF NOT EXISTS requested_isbn TEXT,
ADD COLUMN IF NOT EXISTS requested_description TEXT;