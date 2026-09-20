-- Create UI Reform & Redesign Campaigns table
CREATE TABLE IF NOT EXISTS public.ui_reform_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT 'UI Reform & App Redesign Challenge',
    description TEXT NOT NULL DEFAULT 'Share your design concepts, layout ideas, and UX reforms for KV Sulur DLMS. Earn reward points and see your ideas built into the system!',
    theme TEXT NOT NULL DEFAULT 'Reinventing the Student Library Experience',
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended')),
    reward_points INTEGER DEFAULT 150,
    rules TEXT DEFAULT '1. Suggestions must be constructive and feasible.\n2. Include which screen or flow you are improving.\n3. Mockups, sketches, or wireframe links will receive bonus points.\n4. Original ideas only.',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create UI Reform Submissions table
CREATE TABLE IF NOT EXISTS public.ui_reform_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.ui_reform_campaigns(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    screen_name TEXT NOT NULL,
    title TEXT NOT NULL,
    problem_statement TEXT NOT NULL,
    proposed_solution TEXT NOT NULL,
    mockup_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'winner', 'implemented', 'rejected')),
    admin_feedback TEXT,
    points_awarded INTEGER DEFAULT 0,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ui_reform_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_reform_submissions ENABLE ROW LEVEL SECURITY;

-- Campaigns Policies
DROP POLICY IF EXISTS "Admins can manage ui_reform_campaigns" ON public.ui_reform_campaigns;
CREATE POLICY "Admins can manage ui_reform_campaigns" ON public.ui_reform_campaigns
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "All authenticated users can view ui_reform_campaigns" ON public.ui_reform_campaigns;
CREATE POLICY "All authenticated users can view ui_reform_campaigns" ON public.ui_reform_campaigns
    FOR SELECT TO authenticated USING (true);

-- Submissions Policies
DROP POLICY IF EXISTS "Admins can manage ui_reform_submissions" ON public.ui_reform_submissions;
CREATE POLICY "Admins can manage ui_reform_submissions" ON public.ui_reform_submissions
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Students can view own or reviewed submissions" ON public.ui_reform_submissions;
CREATE POLICY "Students can view own or reviewed submissions" ON public.ui_reform_submissions
    FOR SELECT TO authenticated USING (
        student_id = auth.uid() OR status IN ('shortlisted', 'winner', 'implemented', 'reviewed')
    );

DROP POLICY IF EXISTS "Students can submit ui_reform_submissions" ON public.ui_reform_submissions;
CREATE POLICY "Students can submit ui_reform_submissions" ON public.ui_reform_submissions
    FOR INSERT TO authenticated WITH CHECK (
        student_id = auth.uid()
    );

DROP POLICY IF EXISTS "Students can update own pending submissions" ON public.ui_reform_submissions;
CREATE POLICY "Students can update own pending submissions" ON public.ui_reform_submissions
    FOR UPDATE TO authenticated USING (
        student_id = auth.uid() AND status = 'pending'
    );
