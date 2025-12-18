-- Create a trigger function to enforce user_id on inventory_events
-- This ensures user_id is always set to the authenticated user, regardless of client input
CREATE OR REPLACE FUNCTION public.set_inventory_event_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Always override user_id with the authenticated user
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce user_id before insert
DROP TRIGGER IF EXISTS enforce_inventory_event_user ON public.inventory_events;
CREATE TRIGGER enforce_inventory_event_user
  BEFORE INSERT ON public.inventory_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_inventory_event_user();