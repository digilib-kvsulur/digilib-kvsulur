-- Tenant-local controls for private and live group chat.
INSERT INTO public.system_settings (key, value) VALUES
  ('friends_chat_enabled', 'true'::jsonb),
  ('friends_group_chat_enabled', 'true'::jsonb),
  ('friends_chat_max_retention_hours', '168'::jsonb)
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "friends read unexpired chat messages" ON public.chat_messages;
CREATE POLICY "friends read unexpired chat messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    COALESCE((SELECT value::text::boolean FROM public.system_settings WHERE key = 'friends_chat_enabled'), true)
    AND expires_at > now()
    AND (auth.uid() = sender_id OR auth.uid() = recipient_id)
    AND public.are_accepted_friends(sender_id, recipient_id)
  );

DROP POLICY IF EXISTS "friends send chat messages" ON public.chat_messages;
CREATE POLICY "friends send chat messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE((SELECT value::text::boolean FROM public.system_settings WHERE key = 'friends_chat_enabled'), true)
    AND sender_id = auth.uid()
    AND created_at BETWEEN now() - interval '1 minute' AND now() + interval '1 minute'
    AND expires_at > now()
    AND expires_at <= now() + COALESCE((
      SELECT (value #>> '{}')::integer FROM public.system_settings WHERE key = 'friends_chat_max_retention_hours'
    ), 168) * interval '1 hour'
    AND public.are_accepted_friends(sender_id, recipient_id)
  );

DROP POLICY IF EXISTS "friends join private chat broadcast" ON realtime.messages;
CREATE POLICY "friends join private chat broadcast" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    split_part(realtime.topic(), ':', 1) = 'friends-chat'
    AND COALESCE((SELECT value::text::boolean FROM public.system_settings WHERE key = 'friends_chat_enabled'), true)
    AND public.are_accepted_friends(
      split_part(realtime.topic(), ':', 2)::uuid,
      split_part(realtime.topic(), ':', 3)::uuid
    )
    AND auth.uid() IN (
      split_part(realtime.topic(), ':', 2)::uuid,
      split_part(realtime.topic(), ':', 3)::uuid
    )
  );

DROP POLICY IF EXISTS "friends send private chat broadcast" ON realtime.messages;
CREATE POLICY "friends send private chat broadcast" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    split_part(realtime.topic(), ':', 1) = 'friends-chat'
    AND COALESCE((SELECT value::text::boolean FROM public.system_settings WHERE key = 'friends_chat_enabled'), true)
    AND public.are_accepted_friends(
      split_part(realtime.topic(), ':', 2)::uuid,
      split_part(realtime.topic(), ':', 3)::uuid
    )
    AND auth.uid() IN (
      split_part(realtime.topic(), ':', 2)::uuid,
      split_part(realtime.topic(), ':', 3)::uuid
    )
  );

DROP POLICY IF EXISTS "authenticated users join online group chat" ON realtime.messages;
CREATE POLICY "authenticated users join online group chat" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.topic() = 'friends-group:online'
    AND COALESCE((SELECT value::text::boolean FROM public.system_settings WHERE key = 'friends_chat_enabled'), true)
    AND COALESCE((SELECT value::text::boolean FROM public.system_settings WHERE key = 'friends_group_chat_enabled'), true)
  );

DROP POLICY IF EXISTS "authenticated users send online group chat" ON realtime.messages;
CREATE POLICY "authenticated users send online group chat" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    realtime.topic() = 'friends-group:online'
    AND COALESCE((SELECT value::text::boolean FROM public.system_settings WHERE key = 'friends_chat_enabled'), true)
    AND COALESCE((SELECT value::text::boolean FROM public.system_settings WHERE key = 'friends_group_chat_enabled'), true)
  );

-- Give admins aggregate usage only; private message bodies remain inaccessible.
CREATE OR REPLACE FUNCTION public.get_friends_chat_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_active bigint;
  v_today bigint;
  v_expired bigint;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT count(*) INTO v_active FROM public.chat_messages WHERE expires_at > now();
  SELECT count(*) INTO v_today FROM public.chat_messages WHERE created_at >= date_trunc('day', now());
  SELECT count(*) INTO v_expired FROM public.chat_messages WHERE expires_at <= now();

  RETURN jsonb_build_object(
    'active_messages', v_active,
    'today_messages', v_today,
    'expired_pending', v_expired
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_friends_chat_admin_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_friends_chat_admin_stats() TO authenticated;
