-- Migration: Add RPCs for viewing user connections (followers & following) and smart follow suggestions
-- Enables clicking on followers/following count to view list of any user with SECURITY DEFINER
-- Enables follow suggestions on the network page

CREATE OR REPLACE FUNCTION public.get_user_network_connections(
  p_user_id uuid,
  p_type text DEFAULT 'all'
)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  username text,
  student_class text,
  role text,
  points integer,
  avatar_url text,
  bio text,
  connection_status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.username,
    p.student_class,
    p.role,
    p.points,
    p.avatar_url,
    p.bio,
    f.status AS connection_status,
    f.created_at
  FROM public.friendships f
  JOIN public.profiles p ON (
    p.id = CASE 
      WHEN f.requester_id = p_user_id THEN f.addressee_id 
      ELSE f.requester_id 
    END
  )
  WHERE f.status = 'accepted'
    AND (f.requester_id = p_user_id OR f.addressee_id = p_user_id)
    AND p.is_approved = true
  ORDER BY p.first_name ASC, f.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_user_network_connections(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_network_connections(uuid, text) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_follow_suggestions(
  p_user_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  username text,
  student_class text,
  role text,
  points integer,
  avatar_url text,
  bio text,
  reason text,
  mutual_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_class text;
  v_user_role text;
BEGIN
  -- Get user class and role
  SELECT p.student_class, p.role INTO v_user_class, v_user_role
  FROM public.profiles p
  WHERE p.id = p_user_id;

  RETURN QUERY
  WITH user_friends AS (
    SELECT CASE WHEN requester_id = p_user_id THEN addressee_id ELSE requester_id END AS friend_id
    FROM public.friendships
    WHERE (requester_id = p_user_id OR addressee_id = p_user_id)
      AND status IN ('accepted', 'pending')
  ),
  friends_of_friends AS (
    SELECT 
      CASE WHEN f2.requester_id = uf.friend_id THEN f2.addressee_id ELSE f2.requester_id END AS fof_id,
      COUNT(*)::int AS mutual_count
    FROM user_friends uf
    JOIN public.friendships f2 ON (f2.requester_id = uf.friend_id OR f2.addressee_id = uf.friend_id)
    WHERE f2.status = 'accepted'
      AND f2.requester_id <> p_user_id
      AND f2.addressee_id <> p_user_id
    GROUP BY 1
  ),
  candidates AS (
    SELECT 
      p.id,
      p.first_name,
      p.last_name,
      p.username,
      p.student_class,
      p.role,
      p.points,
      p.avatar_url,
      p.bio,
      COALESCE(fof.mutual_count, 0) AS mutual_count,
      CASE 
        WHEN COALESCE(fof.mutual_count, 0) > 0 THEN fof.mutual_count || ' mutuals'
        WHEN v_user_class IS NOT NULL AND p.student_class = v_user_class THEN 'Class ' || v_user_class
        WHEN v_user_class IS NOT NULL AND LEFT(p.student_class, 2) = LEFT(v_user_class, 2) THEN 'Class ' || p.student_class
        WHEN p.points > 50 THEN 'Top reader'
        ELSE 'Active reader'
      END AS reason,
      CASE 
        WHEN COALESCE(fof.mutual_count, 0) > 0 THEN 1
        WHEN v_user_class IS NOT NULL AND p.student_class = v_user_class THEN 2
        WHEN v_user_class IS NOT NULL AND LEFT(p.student_class, 2) = LEFT(v_user_class, 2) THEN 3
        WHEN p.points > 50 THEN 4
        ELSE 5
      END AS priority_score
    FROM public.profiles p
    LEFT JOIN friends_of_friends fof ON fof.fof_id = p.id
    WHERE p.id <> p_user_id
      AND p.is_approved = true
      AND p.id NOT IN (SELECT friend_id FROM user_friends)
  )
  SELECT 
    c.id, c.first_name, c.last_name, c.username, c.student_class, c.role,
    c.points, c.avatar_url, c.bio, c.reason, c.mutual_count
  FROM candidates c
  ORDER BY c.priority_score ASC, c.mutual_count DESC, c.points DESC, c.first_name ASC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_follow_suggestions(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_follow_suggestions(uuid, integer) TO authenticated, anon;
REVOKE ALL ON FUNCTION public.get_user_network_connections(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_network_connections(uuid, text) TO authenticated, anon;
