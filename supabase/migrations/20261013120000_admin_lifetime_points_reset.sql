-- Migration: Admin Lifetime Points Reset with High Security and Audit Trail
-- Allows administrators to reset student lifetime points to zero (school-wide, by class, or selected students)
-- Enforces:
-- 1. Must be authenticated with 'admin' role in profiles or super_admins
-- 2. Requires exact confirmation phrase 'RESET LIFETIME POINTS'
-- 3. Requires a minimum 5-character reason for audit trail
-- 4. Automatically zeroes profiles.points and profiles.monthly_points
-- 5. Immutably logs the operation in public.points_reset_audit
-- 6. Optimizes triggers so level-up and badge checks DO NOT run during points resets (avoids statement timeout)

-- ====================================================================
-- 1. CRITICAL PERFORMANCE FIX: PREVENT TRIGGER RUNAWAY ON BULK POINT RESETS
-- ====================================================================
-- Previously, trg_profile_points_badge and notify_level_up fired on ANY update to points.
-- When 500+ student points were reset, check_and_award_badges ran 8+ subqueries PER STUDENT,
-- totaling thousands of heavy relational queries in a single statement, causing statement timeout.
-- These triggers must ONLY fire when points increase (positive delta), never on resets or reductions!

DROP TRIGGER IF EXISTS trg_profile_points_badge ON public.profiles;
CREATE TRIGGER trg_profile_points_badge
  AFTER UPDATE OF points ON public.profiles
  FOR EACH ROW
  WHEN (NEW.points > OLD.points)
  EXECUTE FUNCTION public.tg_check_profile_badges();

DROP TRIGGER IF EXISTS notify_level_up ON public.profiles;
CREATE TRIGGER notify_level_up
  AFTER UPDATE OF points ON public.profiles
  FOR EACH ROW
  WHEN (NEW.points > OLD.points)
  EXECUTE FUNCTION public.tg_notify_level_up();

-- ====================================================================
-- 2. AUDIT TABLE FOR RESET OPERATIONS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.points_reset_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_email text,
  admin_name text,
  scope text NOT NULL CHECK (scope IN ('all_students', 'class', 'selected')),
  target_class text,
  students_affected integer NOT NULL DEFAULT 0,
  total_points_cleared bigint NOT NULL DEFAULT 0,
  reason text NOT NULL,
  notify_students boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.points_reset_audit IS 'Immutable audit log of all lifetime points reset operations executed by administrators.';

CREATE INDEX IF NOT EXISTS idx_points_reset_audit_created_at ON public.points_reset_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_reset_audit_admin ON public.points_reset_audit(admin_id);

ALTER TABLE public.points_reset_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "points_reset_audit_admin_select" ON public.points_reset_audit;
CREATE POLICY "points_reset_audit_admin_select"
  ON public.points_reset_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE auth_uid = auth.uid() AND is_active = true
    )
  );

