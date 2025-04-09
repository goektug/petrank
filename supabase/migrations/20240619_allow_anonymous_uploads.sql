-- Drop the old policy
DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;

-- Create a new policy that allows anonymous uploads with the correct path
CREATE POLICY "Public Uploads"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'pet-images' 
    AND (
        path LIKE 'public/%' OR 
        path LIKE 'uploads/%'
    )
    AND (
        LOWER(RIGHT(path, 4)) = '.jpg'
        OR LOWER(RIGHT(path, 4)) = '.png'
        OR LOWER(RIGHT(path, 4)) = '.gif'
        OR LOWER(RIGHT(path, 5)) = '.jpeg'
        OR LOWER(RIGHT(path, 5)) = '.webp'
    )
);

-- Allow public access to view uploaded images
CREATE OR REPLACE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'pet-images' AND (path LIKE 'public/%' OR path LIKE 'uploads/%'));

-- Create a function for debugging storage uploads (can be removed later)
CREATE OR REPLACE FUNCTION can_upload_to_storage() 
RETURNS boolean AS $$
BEGIN
  RETURN true;
END;
$$ LANGUAGE plpgsql; 