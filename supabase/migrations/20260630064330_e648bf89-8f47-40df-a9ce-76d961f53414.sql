
CREATE POLICY "auth can view book covers"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'book-covers');

CREATE POLICY "staff upload book covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'book-covers' AND public.is_staff_or_admin(auth.uid()));

CREATE POLICY "staff update book covers"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'book-covers' AND public.is_staff_or_admin(auth.uid()));

CREATE POLICY "staff delete book covers"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'book-covers' AND public.is_staff_or_admin(auth.uid()));
