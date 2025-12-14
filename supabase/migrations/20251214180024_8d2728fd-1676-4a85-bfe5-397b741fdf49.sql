-- Create cost_snapshots table for tracking weekly food cost history
CREATE TABLE public.cost_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  recipe_name TEXT NOT NULL,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  menu_price NUMERIC,
  food_cost_pct NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying by date
CREATE INDEX idx_cost_snapshots_date ON public.cost_snapshots(snapshot_date DESC);
CREATE INDEX idx_cost_snapshots_recipe ON public.cost_snapshots(recipe_id);

-- Enable RLS
ALTER TABLE public.cost_snapshots ENABLE ROW LEVEL SECURITY;

-- Team can view cost snapshots
CREATE POLICY "Team can view cost snapshots"
ON public.cost_snapshots
FOR SELECT
USING (has_any_role(auth.uid()));

-- Managers can manage cost snapshots
CREATE POLICY "Managers can manage cost snapshots"
ON public.cost_snapshots
FOR ALL
USING (is_manager_or_admin(auth.uid()));

-- Create a summary table for weekly averages (more efficient querying)
CREATE TABLE public.cost_snapshot_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL,
  avg_food_cost_pct NUMERIC NOT NULL DEFAULT 0,
  total_recipes INTEGER NOT NULL DEFAULT 0,
  recipes_on_target INTEGER NOT NULL DEFAULT 0,
  recipes_warning INTEGER NOT NULL DEFAULT 0,
  recipes_high INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(week_start)
);

-- Create index for efficient querying
CREATE INDEX idx_cost_snapshot_summaries_week ON public.cost_snapshot_summaries(week_start DESC);

-- Enable RLS
ALTER TABLE public.cost_snapshot_summaries ENABLE ROW LEVEL SECURITY;

-- Team can view summaries
CREATE POLICY "Team can view cost snapshot summaries"
ON public.cost_snapshot_summaries
FOR SELECT
USING (has_any_role(auth.uid()));

-- Managers can manage summaries
CREATE POLICY "Managers can manage cost snapshot summaries"
ON public.cost_snapshot_summaries
FOR ALL
USING (is_manager_or_admin(auth.uid()));