-- ====================================================================
-- 3. ATOMIC RPC: ADMIN RESET LIFETIME POINTS (HIGH SECURITY + OPTIMIZED)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.admin_reset_lifetime_points(
  p_scope text,
  p_target_class text DEFAULT NULL,
  p_student_ids uuid[] DEFAULT NULL,
  p_confirmation_phrase text DEFAULT '',
  p_reason text DEFAULT '',
  p_notify_students boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '60s'
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_admin_email text;
  v_admin_name text;
  v_students_affected integer := 0;
  v_total_points_cleared bigint := 0;
  v_audit_id uuid;
  v_top_students jsonb;
BEGIN
  -- 0. Set transaction-local statement timeout to 60s to prevent prematurely aborting
  PERFORM set_config('statement_timeout', '60000', true);

  -- 1. Authentication check
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Role authorization check (admin only)
  SELECT email, coalesce(trim(first_name || ' ' || last_name), email)
  INTO v_admin_email, v_admin_name
  FROM public.profiles
  WHERE id = v_admin_id AND role = 'admin';

  IF v_admin_email IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.super_admins WHERE auth_uid = v_admin_id AND is_active = true) THEN
      SELECT email, coalesce(trim(first_name || ' ' || last_name), email)
      INTO v_admin_email, v_admin_name
      FROM public.profiles
      WHERE id = v_admin_id;
    ELSE
      RAISE EXCEPTION 'Forbidden: Only school administrators can perform a points reset.';
    END IF;
  END IF;

  -- 3. Security confirmation phrase check
  IF trim(p_confirmation_phrase) <> 'RESET LIFETIME POINTS' THEN
    RAISE EXCEPTION 'Security verification failed: confirmation phrase must be exactly "RESET LIFETIME POINTS".';
  END IF;

  -- 4. Reason validation
  IF trim(coalesce(p_reason, '')) = '' OR length(trim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A valid reason (minimum 5 characters) is required for the audit log.';
  END IF;

  -- 5. Scope validation
  IF p_scope NOT IN ('all_students', 'class', 'selected') THEN
    RAISE EXCEPTION 'Invalid scope: must be "all_students", "class", or "selected".';
  END IF;

  IF p_scope = 'class' AND (p_target_class IS NULL OR trim(p_target_class) = '') THEN
    RAISE EXCEPTION 'A target class is required when scope is "class".';
  END IF;

  IF p_scope = 'selected' AND (p_student_ids IS NULL OR cardinality(p_student_ids) = 0) THEN
    RAISE EXCEPTION 'At least one student must be selected when scope is "selected".';
  END IF;

  -- 6. Calculate impact and collect top-students snapshot before wipe
  IF p_scope = 'all_students' THEN
    SELECT count(*), coalesce(sum(points), 0)
    INTO v_students_affected, v_total_points_cleared
    FROM public.profiles
    WHERE role = 'student' AND (points > 0 OR monthly_points > 0);

    SELECT jsonb_agg(sub) INTO v_top_students
    FROM (
      SELECT id, first_name, last_name, student_class, points
      FROM public.profiles
      WHERE role = 'student' AND points > 0
      ORDER BY points DESC
      LIMIT 10
    ) sub;

  ELSIF p_scope = 'class' THEN
    SELECT count(*), coalesce(sum(points), 0)
    INTO v_students_affected, v_total_points_cleared
    FROM public.profiles
    WHERE role = 'student' AND student_class = p_target_class AND (points > 0 OR monthly_points > 0);

    SELECT jsonb_agg(sub) INTO v_top_students
    FROM (
      SELECT id, first_name, last_name, student_class, points
      FROM public.profiles
      WHERE role = 'student' AND student_class = p_target_class AND points > 0
      ORDER BY points DESC
      LIMIT 10
    ) sub;

  ELSE -- 'selected'
    SELECT count(*), coalesce(sum(points), 0)
    INTO v_students_affected, v_total_points_cleared
    FROM public.profiles
    WHERE role = 'student' AND id = ANY(p_student_ids) AND (points > 0 OR monthly_points > 0);

    SELECT jsonb_agg(sub) INTO v_top_students
    FROM (
      SELECT id, first_name, last_name, student_class, points
      FROM public.profiles
      WHERE role = 'student' AND id = ANY(p_student_ids) AND points > 0
      ORDER BY points DESC
      LIMIT 10
    ) sub;
  END IF;

  -- 7. Execute reset ONLY on rows that actually have points > 0 to minimize locks & I/O
  IF p_scope = 'all_students' THEN
    UPDATE public.profiles
    SET points = 0, monthly_points = 0, updated_at = now()
    WHERE role = 'student' AND (points > 0 OR monthly_points > 0);

  ELSIF p_scope = 'class' THEN
    UPDATE public.profiles
    SET points = 0, monthly_points = 0, updated_at = now()
    WHERE role = 'student' AND student_class = p_target_class AND (points > 0 OR monthly_points > 0);

  ELSE -- 'selected'
    UPDATE public.profiles
    SET points = 0, monthly_points = 0, updated_at = now()
    WHERE role = 'student' AND id = ANY(p_student_ids) AND (points > 0 OR monthly_points > 0);
  END IF;

  -- 8. Optionally notify affected students (only students who actually had points cleared)
  IF p_notify_students AND v_students_affected > 0 THEN
    IF p_scope = 'all_students' THEN
      INSERT INTO public.notifications (title, message, type, target_user_id, sent_by)
      SELECT 
        'Lifetime Points Reset',
        'Your library lifetime experience points have been reset by the school administrator. Reason: ' || trim(p_reason),
        'points',
        id,
        v_admin_id
      FROM public.profiles
      WHERE role = 'student' AND (points > 0 OR monthly_points > 0);

    ELSIF p_scope = 'class' THEN
      INSERT INTO public.notifications (title, message, type, target_user_id, sent_by)
      SELECT 
        'Lifetime Points Reset',
        'Your library lifetime experience points have been reset by the school administrator. Reason: ' || trim(p_reason),
        'points',
        id,
        v_admin_id
      FROM public.profiles
      WHERE role = 'student' AND student_class = p_target_class AND (points > 0 OR monthly_points > 0);

    ELSE -- 'selected'
      INSERT INTO public.notifications (title, message, type, target_user_id, sent_by)
      SELECT 
        'Lifetime Points Reset',
        'Your library lifetime experience points have been reset by the school administrator. Reason: ' || trim(p_reason),
        'points',
        id,
        v_admin_id
      FROM public.profiles
      WHERE role = 'student' AND id = ANY(p_student_ids);
    END IF;
  END IF;

  -- 9. Record in points_reset_audit
  INSERT INTO public.points_reset_audit (
    admin_id,
    admin_email,
    admin_name,
    scope,
    target_class,
    students_affected,
    total_points_cleared,
    reason,
    notify_students,
    metadata
  ) VALUES (
    v_admin_id,
    v_admin_email,
    v_admin_name,
    p_scope,
    p_target_class,
    v_students_affected,
    v_total_points_cleared,
    trim(p_reason),
    p_notify_students,
    jsonb_build_object(
      'top_students_before_reset', coalesce(v_top_students, '[]'::jsonb),
      'executed_at', now()
    )
  )
  RETURNING id INTO v_audit_id;

  -- 10. Return result
  RETURN jsonb_build_object(
    'success', true,
    'students_affected', v_students_affected,
    'total_points_cleared', v_total_points_cleared,
    'scope', p_scope,
    'target_class', p_target_class,
    'audit_id', v_audit_id
  );
END;
$$;

-- Revoke from public, anon; grant to authenticated
REVOKE ALL ON FUNCTION public.admin_reset_lifetime_points(text, text, uuid[], text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_lifetime_points(text, text, uuid[], text, text, boolean) TO authenticated;

-- ====================================================================
-- 4. RPC: GET POINTS RESET AUDIT LOGS
-- ====================================================================
CREATE OR REPLACE FUNCTION public.get_points_reset_audit(p_limit integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  admin_id uuid,
  admin_email text,
  admin_name text,
  scope text,
  target_class text,
  students_affected integer,
  total_points_cleared bigint,
  reason text,
  notify_students boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pra.id,
    pra.admin_id,
    pra.admin_email,
    pra.admin_name,
    pra.scope,
    pra.target_class,
    pra.students_affected,
    pra.total_points_cleared,
    pra.reason,
    pra.notify_students,
    pra.created_at
  FROM public.points_reset_audit pra
  WHERE EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.super_admins WHERE auth_uid = auth.uid() AND is_active = true
  )
  ORDER BY pra.created_at DESC
  LIMIT coalesce(p_limit, 50);
$$;

REVOKE ALL ON FUNCTION public.get_points_reset_audit(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_points_reset_audit(integer) TO authenticated;
