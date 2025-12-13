-- Drop the broken policies
DROP POLICY IF EXISTS "Users can manage memberships in their org" ON public.memberships;
DROP POLICY IF EXISTS "Users can manage their org" ON public.organizations;

-- Create fixed policy for memberships - owners can manage memberships in their org
CREATE POLICY "Users can manage memberships in their org" 
ON public.memberships 
FOR ALL 
USING (
  org_id IN (
    SELECT m.org_id FROM public.memberships m 
    WHERE m.user_id = auth.uid() AND m.role = 'owner'
  )
);

-- Create fixed policy for organizations - users can manage orgs they belong to
CREATE POLICY "Users can manage their org" 
ON public.organizations 
FOR ALL 
USING (
  id IN (
    SELECT m.org_id FROM public.memberships m 
    WHERE m.user_id = auth.uid()
  )
);

-- Also add INSERT policy for organizations so new users can create their org
CREATE POLICY "Authenticated users can create organizations" 
ON public.organizations 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Add INSERT policy for memberships so users can add themselves to their org
CREATE POLICY "Users can insert their own membership" 
ON public.memberships 
FOR INSERT 
WITH CHECK (user_id = auth.uid());