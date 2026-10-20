-- Ensure the challenge schema exists on every tenant and make admin RLS role
-- checks independent of profiles table policies.
CREATE TABLE IF NOT EXISTS public.ui_reform_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'UI Reform & App Redesign Challenge',
  description text NOT NULL DEFAULT '',
  theme text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean DEFAULT true,
  status text NOT NULL DEFAULT 'scheduled',
  reward_points integer DEFAULT 150,
  rules text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ui_reform_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.ui_reform_campaigns(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  screen_name text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  problem_statement text NOT NULL DEFAULT '',
  proposed_solution text NOT NULL DEFAULT '',
  mockup_url text,
  status text NOT NULL DEFAULT 'pending',
  admin_feedback text,
  points_awarded integer DEFAULT 0,
  upvotes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ui_reform_campaigns
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'UI Reform & App Redesign Challenge',
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS starts_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ends_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS reward_points integer DEFAULT 150,
  ADD COLUMN IF NOT EXISTS rules text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.ui_reform_submissions
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.ui_reform_campaigns(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS screen_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS problem_statement text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposed_solution text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mockup_url text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_feedback text,
  ADD COLUMN IF NOT EXISTS points_awarded integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS upvotes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION public.ui_reform_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
$$;
REVOKE ALL ON FUNCTION public.ui_reform_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ui_reform_is_admin() TO authenticated, service_role;

ALTER TABLE public.ui_reform_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_reform_submissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ui_reform_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ui_reform_submissions TO authenticated;

DROP POLICY IF EXISTS "Admins can manage ui_reform_campaigns" ON public.ui_reform_campaigns;
CREATE POLICY "Admins can manage ui_reform_campaigns" ON public.ui_reform_campaigns
  FOR ALL TO authenticated USING (public.ui_reform_is_admin())
  WITH CHECK (public.ui_reform_is_admin());
DROP POLICY IF EXISTS "All authenticated users can view ui_reform_campaigns" ON public.ui_reform_campaigns;
CREATE POLICY "All authenticated users can view ui_reform_campaigns" ON public.ui_reform_campaigns
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage ui_reform_submissions" ON public.ui_reform_submissions;
CREATE POLICY "Admins can manage ui_reform_submissions" ON public.ui_reform_submissions
  FOR ALL TO authenticated USING (public.ui_reform_is_admin())
  WITH CHECK (public.ui_reform_is_admin());
DROP POLICY IF EXISTS "Students can view own or reviewed submissions" ON public.ui_reform_submissions;
CREATE POLICY "Students can view own or reviewed submissions" ON public.ui_reform_submissions
  FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()) OR status IN ('shortlisted', 'winner', 'implemented', 'reviewed'));
DROP POLICY IF EXISTS "Students can submit ui_reform_submissions" ON public.ui_reform_submissions;
CREATE POLICY "Students can submit ui_reform_submissions" ON public.ui_reform_submissions
  FOR INSERT TO authenticated WITH CHECK (student_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "Students can update own pending submissions" ON public.ui_reform_submissions;
CREATE POLICY "Students can update own pending submissions" ON public.ui_reform_submissions
  FOR UPDATE TO authenticated USING (student_id = (SELECT auth.uid()) AND status = 'pending')
  WITH CHECK (student_id = (SELECT auth.uid()) AND status = 'pending');

CREATE INDEX IF NOT EXISTS idx_ui_reform_campaigns_created_at ON public.ui_reform_campaigns (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ui_reform_submissions_campaign_id ON public.ui_reform_submissions (campaign_id);
CREATE INDEX IF NOT EXISTS idx_ui_reform_submissions_student_id ON public.ui_reform_submissions (student_id);
CREATE INDEX IF NOT EXISTS idx_ui_reform_submissions_created_at ON public.ui_reform_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ui_reform_submissions_status ON public.ui_reform_submissions (status);
