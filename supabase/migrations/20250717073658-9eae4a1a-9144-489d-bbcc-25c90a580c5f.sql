
-- Create levels table to store level definitions
CREATE TABLE public.levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  min_points INTEGER NOT NULL,
  max_points INTEGER,
  icon_name TEXT NOT NULL DEFAULT 'star',
  color TEXT NOT NULL DEFAULT '#3b82f6',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default levels
INSERT INTO public.levels (level_number, name, min_points, max_points, icon_name, color, description) VALUES
(1, 'Novice Reader', 0, 99, 'book-open', '#6b7280', 'Starting your reading journey'),
(2, 'Eager Learner', 100, 199, 'graduation-cap', '#10b981', 'Building reading habits'),
(3, 'Knowledge Seeker', 200, 299, 'search', '#3b82f6', 'Actively exploring new topics'),
(4, 'Book Explorer', 300, 399, 'compass', '#8b5cf6', 'Discovering diverse genres'),
(5, 'Scholar', 400, 499, 'award', '#f59e0b', 'Developing deep understanding'),
(6, 'Master Reader', 500, 999, 'crown', '#ef4444', 'Expert level comprehension'),
(7, 'Reading Champion', 1000, 1999, 'trophy', '#dc2626', 'Exceptional reading achievements'),
(8, 'Literature Legend', 2000, null, 'sparkles', '#7c3aed', 'Ultimate reading mastery');

-- Enable RLS
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

-- Create policies for levels table
CREATE POLICY "Anyone can view levels" 
  ON public.levels 
  FOR SELECT 
  TO public
  USING (true);

CREATE POLICY "Only admins can manage levels" 
  ON public.levels 
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin' 
      AND profiles.is_approved = true
    )
  );

-- Create function to get user level based on points
CREATE OR REPLACE FUNCTION public.get_user_level(user_points integer)
RETURNS TABLE(
  level_number integer,
  name text,
  min_points integer,
  max_points integer,
  icon_name text,
  color text,
  description text,
  progress_to_next integer,
  points_to_next integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_level RECORD;
  next_level RECORD;
BEGIN
  -- Get current level
  SELECT * INTO current_level
  FROM public.levels
  WHERE user_points >= min_points 
    AND (max_points IS NULL OR user_points <= max_points)
  ORDER BY level_number DESC
  LIMIT 1;
  
  -- Get next level
  SELECT * INTO next_level
  FROM public.levels
  WHERE level_number = current_level.level_number + 1
  LIMIT 1;
  
  -- Return level info with progress
  RETURN QUERY SELECT 
    current_level.level_number,
    current_level.name,
    current_level.min_points,
    current_level.max_points,
    current_level.icon_name,
    current_level.color,
    current_level.description,
    CASE 
      WHEN next_level.min_points IS NOT NULL THEN
        ROUND(((user_points - current_level.min_points)::float / (next_level.min_points - current_level.min_points)::float) * 100)::integer
      ELSE 100
    END as progress_to_next,
    CASE 
      WHEN next_level.min_points IS NOT NULL THEN
        next_level.min_points - user_points
      ELSE 0
    END as points_to_next;
END;
$$;
