-- Admin monitoring returns active private messages only. The underlying table
-- stays unreadable to admins through direct table access and expires as before.
CREATE OR REPLACE FUNCTION public.get_friends_chat_admin_messages(p_limit integer DEFAULT 100)
RETURNS TABLE (
  id uuid,
  sender_id uuid,
  sender_name text,
  recipient_id uuid,
  recipient_name text,
  body text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE profiles.id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT m.id, m.sender_id,
    COALESCE(NULLIF(trim(concat_ws(' ', sender.first_name, sender.last_name)), ''), 'Student'),
    m.recipient_id,
    COALESCE(NULLIF(trim(concat_ws(' ', recipient.first_name, recipient.last_name)), ''), 'Student'),
    m.body, m.created_at, m.expires_at
  FROM public.chat_messages m
  JOIN public.profiles sender ON sender.id = m.sender_id
  JOIN public.profiles recipient ON recipient.id = m.recipient_id
  WHERE m.expires_at > now()
  ORDER BY m.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200);
END;
$$;
REVOKE ALL ON FUNCTION public.get_friends_chat_admin_messages(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_friends_chat_admin_messages(integer) TO authenticated;
