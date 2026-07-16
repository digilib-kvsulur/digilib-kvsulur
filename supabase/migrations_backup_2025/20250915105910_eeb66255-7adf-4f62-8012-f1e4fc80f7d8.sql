-- Fix admin permissions and foreign key issues

-- Create proper foreign key between book_requests and profiles
ALTER TABLE public.book_requests 
ADD CONSTRAINT fk_book_requests_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Allow admins to update all student profiles (for points awarding)
CREATE POLICY "Admins can manage all student profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  get_current_user_role() = 'admin'
);