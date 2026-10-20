-- Match the admin's campaign filter and newest-first order in one index.
CREATE INDEX IF NOT EXISTS idx_ui_reform_submissions_campaign_created_at
  ON public.ui_reform_submissions (campaign_id, created_at DESC, id DESC);

-- Keep planner estimates current after the schema repair may have backfilled rows.
ANALYZE public.ui_reform_submissions;
