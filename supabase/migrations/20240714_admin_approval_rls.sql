-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public inserts" ON public.pet_uploads;
DROP POLICY IF EXISTS "Allow public read access to approved pets" ON public.pet_uploads;
DROP POLICY IF EXISTS "Admin full access" ON public.pet_uploads;
DROP POLICY IF EXISTS "Allow view count updates" ON public.pet_uploads;
DROP POLICY IF EXISTS "anon_insert_policy" ON public.pet_uploads;
DROP POLICY IF EXISTS "anon_select_policy" ON public.pet_uploads;
DROP POLICY IF EXISTS "anon_update_policy" ON public.pet_uploads;
DROP POLICY IF EXISTS "Users can view own uploads" ON public.pet_uploads;
DROP POLICY IF EXISTS "Only admins can approve uploads" ON public.pet_uploads;

-- Enable RLS if it's not already enabled
ALTER TABLE public.pet_uploads ENABLE ROW LEVEL SECURITY;

-- 1. Allow ANYONE (public) to insert new rows.
-- The application MUST ensure the status is set to 'pending' on insert.
CREATE POLICY "Allow public inserts with pending status" 
ON public.pet_uploads 
FOR INSERT 
TO public 
WITH CHECK (status = 'pending'::text);

-- 2. Allow ANYONE (public) to SELECT rows that are approved.
CREATE POLICY "Allow public read access to approved pets" 
ON public.pet_uploads 
FOR SELECT 
TO public 
USING (status = 'approved'::text);

-- 3. Allow ADMINS to UPDATE any row (to approve/reject/etc.).
-- Replace 'admin' with your actual admin role name if different.
CREATE POLICY "Allow admin updates" 
ON public.pet_uploads 
FOR UPDATE 
TO authenticated 
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- 4. Allow ANYONE (public) to UPDATE view_count for approved pets.
CREATE POLICY "Allow public view count updates for approved pets" 
ON public.pet_uploads 
FOR UPDATE 
TO public 
USING (status = 'approved'::text) -- Can only update rows that are already approved
WITH CHECK (
    -- Check that only view_count is being changed
    status = 'approved'::text AND -- Status must remain approved
    old.id = new.id AND
    old.pet_name = new.pet_name AND
    old.age = new.age AND
    old.gender = new.gender AND
    old.file_path = new.file_path AND
    old.image_url = new.image_url AND
    old.social_media_link IS NOT DISTINCT FROM new.social_media_link AND
    old.created_at = new.created_at AND 
    old.user_id IS NOT DISTINCT FROM new.user_id -- Add this line if you have a user_id column
); 