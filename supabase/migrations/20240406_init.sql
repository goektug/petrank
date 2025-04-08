-- Create an index on view_count for the leaderboard
CREATE INDEX IF NOT EXISTS idx_pet_uploads_view_count ON pet_uploads(view_count DESC);

-- Create a function to safely increment view count
CREATE OR REPLACE FUNCTION increment_view_count(pet_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE pet_uploads
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = pet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 