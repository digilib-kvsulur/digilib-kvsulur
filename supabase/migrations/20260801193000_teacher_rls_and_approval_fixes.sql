-- 1. Redefine is_staff_or_admin to include 'teacher' role so they pass RLS checks
CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _uid AND role IN ('admin','staff','librarian','teacher')
  )
$$;

-- 2. Redefine update_challenge_progress with search_path = public to fix reading approval trigger error
CREATE OR REPLACE FUNCTION public.update_challenge_progress(
  p_user_id UUID,
  p_challenge_type TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
  challenge_record RECORD;
  current_prog INTEGER;
BEGIN
  -- Loop through all active challenges of the specified type
  FOR challenge_record IN 
    SELECT id, target_value, reward_points 
    FROM public.challenges 
    WHERE type = p_challenge_type AND is_active = true
  LOOP
    -- Insert or update progress
    INSERT INTO public.challenge_progress (challenge_id, user_id, current_progress)
    VALUES (challenge_record.id, p_user_id, p_increment)
    ON CONFLICT (challenge_id, user_id)
    DO UPDATE SET 
      current_progress = challenge_progress.current_progress + p_increment,
      is_completed = CASE 
        WHEN challenge_progress.current_progress + p_increment >= challenge_record.target_value 
        THEN true 
        ELSE challenge_progress.is_completed 
      END,
      completed_at = CASE 
        WHEN challenge_progress.current_progress + p_increment >= challenge_record.target_value AND challenge_progress.completed_at IS NULL
        THEN now()
        ELSE challenge_progress.completed_at
      END;
    
    -- Award points if challenge is completed
    SELECT current_progress INTO current_prog
    FROM public.challenge_progress
    WHERE challenge_id = challenge_record.id AND user_id = p_user_id;
    
    IF current_prog >= challenge_record.target_value THEN
      UPDATE public.profiles 
      SET points = points + challenge_record.reward_points
      WHERE id = p_user_id AND id NOT IN (
        SELECT user_id FROM public.challenge_progress 
        WHERE challenge_id = challenge_record.id 
        AND user_id = p_user_id 
        AND completed_at < now() - INTERVAL '1 second'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Redefine get_teacher_class_students to return is_approved and include pending students
DROP FUNCTION IF EXISTS public.get_teacher_class_students(text);
CREATE OR REPLACE FUNCTION public.get_teacher_class_students(p_class text)
RETURNS TABLE(id uuid, first_name text, last_name text, username text, student_class text, admission_number text, points integer, avatar_url text, is_approved boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.first_name, p.last_name, p.username, p.student_class, p.admission_number, p.points, p.avatar_url, p.is_approved
  FROM public.profiles p
  WHERE p.role = 'student' AND p.student_class = p_class
  ORDER BY p.first_name;
$$;
GRANT EXECUTE ON FUNCTION public.get_teacher_class_students(text) TO authenticated;
