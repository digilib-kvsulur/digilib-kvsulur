
-- BADGES catalog
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT DEFAULT 'Award',
  color TEXT DEFAULT 'text-primary',
  points INTEGER NOT NULL DEFAULT 0,
  criteria_type TEXT,  -- 'points','books_read','quizzes_completed','login_streak','manual'
  criteria_value INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view badges" ON public.badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage badges" ON public.badges FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- BADGE AWARDS
CREATE TABLE public.badge_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_by UUID,
  award_type TEXT NOT NULL DEFAULT 'auto', -- 'auto' | 'manual'
  note TEXT,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
GRANT SELECT, INSERT, DELETE ON public.badge_awards TO authenticated;
GRANT ALL ON public.badge_awards TO service_role;
ALTER TABLE public.badge_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view badge awards" ON public.badge_awards FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff award badges" ON public.badge_awards FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
CREATE POLICY "staff remove badges" ON public.badge_awards FOR DELETE TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

-- FRIENDSHIPS (mutual follow)
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  addressee_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending','accepted','rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (requester_id <> addressee_id),
  UNIQUE (requester_id, addressee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own friendships" ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "send friend request" ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id AND status = 'pending');
CREATE POLICY "respond to request" ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id OR auth.uid() = requester_id)
  WITH CHECK (auth.uid() = addressee_id OR auth.uid() = requester_id);
CREATE POLICY "remove own friendship" ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Seed a few default badges (safe if none exist)
INSERT INTO public.badges (name, description, icon_name, color, points, criteria_type, criteria_value) VALUES
  ('First Steps', 'Log in to the library for the first time', 'Sparkles', 'text-blue-500', 10, 'login_streak', 1),
  ('Bookworm', 'Read 5 books', 'BookOpen', 'text-green-600', 50, 'books_read', 5),
  ('Quiz Master', 'Complete 10 quizzes', 'Brain', 'text-purple-600', 75, 'quizzes_completed', 10),
  ('Streak Star', 'Maintain a 7 day login streak', 'Flame', 'text-orange-500', 100, 'login_streak', 7),
  ('Century Club', 'Earn 100 points', 'Trophy', 'text-yellow-500', 25, 'points', 100)
ON CONFLICT DO NOTHING;

-- Trigger to keep updated_at fresh
CREATE TRIGGER trg_badges_updated_at BEFORE UPDATE ON public.badges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_friendships_updated_at BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
