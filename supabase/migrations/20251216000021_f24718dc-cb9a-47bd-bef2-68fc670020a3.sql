-- Fix ERROR-level security finding: enforce strict organization/restaurant scoping across multi-tenant data

-- 1) Helper function to check restaurant membership (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_restaurant_member(_user_id uuid, _restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.restaurants r
    JOIN public.memberships m ON m.org_id = r.org_id
    WHERE r.id = _restaurant_id
      AND m.user_id = _user_id
  );
$$;

-- 2) Add restaurant scoping columns where missing (nullable for backfill compatibility)
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS restaurant_id uuid;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS restaurant_id uuid;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS restaurant_id uuid;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS restaurant_id uuid;
ALTER TABLE public.inventory_events ADD COLUMN IF NOT EXISTS restaurant_id uuid;
ALTER TABLE public.cost_snapshots ADD COLUMN IF NOT EXISTS restaurant_id uuid;
ALTER TABLE public.cost_snapshot_summaries ADD COLUMN IF NOT EXISTS restaurant_id uuid;
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS restaurant_id uuid;
ALTER TABLE public.recipe_ingredients ADD COLUMN IF NOT EXISTS restaurant_id uuid;

-- 3) Backfill restaurant_id where it can be derived
-- Recipes: via menu_item -> menu_section -> menu -> restaurant
UPDATE public.recipes rec
SET restaurant_id = mn.restaurant_id
FROM public.menu_items mi
JOIN public.menu_sections ms ON ms.id = mi.menu_section_id
JOIN public.menus mn ON mn.id = ms.menu_id
WHERE rec.menu_item_id = mi.id
  AND rec.restaurant_id IS NULL;

-- Recipe ingredients: via recipe.restaurant_id
UPDATE public.recipe_ingredients ri
SET restaurant_id = rec.restaurant_id
FROM public.recipes rec
WHERE rec.id = ri.recipe_id
  AND ri.restaurant_id IS NULL;

-- Alerts: when related to ingredient, derive restaurant
UPDATE public.alerts a
SET restaurant_id = i.restaurant_id
FROM public.ingredients i
WHERE a.related_item_type = 'ingredient'
  AND a.related_item_id = i.id
  AND a.restaurant_id IS NULL;

-- Inventory events: derive restaurant from ingredient
UPDATE public.inventory_events ie
SET restaurant_id = i.restaurant_id
FROM public.ingredients i
WHERE ie.ingredient_id = i.id
  AND ie.restaurant_id IS NULL;

-- Purchase order items: derive from ingredient
UPDATE public.purchase_order_items poi
SET restaurant_id = i.restaurant_id
FROM public.ingredients i
WHERE poi.ingredient_id = i.id
  AND poi.restaurant_id IS NULL;

-- Purchase orders: derive from first item with restaurant_id
UPDATE public.purchase_orders po
SET restaurant_id = (
  SELECT poi.restaurant_id
  FROM public.purchase_order_items poi
  WHERE poi.purchase_order_id = po.id
    AND poi.restaurant_id IS NOT NULL
  LIMIT 1
)
WHERE po.restaurant_id IS NULL;

-- Cost snapshots: derive restaurant from recipe.restaurant_id if available
UPDATE public.cost_snapshots cs
SET restaurant_id = rec.restaurant_id
FROM public.recipes rec
WHERE cs.recipe_id = rec.id
  AND cs.restaurant_id IS NULL;

-- 4) Tighten RLS policies (drop overly broad ones; recreate scoped equivalents)

-- PROFILES
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Org members can view profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.memberships m_self
    JOIN public.memberships m_other ON m_other.org_id = m_self.org_id
    WHERE m_self.user_id = auth.uid()
      AND m_other.user_id = profiles.user_id
  )
);

-- USER ROLES
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
CREATE POLICY "Org members can view roles"
ON public.user_roles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.memberships m_self
    JOIN public.memberships m_other ON m_other.org_id = m_self.org_id
    WHERE m_self.user_id = auth.uid()
      AND m_other.user_id = user_roles.user_id
  )
);

-- INGREDIENTS
DROP POLICY IF EXISTS "Team can view ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Team can create ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Team can update ingredient stock" ON public.ingredients;

