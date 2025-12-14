-- Function to resolve low stock alerts when a PO is created for those ingredients
CREATE OR REPLACE FUNCTION public.resolve_alerts_on_po_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- When a PO item is created, resolve any low stock alerts for that ingredient
  UPDATE public.alerts
  SET 
    is_resolved = true,
    resolved_at = now()
  WHERE 
    related_item_id = NEW.ingredient_id
    AND related_item_type = 'ingredient'
    AND type = 'low_stock'
    AND is_resolved = false;
  
  RETURN NEW;
END;
$$;

-- Create trigger on purchase_order_items insert
CREATE TRIGGER resolve_alerts_on_po_item_insert
AFTER INSERT ON public.purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION public.resolve_alerts_on_po_item();