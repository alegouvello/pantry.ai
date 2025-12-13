-- Drop and recreate policy without role restriction (RLS applies to authenticated by default)
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);