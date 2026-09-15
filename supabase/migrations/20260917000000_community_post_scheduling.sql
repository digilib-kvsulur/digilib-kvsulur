-- ============================================================================
-- COMMUNITY POST SCHEDULING SYSTEM
-- Enables authors and administrators to schedule posts, doubts, stories, polls
-- for future automated release.
-- ============================================================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_scheduled_for
  ON public.posts(scheduled_for);

-- Update RLS SELECT policy so future scheduled posts are hidden from general feed
-- until scheduled_for arrives, but always visible to the author and staff/admins.
DROP POLICY IF EXISTS "Anyone view posts" ON public.posts;
CREATE POLICY "Anyone view posts"
ON public.posts FOR SELECT TO authenticated
USING (
  scheduled_for IS NULL
  OR scheduled_for <= now()
  OR user_id = auth.uid()
  OR public.is_staff_or_admin(auth.uid())
);
