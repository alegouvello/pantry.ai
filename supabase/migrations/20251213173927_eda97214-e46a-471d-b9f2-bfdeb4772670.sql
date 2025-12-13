-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'chef', 'staff');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create vendors table
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_email TEXT,
  phone TEXT,
  lead_time_days INTEGER DEFAULT 2,
  minimum_order DECIMAL(10,2) DEFAULT 0,
  delivery_days TEXT[] DEFAULT '{}',
  payment_terms TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create storage locations enum
CREATE TYPE public.storage_location AS ENUM ('walk_in_cooler', 'freezer', 'dry_storage', 'bar', 'other');

-- Create ingredients table
CREATE TABLE public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  storage_location storage_location DEFAULT 'dry_storage',
  current_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
  par_level DECIMAL(10,3) NOT NULL DEFAULT 0,
  reorder_point DECIMAL(10,3) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  shelf_life_days INTEGER,
  allergens TEXT[],
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  vendor_sku TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create recipes table
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  pos_item_id TEXT,
  yield_amount DECIMAL(10,3) NOT NULL DEFAULT 1,
  yield_unit TEXT NOT NULL DEFAULT 'portion',
  prep_time_minutes INTEGER,
  instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create recipe_ingredients junction table
CREATE TABLE public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10,3) NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, ingredient_id)
);

-- Create purchase order status enum
CREATE TYPE public.po_status AS ENUM ('draft', 'approved', 'sent', 'partial', 'received', 'cancelled');

-- Create purchase_orders table
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  status po_status NOT NULL DEFAULT 'draft',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  expected_delivery DATE,
  received_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create purchase_order_items table
CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity DECIMAL(10,3) NOT NULL,
  unit TEXT NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  received_quantity DECIMAL(10,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create alert type and severity enums
CREATE TYPE public.alert_type AS ENUM ('low_stock', 'expiring', 'anomaly', 'approval', 'system');
CREATE TYPE public.alert_severity AS ENUM ('low', 'medium', 'high');

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type alert_type NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  suggested_action TEXT,
  related_item_id UUID,
  related_item_type TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create inventory event type enum
CREATE TYPE public.event_type AS ENUM ('sale', 'receiving', 'adjustment', 'waste', 'transfer', 'count');

-- Create inventory_events table (audit log)
CREATE TABLE public.inventory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  event_type event_type NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  previous_stock DECIMAL(10,3) NOT NULL,
  new_stock DECIMAL(10,3) NOT NULL,
  source TEXT,
  notes TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to check if user has any role (is authenticated team member)
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
  )
$$;

-- Create function to check if user is manager or admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'manager')
  )
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON public.ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Assign default staff role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- RLS Policies for user_roles (admin only for management)
CREATE POLICY "Users can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for vendors
CREATE POLICY "Team can view vendors" ON public.vendors
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Managers can manage vendors" ON public.vendors
  FOR ALL TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- RLS Policies for ingredients
CREATE POLICY "Team can view ingredients" ON public.ingredients
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Team can update ingredient stock" ON public.ingredients
  FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Managers can manage ingredients" ON public.ingredients
  FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can delete ingredients" ON public.ingredients
  FOR DELETE TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- RLS Policies for recipes
CREATE POLICY "Team can view recipes" ON public.recipes
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Chefs and managers can manage recipes" ON public.recipes
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'chef') OR public.is_manager_or_admin(auth.uid())
  );

-- RLS Policies for recipe_ingredients
CREATE POLICY "Team can view recipe ingredients" ON public.recipe_ingredients
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Chefs and managers can manage recipe ingredients" ON public.recipe_ingredients
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'chef') OR public.is_manager_or_admin(auth.uid())
  );

-- RLS Policies for purchase_orders
CREATE POLICY "Team can view orders" ON public.purchase_orders
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Managers can create orders" ON public.purchase_orders
  FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can update orders" ON public.purchase_orders
  FOR UPDATE TO authenticated USING (public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Admins can delete orders" ON public.purchase_orders
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for purchase_order_items
CREATE POLICY "Team can view order items" ON public.purchase_order_items
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Managers can manage order items" ON public.purchase_order_items
  FOR ALL TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- RLS Policies for alerts
CREATE POLICY "Team can view alerts" ON public.alerts
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Team can resolve alerts" ON public.alerts
  FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "System can create alerts" ON public.alerts
  FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid()));

-- RLS Policies for inventory_events
CREATE POLICY "Team can view events" ON public.inventory_events
  FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));

CREATE POLICY "Team can log events" ON public.inventory_events
  FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_ingredients_vendor ON public.ingredients(vendor_id);
CREATE INDEX idx_ingredients_category ON public.ingredients(category);
CREATE INDEX idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient ON public.recipe_ingredients(ingredient_id);
CREATE INDEX idx_purchase_orders_vendor ON public.purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_purchase_order_items_po ON public.purchase_order_items(purchase_order_id);
CREATE INDEX idx_alerts_type ON public.alerts(type);
CREATE INDEX idx_alerts_resolved ON public.alerts(is_resolved);
CREATE INDEX idx_inventory_events_ingredient ON public.inventory_events(ingredient_id);
CREATE INDEX idx_inventory_events_type ON public.inventory_events(event_type);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);