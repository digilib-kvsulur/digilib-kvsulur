-- Create a function to get game analytics to bypass the 1000 row API limit and reduce cache/network usage
CREATE OR REPLACE FUNCTION get_game_analytics()
RETURNS TABLE (
  game_key text,
  plays bigint,
  wins bigint,
  xp_awarded bigint,
  total_time bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gp.game_key,
    COUNT(gp.id) as plays,
    COUNT(gp.id) FILTER (WHERE gp.is_win) as wins,
    COALESCE(SUM(gp.points_earned), 0) as xp_awarded,
    COALESCE(SUM(gp.duration_seconds), 0) as total_time
  FROM game_plays gp
  GROUP BY gp.game_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get the current database size in bytes
CREATE OR REPLACE FUNCTION get_database_size()
RETURNS bigint AS $$
BEGIN
  RETURN pg_database_size(current_database());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
