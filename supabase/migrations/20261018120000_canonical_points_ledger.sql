-- Keep an exact, low-egress audit trail for every account points balance change.
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid,
  delta integer NOT NULL,
  balance_after integer NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('opening_balance', 'credit', 'debit')),
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS point_transactions_user_created_idx
  ON public.point_transactions (user_id, created_at DESC, id DESC);

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS point_transactions_read_self_or_staff ON public.point_transactions;
CREATE POLICY point_transactions_read_self_or_staff
  ON public.point_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_staff_or_admin(auth.uid()));

REVOKE ALL ON public.point_transactions FROM anon, authenticated;
GRANT SELECT ON public.point_transactions TO authenticated;

-- Take a consistent snapshot for existing balances before recording future changes.
LOCK TABLE public.profiles IN SHARE ROW EXCLUSIVE MODE;

INSERT INTO public.point_transactions (user_id, delta, balance_after, event_type, description)
SELECT
  p.id,
  p.points,
  p.points,
  'opening_balance',
  'Opening balance when point history tracking began'
FROM public.profiles AS p
WHERE COALESCE(p.points, 0) <> 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.point_transactions AS existing
    WHERE existing.user_id = p.id
      AND existing.event_type = 'opening_balance'
  );

CREATE OR REPLACE FUNCTION public.log_profile_points_balance_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_delta := COALESCE(NEW.points, 0);
  ELSE
    v_delta := COALESCE(NEW.points, 0) - COALESCE(OLD.points, 0);
  END IF;

  IF v_delta = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.point_transactions (
    user_id,
    actor_id,
    delta,
    balance_after,
    event_type,
    description
  ) VALUES (
    NEW.id,
    auth.uid(),
    v_delta,
    COALESCE(NEW.points, 0),
    CASE WHEN v_delta > 0 THEN 'credit' ELSE 'debit' END,
    CASE WHEN v_delta > 0 THEN 'Points added to account' ELSE 'Points removed from account' END
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_log_points_insert ON public.profiles;
CREATE TRIGGER profiles_log_points_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_points_balance_change();

DROP TRIGGER IF EXISTS profiles_log_points_update ON public.profiles;
CREATE TRIGGER profiles_log_points_update
  AFTER UPDATE OF points ON public.profiles
  FOR EACH ROW
  WHEN (OLD.points IS DISTINCT FROM NEW.points)
  EXECUTE FUNCTION public.log_profile_points_balance_change();

REVOKE ALL ON FUNCTION public.log_profile_points_balance_change() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_point_history(
  p_user_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user_id uuid;
  v_balance integer;
  v_earned bigint;
  v_deducted bigint;
  v_event_count bigint;
  v_events jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_target_user_id := COALESCE(p_user_id, auth.uid());
  IF v_target_user_id <> auth.uid() AND NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to view this point history';
  END IF;

  SELECT COALESCE(p.points, 0)
  INTO v_balance
  FROM public.profiles AS p
  WHERE p.id = v_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT
    COALESCE(SUM(GREATEST(pt.delta, 0)), 0),
    COALESCE(SUM(GREATEST(-pt.delta, 0)), 0),
    COUNT(*)
  INTO v_earned, v_deducted, v_event_count
  FROM public.point_transactions AS pt
  WHERE pt.user_id = v_target_user_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', page.id,
        'actor_id', page.actor_id,
        'delta', page.delta,
        'balance_after', page.balance_after,
        'event_type', page.event_type,
        'description', page.description,
        'created_at', page.created_at
      ) ORDER BY page.created_at DESC, page.id DESC
    ),
    '[]'::jsonb
  )
  INTO v_events
  FROM (
    SELECT pt.id, pt.actor_id, pt.delta, pt.balance_after, pt.event_type, pt.description, pt.created_at
    FROM public.point_transactions AS pt
    WHERE pt.user_id = v_target_user_id
    ORDER BY pt.created_at DESC, pt.id DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 100))
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  ) AS page;

  RETURN jsonb_build_object(
    'user_id', v_target_user_id,
    'balance', v_balance,
    'earned', v_earned,
    'deducted', v_deducted,
    'event_count', v_event_count,
    'events', v_events
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_point_history(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_point_history(uuid, integer, integer) TO authenticated;
