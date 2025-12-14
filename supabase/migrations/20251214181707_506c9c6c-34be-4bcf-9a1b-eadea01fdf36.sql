-- Enable realtime for sales_events to support live POS sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_events;

-- Enable realtime for inventory_events to show live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_events;

-- Create a function to automatically deplete inventory when a sale is recorded
CREATE OR REPLACE FUNCTION public.process_sale_depletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sale_item jsonb;
  recipe_ingredient RECORD;
  qty_to_deplete numeric;
  prev_stock numeric;
  new_stock_val numeric;
BEGIN
  -- Loop through each item in the sale
  FOR sale_item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    -- Get recipe ingredients for this item
    FOR recipe_ingredient IN 
      SELECT ri.ingredient_id, ri.quantity, ri.unit, i.current_stock, i.name as ingredient_name
      FROM recipe_ingredients ri
      JOIN ingredients i ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = (sale_item->>'recipe_id')::uuid
    LOOP
      -- Calculate quantity to deplete
      qty_to_deplete := recipe_ingredient.quantity * COALESCE((sale_item->>'quantity')::numeric, 1);
      prev_stock := recipe_ingredient.current_stock;
      new_stock_val := GREATEST(0, prev_stock - qty_to_deplete);
      
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
        notes
      ) VALUES (
        recipe_ingredient.ingredient_id,
        'sale',
        -qty_to_deplete,
        prev_stock,
        new_stock_val,
        'POS Sale: ' || COALESCE(sale_item->>'recipe_name', 'Unknown'),
        'Auto-depleted from sale event ' || NEW.id::text
      );
    END LOOP;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-deplete on sale insert
DROP TRIGGER IF EXISTS trigger_process_sale_depletion ON sales_events;
CREATE TRIGGER trigger_process_sale_depletion
  AFTER INSERT ON sales_events
  FOR EACH ROW
  EXECUTE FUNCTION process_sale_depletion();