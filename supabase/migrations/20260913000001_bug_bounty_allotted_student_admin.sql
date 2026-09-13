-- Update bug_reports policy to allow the allotted student of an active campaign to manage reports
-- We need to drop the old admin policy and create a new one that includes the allotted student,
-- or just add a new policy. Multiple policies are additive (OR).

CREATE POLICY "Allotted students can manage reports for their campaign" ON bug_reports
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM bug_bounty_campaigns
            WHERE id = bug_reports.campaign_id
            AND student_id = auth.uid()
            AND is_active = true
            AND ends_at > now()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM bug_bounty_campaigns
            WHERE id = bug_reports.campaign_id
            AND student_id = auth.uid()
            AND is_active = true
            AND ends_at > now()
        )
    );

-- Also ensure they can view campaigns (they can already view active ones, but let's be explicit if needed)
-- Actually "All authenticated users can view active campaigns" already covers it.