CREATE POLICY "Org members can view ingredients"
ON public.ingredients
FOR SELECT
USING (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Org members can create ingredients"
ON public.ingredients
FOR INSERT
WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Org members can update ingredients"
ON public.ingredients
FOR UPDATE
USING (public.is_restaurant_member(auth.uid(), restaurant_id));

-- ALERTS
DROP POLICY IF EXISTS "Team can view alerts" ON public.alerts;
DROP POLICY IF EXISTS "System can create alerts" ON public.alerts;
DROP POLICY IF EXISTS "Team can resolve alerts" ON public.alerts;

CREATE POLICY "Org members can view alerts"
ON public.alerts
FOR SELECT
USING (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Org members can create alerts"
ON public.alerts
FOR INSERT
WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Org members can update alerts"
ON public.alerts
FOR UPDATE
USING (public.is_restaurant_member(auth.uid(), restaurant_id));

-- INVENTORY EVENTS
DROP POLICY IF EXISTS "Team can view events" ON public.inventory_events;
DROP POLICY IF EXISTS "Team can log events" ON public.inventory_events;

CREATE POLICY "Org members can view inventory events"
ON public.inventory_events
FOR SELECT
USING (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Org members can log inventory events"
ON public.inventory_events
FOR INSERT
WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id));

-- RECIPES
DROP POLICY IF EXISTS "Team can view recipes" ON public.recipes;
DROP POLICY IF EXISTS "Chefs and managers can manage recipes" ON public.recipes;

CREATE POLICY "Org members can view recipes"
ON public.recipes
FOR SELECT
USING (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Chefs/managers can manage recipes in org"
ON public.recipes
FOR ALL
USING (
  public.is_restaurant_member(auth.uid(), restaurant_id)
  AND (public.has_role(auth.uid(), 'chef'::public.app_role) OR public.is_manager_or_admin(auth.uid()))
)
WITH CHECK (
  public.is_restaurant_member(auth.uid(), restaurant_id)
  AND (public.has_role(auth.uid(), 'chef'::public.app_role) OR public.is_manager_or_admin(auth.uid()))
);

-- RECIPE INGREDIENTS
DROP POLICY IF EXISTS "Team can view recipe ingredients" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Chefs and managers can manage recipe ingredients" ON public.recipe_ingredients;

CREATE POLICY "Org members can view recipe ingredients"
ON public.recipe_ingredients
FOR SELECT
USING (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Chefs/managers can manage recipe ingredients in org"
ON public.recipe_ingredients
FOR ALL
USING (
  public.is_restaurant_member(auth.uid(), restaurant_id)
  AND (public.has_role(auth.uid(), 'chef'::public.app_role) OR public.is_manager_or_admin(auth.uid()))
)
WITH CHECK (
  public.is_restaurant_member(auth.uid(), restaurant_id)
  AND (public.has_role(auth.uid(), 'chef'::public.app_role) OR public.is_manager_or_admin(auth.uid()))
);

-- VENDORS
DROP POLICY IF EXISTS "Team can view vendors" ON public.vendors;
DROP POLICY IF EXISTS "Managers can manage vendors" ON public.vendors;

CREATE POLICY "Org members can view vendors"
ON public.vendors
FOR SELECT
USING (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Managers can manage vendors in org"
ON public.vendors
FOR ALL
USING (public.is_restaurant_member(auth.uid(), restaurant_id) AND public.is_manager_or_admin(auth.uid()))
WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id) AND public.is_manager_or_admin(auth.uid()));

-- PURCHASE ORDERS
DROP POLICY IF EXISTS "Team can view orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Managers can create orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Managers can update orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.purchase_orders;

CREATE POLICY "Org members can view purchase orders"
ON public.purchase_orders
FOR SELECT
USING (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Managers can create purchase orders in org"
ON public.purchase_orders
FOR INSERT
WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id) AND public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can update purchase orders in org"
ON public.purchase_orders
FOR UPDATE
USING (public.is_restaurant_member(auth.uid(), restaurant_id) AND public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Admins can delete purchase orders in org"
ON public.purchase_orders
FOR DELETE
USING (public.is_restaurant_member(auth.uid(), restaurant_id) AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- PURCHASE ORDER ITEMS
DROP POLICY IF EXISTS "Team can view order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Managers can manage order items" ON public.purchase_order_items;

CREATE POLICY "Org members can view purchase order items"
ON public.purchase_order_items
FOR SELECT
USING (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Managers can manage purchase order items in org"
ON public.purchase_order_items
FOR ALL
USING (public.is_restaurant_member(auth.uid(), restaurant_id) AND public.is_manager_or_admin(auth.uid()))
WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id) AND public.is_manager_or_admin(auth.uid()));

-- COST SNAPSHOTS
DROP POLICY IF EXISTS "Team can view cost snapshots" ON public.cost_snapshots;
DROP POLICY IF EXISTS "Managers can manage cost snapshots" ON public.cost_snapshots;

CREATE POLICY "Org members can view cost snapshots"
ON public.cost_snapshots
FOR SELECT
USING (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Managers can manage cost snapshots in org"
ON public.cost_snapshots
FOR ALL
USING (public.is_restaurant_member(auth.uid(), restaurant_id) AND public.is_manager_or_admin(auth.uid()))
WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id) AND public.is_manager_or_admin(auth.uid()));

-- COST SNAPSHOT SUMMARIES
DROP POLICY IF EXISTS "Team can view cost snapshot summaries" ON public.cost_snapshot_summaries;
DROP POLICY IF EXISTS "Managers can manage cost snapshot summaries" ON public.cost_snapshot_summaries;

CREATE POLICY "Org members can view cost snapshot summaries"
ON public.cost_snapshot_summaries
FOR SELECT
USING (public.is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Managers can manage cost snapshot summaries in org"
ON public.cost_snapshot_summaries
FOR ALL
USING (public.is_restaurant_member(auth.uid(), restaurant_id) AND public.is_manager_or_admin(auth.uid()))
WITH CHECK (public.is_restaurant_member(auth.uid(), restaurant_id) AND public.is_manager_or_admin(auth.uid()));

-- 5) Update SECURITY DEFINER business logic functions to populate restaurant_id columns

CREATE OR REPLACE FUNCTION public.check_low_stock_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_alert_id uuid;
  severity_value alert_severity;
BEGIN
  -- Only check if stock is at or below reorder point and ingredient is active
  IF NEW.current_stock <= NEW.reorder_point AND NEW.is_active = true THEN
    -- Check if there's already an unresolved alert for this ingredient
    SELECT id INTO existing_alert_id
    FROM public.alerts
    WHERE related_item_id = NEW.id
      AND related_item_type = 'ingredient'
      AND type = 'low_stock'
      AND is_resolved = false
    LIMIT 1;

    -- Only create a new alert if one doesn't exist
    IF existing_alert_id IS NULL THEN
      -- Determine severity
      IF NEW.current_stock <= NEW.reorder_point * 0.5 THEN
        severity_value := 'high'::alert_severity;
      ELSIF NEW.current_stock <= NEW.reorder_point * 0.75 THEN
        severity_value := 'medium'::alert_severity;
      ELSE
        severity_value := 'low'::alert_severity;
      END IF;

      INSERT INTO public.alerts (
        title,
        description,
        type,
        severity,
        suggested_action,
        related_item_id,
        related_item_type,
        restaurant_id
      ) VALUES (
        'Low Stock: ' || NEW.name,
        NEW.name || ' is at ' || NEW.current_stock || ' ' || NEW.unit || ', below the reorder point of ' || NEW.reorder_point || ' ' || NEW.unit || '.',
        'low_stock',
        severity_value,
        'Create a purchase order for ' || NEW.name || ' to bring stock up to par level (' || NEW.par_level || ' ' || NEW.unit || ').',
        NEW.id,
        'ingredient',
        NEW.restaurant_id
      );
    END IF;
  ELSE
    -- If stock is back above reorder point, auto-resolve the alert
    UPDATE public.alerts
    SET is_resolved = true,
        resolved_at = now()
    WHERE related_item_id = NEW.id
      AND related_item_type = 'ingredient'
      AND type = 'low_stock'
      AND is_resolved = false;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_sale_depletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sale_item jsonb;
  recipe_ingredient RECORD;
  qty_to_deplete numeric;
  prev_stock numeric;
  new_stock_val numeric;
  ingredient_restaurant_id uuid;
BEGIN
  -- Loop through each item in the sale
  FOR sale_item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    -- Get recipe ingredients for this item
    FOR recipe_ingredient IN 
      SELECT ri.ingredient_id, ri.quantity, ri.unit, i.current_stock, i.name as ingredient_name, i.restaurant_id
      FROM recipe_ingredients ri
      JOIN ingredients i ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = (sale_item->>'recipe_id')::uuid
    LOOP
      -- Calculate quantity to deplete
      qty_to_deplete := recipe_ingredient.quantity * COALESCE((sale_item->>'quantity')::numeric, 1);
      prev_stock := recipe_ingredient.current_stock;
      new_stock_val := GREATEST(0, prev_stock - qty_to_deplete);
      ingredient_restaurant_id := recipe_ingredient.restaurant_id;

      -- Update ingredient stock
      UPDATE ingredients 
      SET current_stock = new_stock_val, updated_at = now()
      WHERE id = recipe_ingredient.ingredient_id;

      -- Log the inventory event
      INSERT INTO inventory_events (
        ingredient_id,
        event_type,
        quantity,
        previous_stock,
        new_stock,
        source,
        notes,
        restaurant_id
      ) VALUES (
        recipe_ingredient.ingredient_id,
        'sale',
        -qty_to_deplete,
        prev_stock,
        new_stock_val,
        'POS Sale: ' || COALESCE(sale_item->>'recipe_name', 'Unknown'),
        'Auto-depleted from sale event ' || NEW.id::text,
        ingredient_restaurant_id
      );
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- 6) Helpful indexes for membership checks
CREATE INDEX IF NOT EXISTS idx_recipes_restaurant_id ON public.recipes(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_vendors_restaurant_id ON public.vendors(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_restaurant_id ON public.purchase_orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_alerts_restaurant_id ON public.alerts(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_events_restaurant_id ON public.inventory_events(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_restaurant_id ON public.purchase_order_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_restaurant_id ON public.recipe_ingredients(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_cost_snapshots_restaurant_id ON public.cost_snapshots(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_cost_snapshot_summaries_restaurant_id ON public.cost_snapshot_summaries(restaurant_id);