-- Fix: The organizations INSERT policy was RESTRICTIVE, blocking all inserts
-- Drop the restrictive policy and create a permissive one

DROP POLICY IF EXISTS "Allow insert organizations" ON public.organizations;

-- Create a PERMISSIVE policy that allows authenticated users to create organizations
CREATE POLICY "Allow insert organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);