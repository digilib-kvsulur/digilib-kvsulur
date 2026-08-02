ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_user_id_key UNIQUE (user_id);
