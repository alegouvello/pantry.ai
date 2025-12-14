-- Fix the check_low_stock_alert function to properly cast severity
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
        related_item_type
      ) VALUES (
        'Low Stock: ' || NEW.name,
        NEW.name || ' is at ' || NEW.current_stock || ' ' || NEW.unit || ', below the reorder point of ' || NEW.reorder_point || ' ' || NEW.unit || '.',
        'low_stock',
        severity_value,
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
$function$;