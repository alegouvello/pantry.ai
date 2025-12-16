-- Fix 1: Recipe Images Bucket - Add org-scoped storage policies
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete recipe images" ON storage.objects;

-- Create org-scoped policies for recipe images
-- Path pattern: recipes/{org_id}/{filename}
CREATE POLICY "Users can upload recipe images in their org"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'recipe-images'
  AND auth.role() = 'authenticated'
  AND (
    (string_to_array(name, '/'))[1] = 'recipes'
    AND (string_to_array(name, '/'))[2]::uuid IN (
      SELECT org_id FROM public.memberships WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update recipe images in their org"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'recipe-images'
  AND auth.role() = 'authenticated'
  AND (
    (string_to_array(name, '/'))[1] = 'recipes'
    AND (string_to_array(name, '/'))[2]::uuid IN (
      SELECT org_id FROM public.memberships WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete recipe images in their org"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'recipe-images'
  AND auth.role() = 'authenticated'
  AND (
    (string_to_array(name, '/'))[1] = 'recipes'
    AND (string_to_array(name, '/'))[2]::uuid IN (
      SELECT org_id FROM public.memberships WHERE user_id = auth.uid()
    )
  )
);

-- Fix 2: Org creation rate limiting - max 5 orgs per user
CREATE OR REPLACE FUNCTION public.check_org_creation_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.memberships WHERE user_id = auth.uid()) >= 5 THEN
    RAISE EXCEPTION 'Maximum organization limit (5) reached for this user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS limit_org_creation ON public.organizations;
CREATE TRIGGER limit_org_creation
  BEFORE INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_org_creation_limit();