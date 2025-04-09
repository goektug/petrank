-- Create a simple function to increment view count that returns VOID
-- This is called by the simplified ping-view API endpoint
CREATE OR REPLACE FUNCTION increment_pet_view_count_void(pet_id_param UUID)
RETURNS VOID AS $$
BEGIN
  -- Simple UPDATE statement to increment view_count by 1
  -- Use COALESCE to handle potential NULL values gracefully
  UPDATE pet_uploads
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = pet_id_param;
  
  -- Log the update (optional, for debugging)
  -- RAISE NOTICE 'Incremented view count for pet: %', pet_id_param;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER; -- Run with the privileges of the function owner

-- Make sure the function can be called by the anon role
GRANT EXECUTE ON FUNCTION increment_pet_view_count_void(UUID) TO anon;
GRANT EXECUTE ON FUNCTION increment_pet_view_count_void(UUID) TO authenticated; 