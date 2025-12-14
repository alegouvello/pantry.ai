-- Create forecast_events table for holidays, special occasions, and manual adjustments
CREATE TABLE public.forecast_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  event_date DATE NOT NULL,
  name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'custom', -- holiday, special_event, reservation, weather, custom
  impact_percent NUMERIC NOT NULL DEFAULT 0, -- e.g., 20 for +20%, -15 for -15%
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forecast_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Members can manage forecast_events"
ON public.forecast_events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM restaurants r
    JOIN memberships m ON r.org_id = m.org_id
    WHERE r.id = forecast_events.restaurant_id
    AND m.user_id = auth.uid()
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_forecast_events_updated_at
  BEFORE UPDATE ON public.forecast_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some default holidays as examples (will need restaurant_id when used)
COMMENT ON TABLE public.forecast_events IS 'Stores events, holidays, and special occasions that affect forecast predictions';