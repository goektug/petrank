-- Create a simple function to increment view count that works with our new API
CREATE OR REPLACE FUNCTION increment_pet_view_count(pet_id_param UUID)
RETURNS VOID AS $$
BEGIN
  -- Simple UPDATE statement to increment view_count by 1
  UPDATE pet_uploads
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = pet_id_param;
END;
$$ LANGUAGE plpgsql;

-- Make sure the function can be called by the anon role
GRANT EXECUTE ON FUNCTION increment_pet_view_count(UUID) TO anon;
GRANT EXECUTE ON FUNCTION increment_pet_view_count(UUID) TO authenticated;

-- Also update RLS to ensure view count can be updated
DROP POLICY IF EXISTS "Allow public view count updates for approved pets" ON public.pet_uploads;

CREATE POLICY "Allow view count updates by anyone" 
ON public.pet_uploads 
FOR UPDATE 
TO public
USING (true)
WITH CHECK (true); 