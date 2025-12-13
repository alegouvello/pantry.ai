-- Add menu_price column to recipes table for food cost calculation
ALTER TABLE public.recipes
ADD COLUMN menu_price numeric DEFAULT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN public.recipes.menu_price IS 'The selling price of the recipe on the menu, used for food cost percentage calculation';