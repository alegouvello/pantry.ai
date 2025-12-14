-- Fix 1: POS Integration Tables Have Unrestricted Access
-- Replace permissive 'true' policies with proper organization-scoped policies

-- Fix pos_menu_items policy
DROP POLICY IF EXISTS "Members can manage pos_menu_items" ON public.pos_menu_items;

CREATE POLICY "Members can manage pos_menu_items" ON public.pos_menu_items
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM integrations i
      JOIN restaurants r ON i.restaurant_id = r.id
      JOIN memberships m ON r.org_id = m.org_id
      WHERE i.id = pos_menu_items.integration_id
      AND m.user_id = auth.uid()
    )
  );

-- Fix pos_recipe_maps policy
DROP POLICY IF EXISTS "Members can manage pos_recipe_maps" ON public.pos_recipe_maps;

CREATE POLICY "Members can manage pos_recipe_maps" ON public.pos_recipe_maps
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM pos_menu_items pmi
      JOIN integrations i ON pmi.integration_id = i.id
      JOIN restaurants r ON i.restaurant_id = r.id
      JOIN memberships m ON r.org_id = m.org_id
      WHERE pmi.id = pos_recipe_maps.pos_menu_item_id
      AND m.user_id = auth.uid()
    )
  );