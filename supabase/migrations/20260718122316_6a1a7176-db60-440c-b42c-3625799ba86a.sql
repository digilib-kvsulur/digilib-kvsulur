
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text;

DROP FUNCTION IF EXISTS public.get_public_profiles(uuid[]);
CREATE FUNCTION public.get_public_profiles(_ids uuid[])
RETURNS TABLE(id uuid, first_name text, last_name text, username text, student_class text, points integer, role text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.username, p.student_class, p.points, p.role, p.avatar_url
  FROM public.profiles p WHERE p.id = ANY(_ids);
$$;
REVOKE ALL ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_profile_full(_id uuid)
RETURNS TABLE(
  id uuid, first_name text, last_name text, username text,
  student_class text, role text, points integer,
  avatar_url text, bio text,
  friends_count integer, posts_count integer,
  followers_count integer, following_count integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.id, p.first_name, p.last_name, p.username,
    p.student_class, p.role, p.points, p.avatar_url, p.bio,
    (SELECT COUNT(*)::int FROM public.friendships f
      WHERE f.status = 'accepted' AND (f.requester_id = _id OR f.addressee_id = _id)),
    (SELECT COUNT(*)::int FROM public.posts WHERE user_id = _id),
    (SELECT COUNT(*)::int FROM public.friendships f
      WHERE f.status = 'accepted' AND (f.requester_id = _id OR f.addressee_id = _id)),
    (SELECT COUNT(*)::int FROM public.friendships f
      WHERE f.status = 'accepted' AND (f.requester_id = _id OR f.addressee_id = _id))
  FROM public.profiles p WHERE p.id = _id;
$$;
REVOKE ALL ON FUNCTION public.get_public_profile_full(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_full(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_posts_by_user(_id uuid, _limit integer DEFAULT 20)
RETURNS TABLE(id uuid, title text, content text, created_at timestamptz, likes_count integer, comments_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.title, p.content, p.created_at,
    (SELECT COUNT(*)::int FROM public.post_likes WHERE post_id = p.id),
    (SELECT COUNT(*)::int FROM public.post_comments WHERE post_id = p.id)
  FROM public.posts p WHERE p.user_id = _id
  ORDER BY p.created_at DESC LIMIT COALESCE(_limit, 20);
$$;
REVOKE ALL ON FUNCTION public.get_public_posts_by_user(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_posts_by_user(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_class_league()
RETURNS TABLE(student_class text, total_points bigint, student_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.student_class, COALESCE(SUM(p.points),0)::bigint, COUNT(*)::bigint
  FROM public.profiles p
  WHERE p.role = 'student' AND p.is_approved = true AND p.student_class IS NOT NULL
  GROUP BY p.student_class ORDER BY 2 DESC;
$$;
REVOKE ALL ON FUNCTION public.get_class_league() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_class_league() TO authenticated;

DROP POLICY IF EXISTS "Avatars viewable by authenticated" ON storage.objects;
CREATE POLICY "Avatars viewable by authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
