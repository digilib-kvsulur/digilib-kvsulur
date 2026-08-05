-- Scrap / revoke reading points (suspicious or wrongly approved)

CREATE OR REPLACE FUNCTION public.scrap_reading_entry(p_reading_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_pts integer := 0;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO r FROM public.reading_history WHERE id = p_reading_id;
  IF r IS NULL THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;

  IF r.status = 'rejected' THEN
    RETURN 0;
  END IF;

  -- Deduct points if they were awarded (approved entries)
  IF r.status = 'approved' AND COALESCE(r.points_earned, 0) > 0 THEN
    v_pts := r.points_earned;
    UPDATE public.profiles
    SET points = GREATEST(0, COALESCE(points, 0) - v_pts)
    WHERE id = r.user_id;
  END IF;

  UPDATE public.reading_history
  SET status = 'rejected',
      points_awarded = false
  WHERE id = p_reading_id;

  PERFORM public.notify_user(
    r.user_id,
    'Reading entry discarded',
    format(
      'Your reading entry "%s" was discarded by the librarian%s.',
      COALESCE(r.book_title, ''),
      CASE WHEN v_pts > 0 THEN format(' (−%s points)', v_pts) ELSE '' END
    ),
    'warning'
  );

  RETURN v_pts;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scrap_reading_entry(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.scrap_reading_entry(uuid) TO authenticated;

-- Allow approving suspicious entries (admin override)
CREATE OR REPLACE FUNCTION public.approve_reading_entry(p_reading_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_pts integer;
BEGIN
  IF NOT public.is_staff_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO r FROM public.reading_history WHERE id = p_reading_id;
  IF r IS NULL THEN
    RAISE EXCEPTION 'Entry not found';
  END IF;
  IF r.status = 'approved' THEN
    RETURN 0;
  END IF;
  IF r.status = 'rejected' THEN
    RAISE EXCEPTION 'Cannot approve a rejected entry';
  END IF;

  v_pts := COALESCE(r.points_earned, 0);
  IF v_pts = 0 THEN
    BEGIN
      SELECT COALESCE((value #>> '{}')::integer, (value)::text::integer, 25)
      INTO v_pts
      FROM public.system_settings
      WHERE key = 'points_per_book_read';
    EXCEPTION WHEN OTHERS THEN
      v_pts := 25;
    END;
    v_pts := COALESCE(v_pts, 25);
  END IF;

  UPDATE public.reading_history
  SET status = 'approved', points_earned = v_pts, points_awarded = true
  WHERE id = p_reading_id;

  UPDATE public.profiles
  SET points = COALESCE(points, 0) + v_pts
  WHERE id = r.user_id;

  PERFORM public.notify_user(
    r.user_id,
    'Reading approved',
    'Your reading entry "' || COALESCE(r.book_title, '') || '" was approved (+' || v_pts || ' points).',
    'success'
  );
  RETURN v_pts;
END;
$$;

-- Seed default certificate field layout (percent positions on template)
INSERT INTO public.system_settings (key, value) VALUES
  ('certificate_layout', '{
    "name": {"x": 50, "y": 42, "fontSize": 28, "visible": true, "align": "center"},
    "className": {"x": 50, "y": 50, "fontSize": 14, "visible": true, "align": "center"},
    "event": {"x": 50, "y": 56, "fontSize": 16, "visible": true, "align": "center"},
    "title": {"x": 50, "y": 64, "fontSize": 18, "visible": true, "align": "center"},
    "description": {"x": 50, "y": 72, "fontSize": 13, "visible": true, "align": "center"},
    "date": {"x": 50, "y": 82, "fontSize": 12, "visible": true, "align": "center"}
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;
