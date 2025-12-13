-- The memberships policy still queries memberships table causing recursion
-- We need a security definer function to check org membership without recursion

-- First, drop the problematic policy
DROP POLICY IF EXISTS "Users can manage memberships in their org" ON public.memberships;

-- Create a security definer function to check if user is owner of an org
CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id 
    AND org_id = _org_id 
    AND role = 'owner'
  )
$$;

-- Create a security definer function to check if user belongs to an org
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id AND org_id = _org_id
  )
$$;

-- Recreate the memberships policy using the security definer function
CREATE POLICY "Users can manage memberships in their org" 
ON public.memberships 
FOR ALL 
USING (public.is_org_owner(auth.uid(), org_id));

-- Also fix the organizations policy to use security definer function
DROP POLICY IF EXISTS "Users can manage their org" ON public.organizations;

CREATE POLICY "Users can manage their org" 
ON public.organizations 
FOR ALL 
USING (public.is_org_member(auth.uid(), id));