-- Create a function to get total Supabase Storage usage across all buckets
CREATE OR REPLACE FUNCTION get_storage_size()
RETURNS bigint AS $$
DECLARE
  total_size bigint;
BEGIN
  -- We sum the 'size' attribute from the JSONB metadata column in storage.objects
  SELECT SUM((metadata->>'size')::bigint) INTO total_size
  FROM storage.objects;
  
  RETURN COALESCE(total_size, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
