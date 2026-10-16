-- Return only aggregate community activity to the feed instead of transferring
-- every like, comment, and vote row to every viewer.
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);

CREATE OR REPLACE FUNCTION public.get_community_post_stats(p_post_ids uuid[])
RETURNS TABLE (
  post_id uuid,
  like_count bigint,
  comment_count bigint,
  viewer_liked boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    requested.post_id,
    (SELECT count(*) FROM public.post_likes AS likes WHERE likes.post_id = requested.post_id),
    (SELECT count(*) FROM public.post_comments AS comments WHERE comments.post_id = requested.post_id),
    EXISTS (
      SELECT 1
      FROM public.post_likes AS likes
      WHERE likes.post_id = requested.post_id
        AND likes.user_id = auth.uid()
    )
  FROM unnest(coalesce(p_post_ids, '{}'::uuid[])) AS requested(post_id);
$$;

CREATE OR REPLACE FUNCTION public.get_community_poll_stats(p_post_ids uuid[])
RETURNS TABLE (
  post_id uuid,
  option_id uuid,
  vote_count bigint,
  viewer_voted boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    options.post_id,
    options.id,
    (SELECT count(*) FROM public.poll_votes AS votes WHERE votes.option_id = options.id),
    EXISTS (
      SELECT 1
      FROM public.poll_votes AS votes
      WHERE votes.option_id = options.id
        AND votes.user_id = auth.uid()
    )
  FROM public.poll_options AS options
  WHERE options.post_id = ANY(coalesce(p_post_ids, '{}'::uuid[]));
$$;

REVOKE ALL ON FUNCTION public.get_community_post_stats(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_community_poll_stats(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_community_post_stats(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_poll_stats(uuid[]) TO authenticated;
