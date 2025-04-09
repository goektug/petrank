-- First, drop existing policies
DROP POLICY IF EXISTS "Allow public inserts" ON public.pet_uploads;
DROP POLICY IF EXISTS "Allow public read access to approved pets" ON public.pet_uploads;
DROP POLICY IF EXISTS "Admin full access" ON public.pet_uploads;
DROP POLICY IF EXISTS "Allow view count updates" ON public.pet_uploads;
DROP POLICY IF EXISTS "anon_insert_policy" ON public.pet_uploads;
DROP POLICY IF EXISTS "anon_select_policy" ON public.pet_uploads;
DROP POLICY IF EXISTS "anon_update_policy" ON public.pet_uploads;

-- 1. Allow anyone to insert new pets (anonymous and authenticated)
CREATE POLICY "anon_insert_policy"
ON public.pet_uploads
FOR INSERT
TO public
WITH CHECK (true);

-- 2. Allow anyone to view all pets
CREATE POLICY "anon_select_policy"
ON public.pet_uploads
FOR SELECT
TO public
USING (true);

-- 3. Allow anyone to update view_count
-- Since we can't use old/new references directly in policies,
-- we'll just allow all updates for now
CREATE POLICY "anon_update_policy"
ON public.pet_uploads
FOR UPDATE
TO public
USING (true);

-- Ensure RLS is enabled
ALTER TABLE public.pet_uploads ENABLE ROW LEVEL SECURITY; 