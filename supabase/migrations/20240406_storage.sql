-- Enable the storage extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "storage";

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('pet-images', 'pet-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to view images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'pet-images' AND path LIKE 'public/%');

-- Allow authenticated uploads
CREATE POLICY "Authenticated Uploads"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'pet-images' 
    AND path LIKE 'public/%'
    AND (LOWER(RIGHT(path, 4)) = '.jpg'
        OR LOWER(RIGHT(path, 4)) = '.png'
        OR LOWER(RIGHT(path, 4)) = '.gif'
    )
);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
USING (bucket_id = 'pet-images' AND path LIKE 'public/%'); 