CREATE TABLE public.game_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_key text NOT NULL,
  kind text NOT NULL DEFAULT 'word',
  value text NOT NULL,
  hint text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX game_content_game_key_idx ON public.game_content (game_key, is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_content TO authenticated;
GRANT ALL ON public.game_content TO service_role;

ALTER TABLE public.game_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active game content"
ON public.game_content FOR SELECT TO authenticated
USING (is_active = true OR public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff manage game content insert"
ON public.game_content FOR INSERT TO authenticated
WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff manage game content update"
ON public.game_content FOR UPDATE TO authenticated
USING (public.is_staff_or_admin(auth.uid()))
WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff manage game content delete"
ON public.game_content FOR DELETE TO authenticated
USING (public.is_staff_or_admin(auth.uid()));

CREATE TRIGGER trg_game_content_updated
BEFORE UPDATE ON public.game_content
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();