-- Simplify RLS policies for pet_uploads table

-- Drop potentially conflicting/redundant policies first
DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.pet_uploads;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.pet_uploads;
DROP POLICY IF EXISTS "Users can view own uploads" ON public.pet_uploads;
DROP POLICY IF EXISTS "Allow admin update access" ON public.pet_uploads;
DROP POLICY IF EXISTS "Only admins can approve uploads" ON public.pet_uploads;
DROP POLICY IF EXISTS "Allow view count updates" ON public.pet_uploads; -- If exists
DROP POLICY IF EXISTS "Allow increment_view_count for all" ON public.pet_uploads; -- If exists

-- Drop and Recreate the essential policies to ensure correct definition

-- 1. Policy: Allow ANYONE (public = anon + authenticated) to insert new rows.
-- Server action MUST ensure status is set to 'pending'.
DROP POLICY IF EXISTS "Allow public inserts" ON public.pet_uploads;
CREATE POLICY "Allow public inserts"
ON public.pet_uploads
FOR INSERT
TO public -- Allows anonymous and authenticated users
WITH CHECK (true); -- No extra conditions needed for insert itself

-- 2. Policy: Allow ANYONE (public = anon + authenticated) to SELECT approved rows.
DROP POLICY IF EXISTS "Allow public read access to approved pets" ON public.pet_uploads;
CREATE POLICY "Allow public read access to approved pets"
ON public.pet_uploads
FOR SELECT
TO public -- Allows anonymous and authenticated users
USING (status = 'approved'::text);

-- Ensure RLS is enabled (it should be, but good practice to confirm)
ALTER TABLE public.pet_uploads ENABLE ROW LEVEL SECURITY; 