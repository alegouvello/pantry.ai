-- Function to get the user's first restaurant_id from their memberships
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id
  FROM public.restaurants r
  JOIN public.memberships m ON m.org_id = r.org_id
  WHERE m.user_id = _user_id
  LIMIT 1
$$;

-- Trigger function to auto-set restaurant_id on recipes
CREATE OR REPLACE FUNCTION public.set_recipe_restaurant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only set if restaurant_id is null
  IF NEW.restaurant_id IS NULL THEN
    NEW.restaurant_id := get_user_restaurant_id(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function to auto-set restaurant_id on recipe_ingredients
CREATE OR REPLACE FUNCTION public.set_recipe_ingredient_restaurant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid;
BEGIN
  -- Only set if restaurant_id is null
  IF NEW.restaurant_id IS NULL THEN
    -- First try to get restaurant_id from the parent recipe
    SELECT restaurant_id INTO v_restaurant_id
    FROM public.recipes
    WHERE id = NEW.recipe_id;
    
    -- If recipe has restaurant_id, use it; otherwise get from user's membership
    IF v_restaurant_id IS NOT NULL THEN
      NEW.restaurant_id := v_restaurant_id;
    ELSE
      NEW.restaurant_id := get_user_restaurant_id(auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on recipes table
DROP TRIGGER IF EXISTS tr_set_recipe_restaurant_id ON public.recipes;
CREATE TRIGGER tr_set_recipe_restaurant_id
  BEFORE INSERT ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_recipe_restaurant_id();

-- Create trigger on recipe_ingredients table
DROP TRIGGER IF EXISTS tr_set_recipe_ingredient_restaurant_id ON public.recipe_ingredients;
CREATE TRIGGER tr_set_recipe_ingredient_restaurant_id
  BEFORE INSERT ON public.recipe_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_recipe_ingredient_restaurant_id();