-- Keep only one unresolved password-reset ticket per account. Existing duplicate
-- tickets (and their message threads) are removed; the oldest ticket is retained.
WITH ranked_reset_tickets AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY lower(trim(admission_number))
           ORDER BY created_at ASC, id ASC
         ) AS row_number
  FROM public.support_tickets
  WHERE status IN ('open', 'in_progress')
    AND (
      lower(coalesce(category, '')) = 'password'
      OR lower(coalesce(subject, '')) LIKE '%password reset%'
      OR lower(coalesce(subject, '')) LIKE '%reset password%'
    )
)
DELETE FROM public.support_tickets
WHERE id IN (SELECT id FROM ranked_reset_tickets WHERE row_number > 1);

CREATE INDEX IF NOT EXISTS idx_support_tickets_open_password_reset
  ON public.support_tickets (lower(trim(admission_number)), created_at DESC)
  WHERE status IN ('open', 'in_progress');

-- Return an existing open reset ticket instead of creating another one.
CREATE OR REPLACE FUNCTION public.submit_public_support_ticket(
  p_admission text, p_full_name text, p_email text, p_student_class text, p_role text,
  p_category text, p_priority text, p_subject text, p_description text)
RETURNS TABLE(id uuid, ticket_number text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid;
  v_id uuid;
  v_no text;
  v_is_reset boolean;
BEGIN
  IF COALESCE(trim(p_admission), '') = '' OR COALESCE(trim(p_subject), '') = '' THEN
    RAISE EXCEPTION 'Admission number and subject are required';
  END IF;

  v_is_reset := lower(coalesce(p_subject, '')) LIKE '%password reset%'
    OR lower(coalesce(p_subject, '')) LIKE '%reset password%';

  IF v_is_reset THEN
    SELECT t.id, t.ticket_number INTO v_id, v_no
    FROM public.support_tickets t
    WHERE lower(trim(t.admission_number)) = lower(trim(p_admission))
      AND t.status IN ('open', 'in_progress')
      AND (
        lower(coalesce(t.category, '')) = 'password'
        OR lower(coalesce(t.subject, '')) LIKE '%password reset%'
        OR lower(coalesce(t.subject, '')) LIKE '%reset password%'
      )
    ORDER BY t.created_at ASC
    LIMIT 1;
    IF v_id IS NOT NULL THEN
      RETURN QUERY SELECT v_id, v_no;
      RETURN;
    END IF;
  END IF;

  SELECT p.id INTO v_user FROM public.profiles p WHERE p.admission_number = trim(p_admission) LIMIT 1;
  INSERT INTO public.support_tickets (
    user_id, admission_number, full_name, email, student_class, role,
    category, subject, description, priority, status
  ) VALUES (
    v_user, trim(p_admission), left(p_full_name, 120), nullif(left(p_email, 255), ''), p_student_class, p_role,
    p_category, left(p_subject, 150), left(p_description, 2000), COALESCE(p_priority, 'medium'), 'open'
  ) RETURNING support_tickets.id, support_tickets.ticket_number INTO v_id, v_no;

  RETURN QUERY SELECT v_id, v_no;
END;
$$;

-- Do not inherit known placeholder/school-system mailboxes as notification addresses.
CREATE OR REPLACE FUNCTION public.set_notification_email_for_new_profile()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.notification_email IS NULL
     AND NEW.email IS NOT NULL
     AND NEW.email !~* '@(kvschool\.in|kvsulur\.com|kvschennairo\.in|kvsulur\.in|internal|dummy|example\.com)$' THEN
    NEW.notification_email := lower(trim(NEW.email));
    NEW.notification_email_confirmed_at := COALESCE(NEW.notification_email_confirmed_at, now());
  END IF;
  RETURN NEW;
END;
$$;

-- Recovery lookup should recognise a real notification address and report any
-- known placeholder mailbox as unusable.
CREATE OR REPLACE FUNCTION public.get_account_recovery_options(identifier text)
RETURNS TABLE(
  user_id uuid, auth_email text, first_name text, last_name text, role text,
  student_class text, admission_number text, has_personal_email boolean,
  masked_email text, is_dummy_email boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rec record;
  v_target_email text;
  v_is_dummy boolean;
  v_masked text;
BEGIN
  IF identifier IS NULL OR trim(identifier) = '' THEN RETURN; END IF;
  SELECT p.id, u.email AS auth_email, p.email AS profile_email, p.notification_email,
         p.first_name, p.last_name, p.role, p.student_class, p.admission_number
  INTO v_rec
  FROM public.profiles p JOIN auth.users u ON u.id = p.id
  WHERE lower(trim(p.email)) = lower(trim(identifier))
     OR lower(trim(p.notification_email)) = lower(trim(identifier))
     OR lower(trim(u.email)) = lower(trim(identifier))
     OR lower(trim(p.username)) = lower(trim(identifier))
     OR trim(p.phone) = trim(identifier)
     OR trim(p.admission_number) = trim(identifier)
  LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  v_is_dummy := coalesce(v_rec.auth_email, '') ~* '@(kvschool\.in|kvsulur\.com|kvschennairo\.in|kvsulur\.in|internal|dummy|example\.com)$';
  -- Gmail is preferred, then any other non-placeholder address.
  SELECT candidate INTO v_target_email
  FROM unnest(ARRAY[v_rec.notification_email, v_rec.profile_email, v_rec.auth_email]) AS candidate
  WHERE candidate ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    AND candidate !~* '@(kvschool\.in|kvsulur\.com|kvschennairo\.in|kvsulur\.in|internal|dummy|example\.com)$'
  ORDER BY CASE WHEN candidate ~* '@gmail\.com$' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_target_email IS NOT NULL THEN
    v_masked := left(split_part(v_target_email, '@', 1), 1) || '***@' || split_part(v_target_email, '@', 2);
  END IF;
  RETURN QUERY SELECT v_rec.id, v_rec.auth_email, v_rec.first_name, v_rec.last_name,
    v_rec.role, v_rec.student_class, v_rec.admission_number, (v_target_email IS NOT NULL), v_masked, v_is_dummy;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_account_recovery_options(text) TO anon, authenticated;
