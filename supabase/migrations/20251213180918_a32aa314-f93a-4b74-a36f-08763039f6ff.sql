-- Organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Memberships (user to org)
CREATE TABLE public.memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, org_id)
);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- Restaurants table
CREATE TABLE public.restaurants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address JSONB DEFAULT '{}',
  phone TEXT,
  website TEXT,
  instagram TEXT,
  concept_type TEXT,
  services TEXT[] DEFAULT '{}',
  timezone TEXT DEFAULT 'America/New_York',
  currency TEXT DEFAULT 'USD',
  hours JSONB DEFAULT '{}',
  cuisine_tags TEXT[] DEFAULT '{}',
  brand JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Enrichment snapshots
CREATE TABLE public.enrichment_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  sources JSONB DEFAULT '[]',
  extracted JSONB DEFAULT '{}',
  confidence TEXT DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.enrichment_snapshots ENABLE ROW LEVEL SECURITY;

-- Menus
CREATE TABLE public.menus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Main Menu',
  source_type TEXT,
  source_ref TEXT,
  is_monitored BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

-- Menu sections
CREATE TABLE public.menu_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_sections ENABLE ROW LEVEL SECURITY;

-- Menu items
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_section_id UUID NOT NULL REFERENCES public.menu_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  tags TEXT[] DEFAULT '{}',
  variants JSONB,
  source_confidence TEXT DEFAULT 'medium',
  needs_attention BOOLEAN DEFAULT false,
  is_seasonal BOOLEAN DEFAULT false,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Menu parse snapshots
CREATE TABLE public.menu_parse_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  raw_input_ref TEXT,
  parsed_output JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_parse_snapshots ENABLE ROW LEVEL SECURITY;

-- Storage locations
CREATE TABLE public.storage_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;

-- Inventory balances
CREATE TABLE public.inventory_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  storage_location_id UUID REFERENCES public.storage_locations(id),
  quantity_on_hand NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, ingredient_id, storage_location_id)
);

ALTER TABLE public.inventory_balances ENABLE ROW LEVEL SECURITY;

-- Recipe draft snapshots
CREATE TABLE public.recipe_draft_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ai_proposal JSONB,
  user_edits JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recipe_draft_snapshots ENABLE ROW LEVEL SECURITY;

-- Vendor items (detailed catalog)
CREATE TABLE public.vendor_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  pack_size TEXT,
  pack_unit TEXT,
  unit_cost NUMERIC DEFAULT 0,
  preferred BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_items ENABLE ROW LEVEL SECURITY;

-- Ingredient to vendor item mapping
CREATE TABLE public.ingredient_vendor_maps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  vendor_item_id UUID NOT NULL REFERENCES public.vendor_items(id) ON DELETE CASCADE,
  conversion JSONB DEFAULT '{}',
  priority_rank INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ingredient_vendor_maps ENABLE ROW LEVEL SECURITY;

-- Integrations (POS, etc)
CREATE TABLE public.integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  credentials_ref TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- POS menu items
CREATE TABLE public.pos_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_menu_items ENABLE ROW LEVEL SECURITY;

-- POS to recipe mapping
CREATE TABLE public.pos_recipe_maps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pos_menu_item_id UUID NOT NULL REFERENCES public.pos_menu_items(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  confidence TEXT DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_recipe_maps ENABLE ROW LEVEL SECURITY;

-- Sales events from POS
CREATE TABLE public.sales_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  external_order_id TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  items JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_events ENABLE ROW LEVEL SECURITY;

-- Reorder rules
CREATE TABLE public.reorder_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  reorder_point_qty NUMERIC NOT NULL DEFAULT 0,
  par_qty NUMERIC NOT NULL DEFAULT 0,
  safety_buffer_level TEXT DEFAULT 'medium',
  preferred_vendor_id UUID REFERENCES public.vendors(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, ingredient_id)
);

ALTER TABLE public.reorder_rules ENABLE ROW LEVEL SECURITY;

-- Forecast config
CREATE TABLE public.forecast_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  horizon_days INTEGER DEFAULT 7,
  method TEXT DEFAULT 'DOW_AVG',
  auto_alert BOOLEAN DEFAULT true,
  auto_generate_po BOOLEAN DEFAULT false,
  require_approval BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id)
);

ALTER TABLE public.forecast_configs ENABLE ROW LEVEL SECURITY;

-- Learning signals
CREATE TABLE public.learning_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_signals ENABLE ROW LEVEL SECURITY;

-- Onboarding progress tracking
CREATE TABLE public.onboarding_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1,
  completed_steps INTEGER[] DEFAULT '{}',
  setup_health_score INTEGER DEFAULT 0,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, org_id)
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Add menu_item_id to recipes
ALTER TABLE public.recipes ADD COLUMN menu_item_id UUID REFERENCES public.menu_items(id);
ALTER TABLE public.recipes ADD COLUMN recipe_type TEXT DEFAULT 'Dish';
ALTER TABLE public.recipes ADD COLUMN status TEXT DEFAULT 'Draft';
ALTER TABLE public.recipes ADD COLUMN confidence TEXT DEFAULT 'medium';
ALTER TABLE public.recipes ADD COLUMN portion_size TEXT;

