// Onboarding Types

export type ConceptType = 'fine_dining' | 'casual' | 'quick_service' | 'bar' | 'coffee' | 'bakery' | 'cocktail' | 'multi';

export type ServiceType = 'lunch' | 'dinner' | 'brunch' | 'delivery' | 'catering' | 'tasting_menu' | 'seasonal_menu';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
}

export interface OnboardingProgress {
  id: string;
  user_id: string;
  org_id: string;
  current_step: number;
  completed_steps: number[];
  setup_health_score: number;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  org_id: string;
  role: string;
  created_at: string;
}

export interface RestaurantAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface RestaurantBrand {
  accentColor?: string;
  logoUrl?: string;
  heroImageUrl?: string;
}

export interface RestaurantHours {
  [day: string]: { open: string; close: string; closed?: boolean };
}

export interface Restaurant {
  id: string;
  org_id: string;
  name: string;
  address: RestaurantAddress;
  phone?: string;
  website?: string;
  instagram?: string;
  concept_type?: ConceptType;
  services: ServiceType[];
  timezone: string;
  currency: string;
  hours: RestaurantHours;
  cuisine_tags: string[];
  brand: RestaurantBrand;
  created_at: string;
  updated_at: string;
}

export interface EnrichmentSnapshot {
  id: string;
  restaurant_id: string;
  sources: { type: string; url: string }[];
  extracted: {
    hours?: RestaurantHours;
    menuUrls?: string[];
    tags?: string[];
    images?: string[];
  };
  confidence: ConfidenceLevel;
  created_at: string;
}

export interface Menu {
  id: string;
  restaurant_id: string;
  name: string;
  source_type?: string;
  source_ref?: string;
  is_monitored: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuSection {
  id: string;
  menu_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  menu_section_id: string;
  name: string;
  description?: string;
  price?: number;
  tags: string[];
  variants?: Record<string, any>;
  source_confidence: ConfidenceLevel;
  needs_attention: boolean;
  is_seasonal: boolean;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface MenuParseSnapshot {
  id: string;
  menu_id: string;
  raw_input_ref?: string;
  parsed_output: any;
  created_at: string;
}

export interface StorageLocation {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface InventoryBalance {
  id: string;
  restaurant_id: string;
  ingredient_id: string;
  storage_location_id?: string;
  quantity_on_hand: number;
  unit: string;
  updated_at: string;
}

export interface VendorItem {
  id: string;
  vendor_id: string;
  name: string;
  sku?: string;
  pack_size?: string;
  pack_unit?: string;
  unit_cost: number;
  preferred: boolean;
  created_at: string;
}

export interface IngredientVendorMap {
  id: string;
  ingredient_id: string;
  vendor_item_id: string;
  conversion: Record<string, any>;
  priority_rank: number;
  created_at: string;
}

export interface Integration {
  id: string;
  restaurant_id: string;
  type: string;
  status: string;
  credentials_ref?: string;
  last_sync_at?: string;
  created_at: string;
}

export interface PosMenuItem {
  id: string;
  integration_id: string;
  external_id: string;
  name: string;
  raw_data?: Record<string, any>;
  created_at: string;
}

export interface PosRecipeMap {
  id: string;
  pos_menu_item_id: string;
  recipe_id: string;
  confidence: ConfidenceLevel;
  created_at: string;
}

export interface ReorderRule {
  id: string;
  restaurant_id: string;
  ingredient_id: string;
  reorder_point_qty: number;
  par_qty: number;
  safety_buffer_level: string;
  preferred_vendor_id?: string;
  created_at: string;
}

export interface ForecastConfig {
  id: string;
  restaurant_id: string;
  horizon_days: number;
  method: string;
  auto_alert: boolean;
  auto_generate_po: boolean;
  require_approval: boolean;
  updated_at: string;
}

// AI Response Types
export interface AIConfidenceItem<T> {
  data: T;
  confidence: ConfidenceLevel;
  reason: string;
}

export interface BusinessEnrichmentResult {
  hours?: AIConfidenceItem<RestaurantHours>;
  menuUrls?: AIConfidenceItem<string[]>;
  cuisineTags?: AIConfidenceItem<string[]>;
  images?: AIConfidenceItem<string[]>;
}

export interface ParsedMenuResult {
  sections: AIConfidenceItem<{
    name: string;
    items: {
      name: string;
      description?: string;
      price?: number;
      tags?: string[];
    }[];
  }>[];
}

export interface DraftRecipe {
  menuItemId: string;
  name: string;
  ingredients: AIConfidenceItem<{
    name: string;
    quantity: number;
    unit: string;
    optional?: boolean;
  }>[];
  yield?: string;
  allergens?: string[];
  confidence: ConfidenceLevel;
  reason: string;
}

// Concept imagery mapping
export const CONCEPT_IMAGES: Record<ConceptType, string> = {
  fine_dining: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
  casual: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
  quick_service: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400',
  bar: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400',
  coffee: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400',
  bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
  cocktail: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400',
  multi: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400',
};

export const CONCEPT_LABELS: Record<ConceptType, string> = {
  fine_dining: 'Fine Dining',
  casual: 'Casual Dining',
  quick_service: 'Quick Service',
  bar: 'Bar',
  coffee: 'Coffee Shop',
  bakery: 'Bakery',
  cocktail: 'Cocktail Bar',
  multi: 'Multi-Concept',
};

export const SERVICE_LABELS: Record<ServiceType, string> = {
  lunch: 'Lunch',
  dinner: 'Dinner',
  brunch: 'Brunch',
  delivery: 'Delivery',
  catering: 'Catering',
  tasting_menu: 'Tasting Menu',
  seasonal_menu: 'Seasonal Menu',
};
