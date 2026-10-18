-- Give students three ordinary anti-spam reminders before the first formal
-- moderation warning. The counter is stored server-side, so changing devices
-- or clearing browser storage cannot reset it.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS community_soft_warn_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.record_community_spam_reminder()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_blocked_until timestamptz;
  v_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT p.role, p.community_blocked_until, p.community_soft_warn_count
    INTO v_role, v_blocked_until, v_count
  FROM public.profiles AS p
  WHERE p.id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_role IN ('admin', 'librarian', 'teacher') THEN
    RETURN jsonb_build_object('count', 0, 'formal_warning_due', false, 'blocked', false);
  END IF;

  IF v_blocked_until IS NOT NULL AND v_blocked_until > now() THEN
    RETURN jsonb_build_object('count', COALESCE(v_count, 0), 'formal_warning_due', false, 'blocked', true);
  END IF;

  v_count := COALESCE(v_count, 0) + 1;
  IF v_count >= 3 THEN
    UPDATE public.profiles SET community_soft_warn_count = 0 WHERE id = v_user_id;
    RETURN jsonb_build_object('count', 3, 'formal_warning_due', true, 'blocked', false);
  END IF;

  UPDATE public.profiles SET community_soft_warn_count = v_count WHERE id = v_user_id;
  RETURN jsonb_build_object('count', v_count, 'formal_warning_due', false, 'blocked', false);
END;
$$;

REVOKE ALL ON FUNCTION public.record_community_spam_reminder() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_community_spam_reminder() TO authenticated;
