-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Assigned students can report bugs" ON bug_reports;

-- Create a new policy that allows any authenticated user to report bugs if there is an active campaign
CREATE POLICY "Any student can report bugs during active campaign" ON bug_reports 
    FOR INSERT TO authenticated WITH CHECK (
        reporter_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM bug_bounty_campaigns 
            WHERE id = campaign_id AND is_active = true AND ends_at > now()
        )
    );
