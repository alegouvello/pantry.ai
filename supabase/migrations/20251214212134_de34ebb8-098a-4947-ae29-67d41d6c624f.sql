-- Fix 1: Re-enable RLS on organizations table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Fix 2: Replace overly permissive ingredient_vendor_maps policy
DROP POLICY IF EXISTS "Members can manage ingredient_vendor_maps" ON public.ingredient_vendor_maps;

CREATE POLICY "Members can manage ingredient_vendor_maps" 
ON public.ingredient_vendor_maps FOR ALL USING (
  EXISTS (
    SELECT 1 FROM ingredients i
    JOIN restaurants r ON i.restaurant_id = r.id
    JOIN memberships m ON r.org_id = m.org_id
    WHERE i.id = ingredient_vendor_maps.ingredient_id 
    AND m.user_id = auth.uid()
  )
);

-- Also add a fallback policy for ingredients without restaurant_id (legacy data)
CREATE POLICY "Authenticated users can manage orphan ingredient_vendor_maps"
ON public.ingredient_vendor_maps FOR ALL USING (
  EXISTS (
    SELECT 1 FROM ingredients i
    WHERE i.id = ingredient_vendor_maps.ingredient_id 
    AND i.restaurant_id IS NULL
    AND auth.uid() IS NOT NULL
  )
);