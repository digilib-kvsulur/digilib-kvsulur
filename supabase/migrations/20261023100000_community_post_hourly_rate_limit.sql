-- Prevent sustained community post flooding across devices and browser sessions.
-- Reaching this pace limit only delays a post; it never adds a moderation warning
-- or suspends the student's account.
CREATE OR REPLACE FUNCTION public.enforce_community_post_hourly_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_recent_posts integer;
BEGIN
  -- Only count posts as they go live. Future scheduled posts do not consume the
  -- hourly allowance until they are published.
  IF NEW.scheduled_for IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.scheduled_for IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.role INTO v_role
  FROM public.profiles AS p
  WHERE p.id = NEW.user_id;

  IF v_role IN ('admin', 'librarian', 'teacher') THEN
    RETURN NEW;
  END IF;

  -- Serialize concurrent submissions for the same student so parallel requests
  -- cannot slip past the count check.
  PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text));

  SELECT count(*)::integer INTO v_recent_posts
  FROM public.posts AS p
  WHERE p.user_id = NEW.user_id
    AND p.scheduled_for IS NULL
    AND p.created_at > now() - interval '1 hour'
    AND (TG_OP <> 'UPDATE' OR p.id <> NEW.id);

  IF v_recent_posts >= 8 THEN
    RAISE EXCEPTION 'COMMUNITY_POST_RATE_LIMIT: You have reached the hourly community posting pace limit.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_community_post_hourly_rate_limit ON public.posts;
CREATE TRIGGER enforce_community_post_hourly_rate_limit
  BEFORE INSERT OR UPDATE OF scheduled_for ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_community_post_hourly_rate_limit();
