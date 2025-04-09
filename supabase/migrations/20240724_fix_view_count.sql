-- Ensure the view_count column exists and has a default value of 0
DO $$ 
BEGIN
  -- Check if the column exists, if not, add it
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pet_uploads' 
    AND column_name = 'view_count'
  ) THEN
    ALTER TABLE public.pet_uploads ADD COLUMN view_count INTEGER DEFAULT 0;
  ELSE
    -- If the column exists but doesn't have a default, add it
    ALTER TABLE public.pet_uploads ALTER COLUMN view_count SET DEFAULT 0;
  END IF;
END $$;

-- Update any NULL view_count values to 0
UPDATE public.pet_uploads SET view_count = 0 WHERE view_count IS NULL;

-- Make sure RLS doesn't block view count updates
-- This policy allows any authenticated or anonymous user to update any row.
-- Ensure this aligns with your security requirements.
-- If updates should be restricted (e.g., only via service_key), adjust this policy.
DROP POLICY IF EXISTS "Allow view count updates" ON public.pet_uploads;
CREATE POLICY "Allow view count updates"
ON public.pet_uploads
FOR UPDATE
TO public -- Allows anon and authenticated roles
USING (true)
WITH CHECK (true); 