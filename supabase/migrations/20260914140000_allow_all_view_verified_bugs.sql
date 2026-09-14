-- Migration: Allow all authenticated users to read verified bug reports and campaigns for Bug Bounty Leaderboard and Hall of Fame
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_bounty_campaigns ENABLE ROW LEVEL SECURITY;

-- 1. Campaigns Policy: Allow all authenticated users to view campaigns (active or past for history/hall of fame)
DROP POLICY IF EXISTS "All authenticated users can view active campaigns" ON public.bug_bounty_campaigns;
DROP POLICY IF EXISTS "All authenticated users can view campaigns" ON public.bug_bounty_campaigns;

CREATE POLICY "All authenticated users can view campaigns" ON public.bug_bounty_campaigns
    FOR SELECT TO authenticated
    USING (true);

-- 2. Bug Reports Policy: Allow all authenticated users to view verified/accepted bug reports AND their own reports
DROP POLICY IF EXISTS "Students can view their own reports" ON public.bug_reports;
DROP POLICY IF EXISTS "Users can view own or verified reports" ON public.bug_reports;
DROP POLICY IF EXISTS "Anyone can view verified bug reports" ON public.bug_reports;

CREATE POLICY "Users can view own or verified reports" ON public.bug_reports
    FOR SELECT TO authenticated
    USING (
        reporter_id = auth.uid()
        OR status = 'verified'
        OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );
