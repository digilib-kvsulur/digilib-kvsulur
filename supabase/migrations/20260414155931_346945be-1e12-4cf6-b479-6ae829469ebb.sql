
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  target_user_id UUID,
  sent_by UUID NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (get_profile_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can delete notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (get_profile_role(auth.uid()) = 'admin');

CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (
  target_user_id = auth.uid() 
  OR target_user_id IS NULL 
  OR get_profile_role(auth.uid()) = 'admin'
);

CREATE POLICY "Users can mark notifications as read"
ON public.notifications FOR UPDATE
TO authenticated
USING (target_user_id = auth.uid() OR target_user_id IS NULL)
WITH CHECK (target_user_id = auth.uid() OR target_user_id IS NULL);
