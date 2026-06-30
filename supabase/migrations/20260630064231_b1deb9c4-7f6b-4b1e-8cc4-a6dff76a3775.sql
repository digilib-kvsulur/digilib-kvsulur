
-- helper
CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _uid AND role IN ('admin','staff','librarian')
  )
$$;

CREATE TABLE public.book_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text,
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_reservations TO authenticated;
GRANT ALL ON public.book_reservations TO service_role;

ALTER TABLE public.book_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students see own reservations"
ON public.book_reservations FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

CREATE POLICY "students create own reservations"
ON public.book_reservations FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "staff update reservations"
ON public.book_reservations FOR UPDATE TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "owner or staff delete"
ON public.book_reservations FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

CREATE TRIGGER trg_book_reservations_updated
BEFORE UPDATE ON public.book_reservations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_book_reservations_book ON public.book_reservations(book_id);
CREATE INDEX idx_book_reservations_user ON public.book_reservations(user_id);
CREATE INDEX idx_book_reservations_status ON public.book_reservations(status);
