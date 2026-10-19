-- Lightweight one-to-one chat: rows are retained only for a short TTL.
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CHECK (sender_id <> recipient_id),
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '7 days')
);

CREATE INDEX IF NOT EXISTS chat_messages_pair_recent_idx
  ON public.chat_messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_recipient_recent_idx
  ON public.chat_messages (recipient_id, sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_expiry_idx ON public.chat_messages (expires_at);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_messages FROM anon, PUBLIC;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;

CREATE OR REPLACE FUNCTION public.are_accepted_friends(p_a uuid, p_b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = p_a AND f.addressee_id = p_b)
        OR (f.requester_id = p_b AND f.addressee_id = p_a))
  );
$$;
REVOKE ALL ON FUNCTION public.are_accepted_friends(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.are_accepted_friends(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "friends read unexpired chat messages" ON public.chat_messages;
CREATE POLICY "friends read unexpired chat messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    expires_at > now()
    AND (auth.uid() = sender_id OR auth.uid() = recipient_id)
    AND public.are_accepted_friends(sender_id, recipient_id)
  );

DROP POLICY IF EXISTS "friends send chat messages" ON public.chat_messages;
CREATE POLICY "friends send chat messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND expires_at > now()
    AND expires_at <= now() + interval '7 days'
    AND public.are_accepted_friends(sender_id, recipient_id)
  );

-- Only allow authenticated users to join a private channel for an accepted
-- friendship. Topic format is friends-chat:<lower UUID>:<higher UUID>.
DROP POLICY IF EXISTS "friends join private chat broadcast" ON realtime.messages;
CREATE POLICY "friends join private chat broadcast" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    split_part(realtime.topic(), ':', 1) = 'friends-chat'
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
    AND public.are_accepted_friends(
      split_part(realtime.topic(), ':', 2)::uuid,
      split_part(realtime.topic(), ':', 3)::uuid
    )
    AND auth.uid() IN (
      split_part(realtime.topic(), ':', 2)::uuid,
      split_part(realtime.topic(), ':', 3)::uuid
    )
  );

-- TTL cleanup keeps the table bounded. Supabase projects provide pg_cron;
-- keep migration usable when the extension is unavailable by deferring setup.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'delete-expired-chat-messages') THEN
    PERFORM cron.schedule(
      'delete-expired-chat-messages',
      '*/10 * * * *',
      $job$DELETE FROM public.chat_messages WHERE expires_at <= now()$job$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Chat TTL cron job not scheduled; configure pg_cron to delete expired messages.';
END;
$$;
