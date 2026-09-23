-- ====================================================================
-- Notification Deduplication Migration
-- Prevents duplicate notification spam for post likes, comments, etc.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.notify_user(_user_id uuid, _title text, _message text, _type text DEFAULT 'info')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;

  -- Server-side deduplication: if identical notification sent to this user in the last 15 seconds, skip duplicate
  IF EXISTS (
    SELECT 1 FROM public.notifications 
    WHERE target_user_id = _user_id 
      AND title = _title 
      AND message = _message 
      AND created_at > (now() - interval '15 seconds')
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (title, message, type, target_user_id, sent_by, is_read)
  VALUES (_title, _message, COALESCE(_type,'info'), _user_id, NULL, false);
END; $$;

REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text) FROM anon, authenticated;
