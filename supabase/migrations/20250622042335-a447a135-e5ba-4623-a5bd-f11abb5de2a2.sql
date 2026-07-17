
-- Create book_requests table for handling student book requests
CREATE TABLE public.book_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id),
  user_id UUID NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.book_requests ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own requests
CREATE POLICY "Users can view their own book requests"
  ON public.book_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for users to create their own requests
CREATE POLICY "Users can create book requests"
  ON public.book_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for admins to view all requests
CREATE POLICY "Admins can view all book requests"
  ON public.book_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy for admins to update requests
CREATE POLICY "Admins can update book requests"
  ON public.book_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
