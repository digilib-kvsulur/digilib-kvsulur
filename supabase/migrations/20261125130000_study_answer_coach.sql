-- Answer-writing coach request log and hourly quota.
-- The table is not readable by clients; the edge function uses the service role
-- for the model call and the authenticated user only touches it through the RPC.

CREATE TABLE IF NOT EXISTS public.study_answer_coach_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS study_answer_coach_requests_user_idx
  ON public.study_answer_coach_requests (user_id, created_at DESC);

ALTER TABLE public.study_answer_coach_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.study_answer_coach_requests FROM anon, authenticated;
GRANT ALL ON public.study_answer_coach_requests TO service_role;

CREATE OR REPLACE FUNCTION public.study_answer_coach_begin_request(p_limit INTEGER DEFAULT 5)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_limit INTEGER := GREATEST(1, LEAST(20, COALESCE(p_limit, 5)));
  v_count INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_user AND role = 'student'
  ) THEN
    RAISE EXCEPTION 'Student access required';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.study_answer_coach_requests
  WHERE user_id = v_user
    AND created_at > now() - interval '1 hour';

  IF v_count >= v_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.study_answer_coach_requests (user_id) VALUES (v_user);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.study_answer_coach_begin_request(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.study_answer_coach_begin_request(INTEGER) TO authenticated;
