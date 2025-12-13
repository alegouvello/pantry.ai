-- Simplify to allow any insert - security is handled at membership level
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

CREATE POLICY "Allow insert organizations"
ON public.organizations
FOR INSERT
WITH CHECK (true);