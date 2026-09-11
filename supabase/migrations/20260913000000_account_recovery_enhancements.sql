-- Migration: Account Recovery and Password Reset Enhancements
-- Provides secure recovery lookup, masked email identification, and dummy student account assistance

CREATE OR REPLACE FUNCTION public.get_account_recovery_options(identifier text)
RETURNS TABLE(
  user_id uuid,
  auth_email text,
  first_name text,
  last_name text,
  role text,
  student_class text,
  admission_number text,
  has_personal_email boolean,
  masked_email text,
  is_dummy_email boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_rec record;
  v_target_email text;
  v_is_dummy boolean;
  v_masked text;
BEGIN
  IF identifier IS NULL OR trim(identifier) = '' THEN
    RETURN;
  END IF;

  SELECT p.id, u.email AS auth_email, p.email AS profile_email,
         p.first_name, p.last_name, p.role, p.student_class, p.admission_number
  INTO v_rec
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(trim(p.email)) = lower(trim(identifier))
     OR lower(trim(u.email)) = lower(trim(identifier))
     OR lower(trim(p.username)) = lower(trim(identifier))
     OR trim(p.phone) = trim(identifier)
     OR trim(p.admission_number) = trim(identifier)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Determine if the auth email is a dummy email without external inbox
  v_is_dummy := (v_rec.auth_email ILIKE '%@kvschool.in%' 
                 OR v_rec.auth_email ILIKE '%@internal%' 
                 OR v_rec.auth_email ILIKE '%@dummy%'
                 OR v_rec.auth_email ILIKE '%@example.com');
  
  -- Target email for sending reset: prefer profile_email if real, else auth_email if not dummy
  IF v_rec.profile_email IS NOT NULL 
     AND v_rec.profile_email NOT ILIKE '%@kvschool.in%' 
     AND v_rec.profile_email NOT ILIKE '%@internal%' 
     AND position('@' in v_rec.profile_email) > 0 THEN
    v_target_email := v_rec.profile_email;
  ELSIF NOT v_is_dummy THEN
    v_target_email := v_rec.auth_email;
  ELSE
    v_target_email := NULL;
  END IF;

  -- Mask email (e.g. j***e@domain.com)
  IF v_target_email IS NOT NULL THEN
    DECLARE
      v_userpart text := split_part(v_target_email, '@', 1);
      v_domainpart text := split_part(v_target_email, '@', 2);
    BEGIN
      IF length(v_userpart) <= 2 THEN
        v_masked := left(v_userpart, 1) || '***@' || v_domainpart;
      ELSE
        v_masked := left(v_userpart, 1) || '***' || right(v_userpart, 1) || '@' || v_domainpart;
      END IF;
    END;
  ELSE
    v_masked := NULL;
  END IF;

  RETURN QUERY SELECT
    v_rec.id,
    v_rec.auth_email,
    v_rec.first_name,
    v_rec.last_name,
    v_rec.role,
    v_rec.student_class,
    v_rec.admission_number,
    (v_target_email IS NOT NULL),
    v_masked,
    v_is_dummy;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_account_recovery_options(text) TO anon, authenticated;
