-- First, drop ALL existing organization policies
DROP POLICY IF EXISTS "Users can manage their org" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Members can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can delete their organizations" ON public.organizations;

-- Now create the correct policies
-- Allow any authenticated user to INSERT (create) a new organization
CREATE POLICY "Authenticated users can create organizations" 
ON public.organizations 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow members to SELECT their organizations
CREATE POLICY "Members can view their organizations" 
ON public.organizations 
FOR SELECT 
USING (public.is_org_member(auth.uid(), id));

-- Allow members to UPDATE their organizations
CREATE POLICY "Members can update their organizations" 
ON public.organizations 
FOR UPDATE 
USING (public.is_org_member(auth.uid(), id));

-- Allow owners to DELETE their organizations
CREATE POLICY "Owners can delete their organizations" 
ON public.organizations 
FOR DELETE 
USING (public.is_org_owner(auth.uid(), id));