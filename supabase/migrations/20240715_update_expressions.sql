-- Create a function that returns the incremented value for view count
CREATE OR REPLACE FUNCTION increment_pet_view_count_expression(row_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
  new_count INTEGER;
BEGIN
  -- Get the current count
  SELECT view_count INTO current_count
  FROM pet_uploads
  WHERE id = row_id;
  
  -- Calculate new count
  new_count := COALESCE(current_count, 0) + 1;
  
  -- Update the row
  UPDATE pet_uploads
  SET view_count = new_count
  WHERE id = row_id;
  
  -- Return the new count
  RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to anyone
GRANT EXECUTE ON FUNCTION increment_pet_view_count_expression(UUID) TO anon;
GRANT EXECUTE ON FUNCTION increment_pet_view_count_expression(UUID) TO authenticated; 