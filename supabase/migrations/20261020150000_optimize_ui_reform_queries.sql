-- Migration: 20261020150000_optimize_ui_reform_queries.sql
-- Optimizes query performance for UI Reform challenge campaigns and submissions

CREATE INDEX IF NOT EXISTS idx_ui_reform_campaigns_created_at 
ON public.ui_reform_campaigns (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ui_reform_submissions_campaign_id 
ON public.ui_reform_submissions (campaign_id);

CREATE INDEX IF NOT EXISTS idx_ui_reform_submissions_student_id 
ON public.ui_reform_submissions (student_id);

CREATE INDEX IF NOT EXISTS idx_ui_reform_submissions_created_at 
ON public.ui_reform_submissions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ui_reform_submissions_status 
ON public.ui_reform_submissions (status);

-- Optimize RLS policy to use subquery caching for admin checks
DROP POLICY IF EXISTS "Admins can manage ui_reform_campaigns" ON public.ui_reform_campaigns;
CREATE POLICY "Admins can manage ui_reform_campaigns" ON public.ui_reform_campaigns
    FOR ALL TO authenticated USING (
        (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    );

DROP POLICY IF EXISTS "Admins can manage ui_reform_submissions" ON public.ui_reform_submissions;
CREATE POLICY "Admins can manage ui_reform_submissions" ON public.ui_reform_submissions
    FOR ALL TO authenticated USING (
        (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    );
