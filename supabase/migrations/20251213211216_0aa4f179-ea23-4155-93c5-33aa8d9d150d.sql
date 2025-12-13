-- Drop the restrictive policy
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- Create a permissive INSERT policy for authenticated users
CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);