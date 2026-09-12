-- Migration: WhatsApp Community Link and One-time 250 Points Reward

-- 1. Add whatsapp_reward_claimed and whatsapp_joined_at columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS whatsapp_reward_claimed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_joined_at timestamp with time zone;

-- 2. Create RPC function to securely grant 250 points once per user
CREATE OR REPLACE FUNCTION public.claim_whatsapp_community_reward()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_claimed boolean;
  v_reward integer := 250;
  v_current_points integer;
BEGIN
  -- Lock row and check if already claimed
  SELECT COALESCE(whatsapp_reward_claimed, false), COALESCE(points, 0)
  INTO v_claimed, v_current_points
  FROM public.profiles
  WHERE id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF v_claimed THEN
    RAISE EXCEPTION 'WhatsApp Community 250 points reward has already been claimed';
  END IF;

  -- Update profile with 250 points and mark reward as claimed
  UPDATE public.profiles
  SET points = v_current_points + v_reward,
      whatsapp_reward_claimed = true,
      whatsapp_joined_at = NOW(),
      updated_at = NOW()
  WHERE id = auth.uid();

  -- Send notification to user
  INSERT INTO public.notifications (
    target_user_id,
    sent_by,
    title,
    message,
    type,
    is_read
  ) VALUES (
    auth.uid(),
    auth.uid(),
    '🎉 250 XP WhatsApp Bonus Claimed!',
    'Thank you for joining the PM SHRI KV Sulur WhatsApp Community! 250 bonus points have been added to your profile.',
    'points',
    false
  );

  RETURN v_reward;
END;
$$;

-- 3. Grant execute permission on the RPC function to authenticated users
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_community_reward() TO authenticated;
