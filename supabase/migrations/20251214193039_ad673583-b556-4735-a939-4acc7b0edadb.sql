-- Create function to check and create low stock alerts
CREATE OR REPLACE FUNCTION public.check_low_stock_alert()
RETURNS TRIGGER AS $$
DECLARE
  existing_alert_id uuid;
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
      INSERT INTO public.alerts (
        title,
        description,
        type,
        severity,
        suggested_action,
        related_item_id,
        related_item_type
      ) VALUES (
        'Low Stock: ' || NEW.name,
        NEW.name || ' is at ' || NEW.current_stock || ' ' || NEW.unit || ', below the reorder point of ' || NEW.reorder_point || ' ' || NEW.unit || '.',
        'low_stock',
        CASE 
          WHEN NEW.current_stock <= NEW.reorder_point * 0.5 THEN 'high'
          WHEN NEW.current_stock <= NEW.reorder_point * 0.75 THEN 'medium'
          ELSE 'low'
        END,
        'Create a purchase order for ' || NEW.name || ' to bring stock up to par level (' || NEW.par_level || ' ' || NEW.unit || ').',
        NEW.id,
        'ingredient'
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on ingredients table
DROP TRIGGER IF EXISTS trigger_check_low_stock ON public.ingredients;
CREATE TRIGGER trigger_check_low_stock
  AFTER INSERT OR UPDATE OF current_stock, reorder_point, is_active
  ON public.ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.check_low_stock_alert();

-- Enable realtime for alerts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;