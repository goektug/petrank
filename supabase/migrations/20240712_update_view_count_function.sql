-- Create a function that returns view_count + 1 for use in expressions
CREATE OR REPLACE FUNCTION increment_view_count_expression(row_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Get the current count
  SELECT view_count INTO current_count
  FROM pet_uploads
  WHERE id = row_id;
  
  -- Return the incremented value
  RETURN COALESCE(current_count, 0) + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disable RLS for the pet_uploads table if it's causing problems
-- Uncomment this line if other solutions don't work
-- ALTER TABLE public.pet_uploads DISABLE ROW LEVEL SECURITY; 