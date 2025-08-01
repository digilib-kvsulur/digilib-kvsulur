-- Fix the ambiguous column reference in get_user_level function
CREATE OR REPLACE FUNCTION public.get_user_level(user_points integer)
 RETURNS TABLE(level_number integer, name text, min_points integer, max_points integer, icon_name text, color text, description text, progress_to_next integer, points_to_next integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_level RECORD;
  next_level RECORD;
BEGIN
  -- Get current level (qualify column names with table name)
  SELECT * INTO current_level
  FROM public.levels
  WHERE user_points >= levels.min_points 
    AND (levels.max_points IS NULL OR user_points <= levels.max_points)
  ORDER BY levels.level_number DESC
  LIMIT 1;
  
  -- Get next level
  SELECT * INTO next_level
  FROM public.levels
  WHERE levels.level_number = current_level.level_number + 1
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
$function$