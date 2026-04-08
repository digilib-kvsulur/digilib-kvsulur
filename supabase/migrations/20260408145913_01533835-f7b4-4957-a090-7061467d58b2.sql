
-- 1. Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  student_class TEXT,
  roll_number TEXT,
  admission_number TEXT,
  username TEXT UNIQUE,
  phone TEXT UNIQUE,
  points INTEGER NOT NULL DEFAULT 0,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Books table
CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  category TEXT,
  description TEXT,
  cover_url TEXT,
  total_copies INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Book issues table
CREATE TABLE public.book_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  return_date DATE,
  status TEXT NOT NULL DEFAULT 'issued',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Book requests table
CREATE TABLE public.book_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_title TEXT,
  requested_author TEXT,
  requested_isbn TEXT,
  requested_description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Levels table
CREATE TABLE public.levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  min_points INTEGER NOT NULL DEFAULT 0,
  max_points INTEGER,
  icon_name TEXT NOT NULL DEFAULT 'star',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Challenges table
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'books_read',
  target_value INTEGER NOT NULL DEFAULT 1,
  reward_points INTEGER NOT NULL DEFAULT 10,
  deadline TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Challenge progress table
CREATE TABLE public.challenge_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_progress INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  points_earned INTEGER NOT NULL DEFAULT 0,
  is_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- 8. Quizzes table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL DEFAULT 'general',
  difficulty TEXT NOT NULL DEFAULT 'medium',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  time_limit INTEGER NOT NULL DEFAULT 30,
  points_reward INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Quiz results table
CREATE TABLE public.quiz_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  points_earned INTEGER NOT NULL DEFAULT 0,
  answers JSONB,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Reading history table
CREATE TABLE public.reading_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_title TEXT NOT NULL,
  book_author TEXT NOT NULL,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  rating INTEGER DEFAULT 5,
  points_earned INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. User roles table for admin security
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to get user role from profiles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_profile_role(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id
$$;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: users can read all approved profiles, update own
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');

-- Books: everyone can read, admins can manage
CREATE POLICY "Anyone can view books" ON public.books FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert books" ON public.books FOR INSERT TO authenticated WITH CHECK (public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can update books" ON public.books FOR UPDATE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can delete books" ON public.books FOR DELETE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');

-- Book issues: users see own, admins see all
CREATE POLICY "Users can view own issues" ON public.book_issues FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can insert issues" ON public.book_issues FOR INSERT TO authenticated WITH CHECK (public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can update issues" ON public.book_issues FOR UPDATE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');

-- Book requests: users see own, admins see all
CREATE POLICY "Users can view own requests" ON public.book_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Users can insert requests" ON public.book_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update requests" ON public.book_requests FOR UPDATE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');

-- Levels: everyone can read, admins can manage
CREATE POLICY "Anyone can view levels" ON public.levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert levels" ON public.levels FOR INSERT TO authenticated WITH CHECK (public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can update levels" ON public.levels FOR UPDATE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can delete levels" ON public.levels FOR DELETE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');

-- Challenges: everyone can read, admins can manage
CREATE POLICY "Anyone can view challenges" ON public.challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert challenges" ON public.challenges FOR INSERT TO authenticated WITH CHECK (public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can update challenges" ON public.challenges FOR UPDATE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can delete challenges" ON public.challenges FOR DELETE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');

-- Challenge progress: users see own, admins see all
CREATE POLICY "Users can view own progress" ON public.challenge_progress FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Users can insert own progress" ON public.challenge_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own progress" ON public.challenge_progress FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.get_profile_role(auth.uid()) = 'admin');

-- Quizzes: everyone can read active, admins can manage
CREATE POLICY "Anyone can view quizzes" ON public.quizzes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert quizzes" ON public.quizzes FOR INSERT TO authenticated WITH CHECK (public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can update quizzes" ON public.quizzes FOR UPDATE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Admins can delete quizzes" ON public.quizzes FOR DELETE TO authenticated USING (public.get_profile_role(auth.uid()) = 'admin');

