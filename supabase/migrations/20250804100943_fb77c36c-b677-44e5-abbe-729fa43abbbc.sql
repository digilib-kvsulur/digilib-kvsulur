-- Fix the book_issues table foreign key relationships
-- Add proper foreign key constraints to ensure data integrity

-- Add foreign key constraint for book_id in book_issues table
ALTER TABLE public.book_issues 
ADD CONSTRAINT book_issues_book_id_fkey 
FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE SET NULL;

-- Add foreign key constraint for user_id in book_issues table
ALTER TABLE public.book_issues 
ADD CONSTRAINT book_issues_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;