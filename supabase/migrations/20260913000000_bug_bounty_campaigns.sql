-- Create Bug Bounty Campaigns table
CREATE TABLE bug_bounty_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES profiles(id) NOT NULL,
    student_id UUID REFERENCES profiles(id),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Bug Reports table
CREATE TABLE bug_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES bug_bounty_campaigns(id) ON DELETE CASCADE NOT NULL,
    reporter_id UUID REFERENCES profiles(id) NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    rewarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE bug_bounty_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Policies for bug_bounty_campaigns
CREATE POLICY "Admins can manage campaigns" ON bug_bounty_campaigns 
    FOR ALL TO authenticated USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

CREATE POLICY "All authenticated users can view active campaigns" ON bug_bounty_campaigns 
    FOR SELECT TO authenticated USING (is_active = true AND ends_at > now());

-- Policies for bug_reports
CREATE POLICY "Admins can manage reports" ON bug_reports 
    FOR ALL TO authenticated USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

CREATE POLICY "Students can view their own reports" ON bug_reports 
    FOR SELECT TO authenticated USING (reporter_id = auth.uid());

-- Corrected INSERT policy for bug_reports
-- For INSERT policies, the 'USING' clause is for existing rows (which don't exist yet for INSERT).
-- We must use 'WITH CHECK' for INSERT policies to validate the new row.
CREATE POLICY "Assigned students can report bugs" ON bug_reports 
    FOR INSERT TO authenticated WITH CHECK (
        reporter_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM bug_bounty_campaigns 
            WHERE id = campaign_id AND student_id = auth.uid() AND is_active = true AND ends_at > now()
        )
    );
