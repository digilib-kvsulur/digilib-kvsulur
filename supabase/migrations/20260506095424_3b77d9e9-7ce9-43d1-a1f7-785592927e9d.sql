
-- 1) Profiles: drop overly broad SELECT policy and replace with owner/admin-only
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Students can view approved classmates" ON public.profiles;
DROP POLICY IF EXISTS "Students can view classmates" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.get_profile_role(auth.uid()) = 'admin');

-- 2) Quiz results: restrict to owner, quiz creator, or admin
DROP POLICY IF EXISTS "Users can view own results" ON public.quiz_results;
DROP POLICY IF EXISTS "Teachers can view all quiz results" ON public.quiz_results;

CREATE POLICY "Users can view relevant quiz results"
ON public.quiz_results
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.get_profile_role(auth.uid()) = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = quiz_results.quiz_id AND q.created_by = auth.uid()
  )
);
