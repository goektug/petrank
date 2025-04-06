-- Create the pet_uploads table
CREATE TABLE IF NOT EXISTS pet_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_name TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create an index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_pet_uploads_status ON pet_uploads(status);

-- Create an index on view_count for the leaderboard
CREATE INDEX IF NOT EXISTS idx_pet_uploads_view_count ON pet_uploads(view_count DESC);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_pet_uploads_updated_at
    BEFORE UPDATE ON pet_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 