-- Add comment_id to community_reports to support reporting post replies/comments
ALTER TABLE public.community_reports ADD COLUMN IF NOT EXISTS comment_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE;

-- Ensure RLS allows inserting comment_id
DROP POLICY IF EXISTS "Users can report posts" ON public.community_reports;
DROP POLICY IF EXISTS "Users can report content" ON public.community_reports;

CREATE POLICY "Users can report content" ON public.community_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