-- Quiz results: users see own, admins see all
CREATE POLICY "Users can view own results" ON public.quiz_results FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Users can insert own results" ON public.quiz_results FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Reading history: users see own, admins see all
CREATE POLICY "Users can view own history" ON public.reading_history FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.get_profile_role(auth.uid()) = 'admin');
CREATE POLICY "Users can insert own history" ON public.reading_history FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own history" ON public.reading_history FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own history" ON public.reading_history FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Database functions

-- get_user_level function
CREATE OR REPLACE FUNCTION public.get_user_level(user_points INTEGER)
RETURNS TABLE(
  level_number INTEGER,
  name TEXT,
  min_points INTEGER,
  max_points INTEGER,
  icon_name TEXT,
  color TEXT,
  description TEXT,
  progress_to_next NUMERIC,
  points_to_next INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_level RECORD;
  next_level RECORD;
BEGIN
  SELECT l.* INTO current_level FROM public.levels l
    WHERE l.min_points <= user_points
    ORDER BY l.min_points DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT l.* INTO next_level FROM public.levels l
    WHERE l.level_number = current_level.level_number + 1;

  RETURN QUERY SELECT
    current_level.level_number,
    current_level.name,
    current_level.min_points,
    current_level.max_points,
    current_level.icon_name,
    current_level.color,
    current_level.description,
    CASE
      WHEN next_level IS NULL THEN 100::NUMERIC
      ELSE ROUND(((user_points - current_level.min_points)::NUMERIC / NULLIF(next_level.min_points - current_level.min_points, 0)) * 100, 1)
    END,
    CASE
      WHEN next_level IS NULL THEN 0
      ELSE next_level.min_points - user_points
    END;
END;
$$;

-- get_user_class_rank function
CREATE OR REPLACE FUNCTION public.get_user_class_rank(user_class TEXT, user_points INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER + 1
  FROM public.profiles
  WHERE student_class = user_class
    AND is_approved = true
    AND points > user_points;
$$;

-- find_user_by_identifier function (for login)
CREATE OR REPLACE FUNCTION public.find_user_by_identifier(identifier TEXT)
RETURNS TABLE(id UUID, email TEXT, is_approved BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email, p.is_approved
  FROM public.profiles p
  WHERE p.email = identifier
    OR p.username = identifier
    OR p.phone = identifier
  LIMIT 1;
$$;

-- get_leaderboard_data function
CREATE OR REPLACE FUNCTION public.get_leaderboard_data(class_filter TEXT DEFAULT NULL)
RETURNS TABLE(id UUID, first_name TEXT, student_class TEXT, points INTEGER)
LANGUAGE sql
STABLE
AS $$
  SELECT p.id, p.first_name, p.student_class, p.points
  FROM public.profiles p
  WHERE p.role = 'student'
    AND p.is_approved = true
    AND (class_filter IS NULL OR p.student_class = class_filter)
  ORDER BY p.points DESC;
$$;

-- Admin stats functions
CREATE OR REPLACE FUNCTION public.get_active_users_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER FROM public.profiles WHERE is_approved = true;
$$;

CREATE OR REPLACE FUNCTION public.get_total_books_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER FROM public.books;
$$;

CREATE OR REPLACE FUNCTION public.get_books_issued_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER FROM public.book_issues WHERE status = 'issued';
$$;

CREATE OR REPLACE FUNCTION public.get_active_quizzes_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER FROM public.quizzes WHERE is_active = true;
$$;

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role, student_class, roll_number, admission_number, username, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'student_class',
    NEW.raw_user_meta_data->>'roll_number',
    NEW.raw_user_meta_data->>'admission_number',
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert default levels
INSERT INTO public.levels (level_number, name, min_points, max_points, icon_name, color, description) VALUES
  (1, 'Beginner Reader', 0, 99, 'book-open', '#6b7280', 'Just starting your reading journey'),
  (2, 'Page Turner', 100, 249, 'search', '#10b981', 'Developing a reading habit'),
  (3, 'Bookworm', 250, 499, 'compass', '#3b82f6', 'A dedicated reader'),
  (4, 'Scholar', 500, 999, 'graduation-cap', '#8b5cf6', 'Knowledge seeker'),
  (5, 'Master Reader', 1000, 1999, 'award', '#f59e0b', 'Expert level reader'),
  (6, 'Library Champion', 2000, NULL, 'crown', '#ef4444', 'The ultimate reading champion');
