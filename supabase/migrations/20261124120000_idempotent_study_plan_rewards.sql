-- Study plan checkboxes are client-controlled, so reward claims must be bounded
-- and idempotent in the database. Quiz rewards remain owned by the quiz flow.
CREATE TABLE IF NOT EXISTS public.study_plan_reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_date date NOT NULL DEFAULT (timezone('utc', now()))::date,
  task_type text NOT NULL CHECK (task_type IN ('reading', 'study', 'revision', 'write')),
  points integer NOT NULL CHECK (points > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_date, task_type)
);

ALTER TABLE public.study_plan_reward_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS study_plan_reward_claims_read_self ON public.study_plan_reward_claims;
CREATE POLICY study_plan_reward_claims_read_self
  ON public.study_plan_reward_claims FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.study_plan_reward_claims FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.study_plan_reward_claims TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_study_plan_reward(p_task_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role text;
  v_points integer;
  v_claim_id uuid;
  v_plan_date date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND OR v_role <> 'student' THEN
    RAISE EXCEPTION 'Only students can claim study plan rewards' USING errcode = '42501';
  END IF;

  v_points := CASE p_task_type
    WHEN 'reading' THEN 10
    WHEN 'study' THEN 15
    WHEN 'revision' THEN 8
    WHEN 'write' THEN 5
    ELSE NULL
  END;
  IF v_points IS NULL THEN
    RAISE EXCEPTION 'This task type has no study plan reward' USING errcode = '22023';
  END IF;

  INSERT INTO public.study_plan_reward_claims (user_id, plan_date, task_type, points)
  VALUES (v_user_id, v_plan_date, p_task_type, v_points)
  ON CONFLICT (user_id, plan_date, task_type) DO NOTHING
  RETURNING id INTO v_claim_id;

  IF v_claim_id IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'already_claimed', 'points', 0);
  END IF;

  UPDATE public.profiles
     SET points = COALESCE(points, 0) + v_points
   WHERE id = v_user_id;

  RETURN jsonb_build_object('awarded', true, 'points', v_points);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_study_plan_reward(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_study_plan_reward(text) TO authenticated;