-- Add restaurant_id to ingredients
ALTER TABLE public.ingredients ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.ingredients ADD COLUMN storage_location_id UUID REFERENCES public.storage_locations(id);
ALTER TABLE public.ingredients ADD COLUMN default_unit TEXT;

-- RLS Policies for all new tables
CREATE POLICY "Users can manage their org" ON public.organizations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.memberships WHERE org_id = id AND user_id = auth.uid())
);

CREATE POLICY "Users can view their memberships" ON public.memberships FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage memberships in their org" ON public.memberships FOR ALL USING (
  EXISTS (SELECT 1 FROM public.memberships m WHERE m.org_id = org_id AND m.user_id = auth.uid() AND m.role = 'owner')
);

CREATE POLICY "Members can manage restaurants" ON public.restaurants FOR ALL USING (
  EXISTS (SELECT 1 FROM public.memberships WHERE org_id = restaurants.org_id AND user_id = auth.uid())
);

CREATE POLICY "Members can manage enrichment_snapshots" ON public.enrichment_snapshots FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants r JOIN public.memberships m ON r.org_id = m.org_id WHERE r.id = restaurant_id AND m.user_id = auth.uid())
);

CREATE POLICY "Members can manage menus" ON public.menus FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants r JOIN public.memberships m ON r.org_id = m.org_id WHERE r.id = restaurant_id AND m.user_id = auth.uid())
);

CREATE POLICY "Members can manage menu_sections" ON public.menu_sections FOR ALL USING (
  EXISTS (SELECT 1 FROM public.menus mn JOIN public.restaurants r ON mn.restaurant_id = r.id JOIN public.memberships m ON r.org_id = m.org_id WHERE mn.id = menu_id AND m.user_id = auth.uid())
);

CREATE POLICY "Members can manage menu_items" ON public.menu_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.menu_sections ms JOIN public.menus mn ON ms.menu_id = mn.id JOIN public.restaurants r ON mn.restaurant_id = r.id JOIN public.memberships m ON r.org_id = m.org_id WHERE ms.id = menu_section_id AND m.user_id = auth.uid())
);

CREATE POLICY "Members can manage menu_parse_snapshots" ON public.menu_parse_snapshots FOR ALL USING (
  EXISTS (SELECT 1 FROM public.menus mn JOIN public.restaurants r ON mn.restaurant_id = r.id JOIN public.memberships m ON r.org_id = m.org_id WHERE mn.id = menu_id AND m.user_id = auth.uid())
);

CREATE POLICY "Members can manage storage_locations" ON public.storage_locations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants r JOIN public.memberships m ON r.org_id = m.org_id WHERE r.id = restaurant_id AND m.user_id = auth.uid())
);

CREATE POLICY "Members can manage inventory_balances" ON public.inventory_balances FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants r JOIN public.memberships m ON r.org_id = m.org_id WHERE r.id = restaurant_id AND m.user_id = auth.uid())
);

CREATE POLICY "Members can manage recipe_draft_snapshots" ON public.recipe_draft_snapshots FOR ALL USING (
  EXISTS (SELECT 1 FROM public.recipes rec WHERE rec.id = recipe_id)
);

CREATE POLICY "Members can manage vendor_items" ON public.vendor_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id)
);

CREATE POLICY "Members can manage ingredient_vendor_maps" ON public.ingredient_vendor_maps FOR ALL USING (true);

CREATE POLICY "Members can manage integrations" ON public.integrations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants r JOIN public.memberships m ON r.org_id = m.org_id WHERE r.id = restaurant_id AND m.user_id = auth.uid())
);

CREATE POLICY "Members can manage pos_menu_items" ON public.pos_menu_items FOR ALL USING (true);
CREATE POLICY "Members can manage pos_recipe_maps" ON public.pos_recipe_maps FOR ALL USING (true);

CREATE POLICY "Members can manage sales_events" ON public.sales_events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants r JOIN public.memberships m ON r.org_id = m.org_id WHERE r.id = restaurant_id AND m.user_id = auth.uid())
);

CREATE POLICY "Members can manage reorder_rules" ON public.reorder_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants r JOIN public.memberships m ON r.org_id = m.org_id WHERE r.id = restaurant_id AND m.user_id = auth.uid())
);

CREATE POLICY "Members can manage forecast_configs" ON public.forecast_configs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants r JOIN public.memberships m ON r.org_id = m.org_id WHERE r.id = restaurant_id AND m.user_id = auth.uid())
);

CREATE POLICY "Members can manage learning_signals" ON public.learning_signals FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants r JOIN public.memberships m ON r.org_id = m.org_id WHERE r.id = restaurant_id AND m.user_id = auth.uid())
);

CREATE POLICY "Users can manage their onboarding" ON public.onboarding_progress FOR ALL USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_menus_updated_at BEFORE UPDATE ON public.menus FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_onboarding_progress_updated_at BEFORE UPDATE ON public.onboarding_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();