export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_resolved: boolean | null
          related_item_id: string | null
          related_item_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          suggested_action: string | null
          title: string
          type: Database["public"]["Enums"]["alert_type"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_resolved?: boolean | null
          related_item_id?: string | null
          related_item_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          suggested_action?: string | null
          title: string
          type: Database["public"]["Enums"]["alert_type"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_resolved?: boolean | null
          related_item_id?: string | null
          related_item_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          suggested_action?: string | null
          title?: string
          type?: Database["public"]["Enums"]["alert_type"]
        }
        Relationships: []
      }
      cost_snapshot_summaries: {
        Row: {
          avg_food_cost_pct: number
          created_at: string
          id: string
          recipes_high: number
          recipes_on_target: number
          recipes_warning: number
          total_recipes: number
          week_start: string
        }
        Insert: {
          avg_food_cost_pct?: number
          created_at?: string
          id?: string
          recipes_high?: number
          recipes_on_target?: number
          recipes_warning?: number
          total_recipes?: number
          week_start: string
        }
        Update: {
          avg_food_cost_pct?: number
          created_at?: string
          id?: string
          recipes_high?: number
          recipes_on_target?: number
          recipes_warning?: number
          total_recipes?: number
          week_start?: string
        }
        Relationships: []
      }
      cost_snapshots: {
        Row: {
          created_at: string
          food_cost_pct: number | null
          id: string
          menu_price: number | null
          recipe_id: string | null
          recipe_name: string
          snapshot_date: string
          total_cost: number
        }
        Insert: {
          created_at?: string
          food_cost_pct?: number | null
          id?: string
          menu_price?: number | null
          recipe_id?: string | null
          recipe_name: string
          snapshot_date?: string
          total_cost?: number
        }
        Update: {
          created_at?: string
          food_cost_pct?: number | null
          id?: string
          menu_price?: number | null
          recipe_id?: string | null
          recipe_name?: string
          snapshot_date?: string
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "cost_snapshots_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      enrichment_snapshots: {
        Row: {
          confidence: string | null
          created_at: string
          extracted: Json | null
          id: string
          restaurant_id: string
          sources: Json | null
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          extracted?: Json | null
          id?: string
          restaurant_id: string
          sources?: Json | null
        }
        Update: {
          confidence?: string | null
          created_at?: string
          extracted?: Json | null
          id?: string
          restaurant_id?: string
          sources?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_snapshots_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_configs: {
        Row: {
          auto_alert: boolean | null
          auto_generate_po: boolean | null
          horizon_days: number | null
          id: string
          method: string | null
          require_approval: boolean | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          auto_alert?: boolean | null
          auto_generate_po?: boolean | null
          horizon_days?: number | null
          id?: string
          method?: string | null
          require_approval?: boolean | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          auto_alert?: boolean | null
          auto_generate_po?: boolean | null
          horizon_days?: number | null
          id?: string
          method?: string | null
          require_approval?: boolean | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecast_configs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_events: {
        Row: {
          created_at: string
          event_date: string
          event_type: string
          id: string
          impact_percent: number
          is_recurring: boolean | null
          name: string
          notes: string | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_type?: string
          id?: string
          impact_percent?: number
          is_recurring?: boolean | null
          name: string
          notes?: string | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          impact_percent?: number
          is_recurring?: boolean | null
          name?: string
          notes?: string | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      ingredient_vendor_maps: {
        Row: {
          conversion: Json | null
          created_at: string
          id: string
          ingredient_id: string
          priority_rank: number | null
          vendor_item_id: string
        }
        Insert: {
          conversion?: Json | null
          created_at?: string
          id?: string
          ingredient_id: string
          priority_rank?: number | null
          vendor_item_id: string
        }
        Update: {
          conversion?: Json | null
          created_at?: string
          id?: string
          ingredient_id?: string
          priority_rank?: number | null
          vendor_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_vendor_maps_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_vendor_maps_vendor_item_id_fkey"
            columns: ["vendor_item_id"]
            isOneToOne: false
            referencedRelation: "vendor_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          allergens: string[] | null
          category: string
          created_at: string
          current_stock: number
          default_unit: string | null
          id: string
          is_active: boolean | null
          name: string
          par_level: number
          reorder_point: number
          restaurant_id: string | null
          shelf_life_days: number | null
          storage_location:
            | Database["public"]["Enums"]["storage_location"]
            | null
          storage_location_id: string | null
          unit: string
          unit_cost: number
          updated_at: string
          vendor_id: string | null
          vendor_sku: string | null
        }
        Insert: {
          allergens?: string[] | null
          category: string
          created_at?: string
          current_stock?: number
          default_unit?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          par_level?: number
          reorder_point?: number
          restaurant_id?: string | null
          shelf_life_days?: number | null
          storage_location?:
            | Database["public"]["Enums"]["storage_location"]
            | null
          storage_location_id?: string | null
          unit: string
          unit_cost?: number
          updated_at?: string
          vendor_id?: string | null
          vendor_sku?: string | null
        }
        Update: {
          allergens?: string[] | null
          category?: string
          created_at?: string
          current_stock?: number
          default_unit?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          par_level?: number
          reorder_point?: number
          restaurant_id?: string | null
          shelf_life_days?: number | null
          storage_location?:
            | Database["public"]["Enums"]["storage_location"]
            | null
          storage_location_id?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
          vendor_id?: string | null
          vendor_sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          created_at: string
          credentials_ref: string | null
          id: string
          last_sync_at: string | null
          restaurant_id: string
          status: string | null
          type: string
        }
        Insert: {
          created_at?: string
          credentials_ref?: string | null
          id?: string
          last_sync_at?: string | null
          restaurant_id: string
          status?: string | null
          type: string
        }
        Update: {
          created_at?: string
          credentials_ref?: string | null
          id?: string
          last_sync_at?: string | null
          restaurant_id?: string
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_balances: {
        Row: {
          id: string
          ingredient_id: string
          quantity_on_hand: number
          restaurant_id: string
          storage_location_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          id?: string
          ingredient_id: string
          quantity_on_hand?: number
          restaurant_id: string
          storage_location_id?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          id?: string
          ingredient_id?: string
          quantity_on_hand?: number
          restaurant_id?: string
          storage_location_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_balances_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_events: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          ingredient_id: string
          new_stock: number
          notes: string | null
          previous_stock: number
          quantity: number
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          ingredient_id: string
          new_stock: number
          notes?: string | null
          previous_stock: number
          quantity: number
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          ingredient_id?: string
          new_stock?: number
          notes?: string | null
          previous_stock?: number
          quantity?: number
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_events_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_signals: {
        Row: {
          created_at: string
          id: string
          payload: Json | null
          restaurant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json | null
          restaurant_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json | null
          restaurant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_signals_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_seasonal: boolean | null
          menu_section_id: string
          name: string
          needs_attention: boolean | null
          price: number | null
          source_confidence: string | null
          tags: string[] | null
          updated_at: string
          variants: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_seasonal?: boolean | null
          menu_section_id: string
          name: string
          needs_attention?: boolean | null
          price?: number | null
          source_confidence?: string | null
          tags?: string[] | null
          updated_at?: string
          variants?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_seasonal?: boolean | null
          menu_section_id?: string
          name?: string
          needs_attention?: boolean | null
          price?: number | null
          source_confidence?: string | null
          tags?: string[] | null
          updated_at?: string
          variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_menu_section_id_fkey"
            columns: ["menu_section_id"]
            isOneToOne: false
            referencedRelation: "menu_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_parse_snapshots: {
        Row: {
          created_at: string
          id: string
          menu_id: string
          parsed_output: Json | null
          raw_input_ref: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          menu_id: string
          parsed_output?: Json | null
          raw_input_ref?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          menu_id?: string
          parsed_output?: Json | null
          raw_input_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_parse_snapshots_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_sections: {
        Row: {
          created_at: string
          id: string
          menu_id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          menu_id: string
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          menu_id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_sections_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          created_at: string
          id: string
          is_monitored: boolean | null
          name: string
          restaurant_id: string
          source_ref: string | null
          source_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_monitored?: boolean | null
          name?: string
          restaurant_id: string
          source_ref?: string | null
          source_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_monitored?: boolean | null
          name?: string
          restaurant_id?: string
          source_ref?: string | null
          source_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          completed_steps: number[] | null
          created_at: string
          current_step: number | null
          data: Json | null
          id: string
          org_id: string
          setup_health_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_steps?: number[] | null
          created_at?: string
          current_step?: number | null
          data?: Json | null
          id?: string
          org_id: string
          setup_health_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_steps?: number[] | null
          created_at?: string
          current_step?: number | null
          data?: Json | null
          id?: string
          org_id?: string
          setup_health_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pos_menu_items: {
        Row: {
          created_at: string
          external_id: string
          id: string
          integration_id: string
          name: string
          raw_data: Json | null
        }
        Insert: {
          created_at?: string
          external_id: string
          id?: string
          integration_id: string
          name: string
          raw_data?: Json | null
        }
        Update: {
          created_at?: string
          external_id?: string
          id?: string
          integration_id?: string
          name?: string
          raw_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_menu_items_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_recipe_maps: {
        Row: {
          confidence: string | null
          created_at: string
          id: string
          pos_menu_item_id: string
          recipe_id: string
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          id?: string
          pos_menu_item_id: string
          recipe_id: string
        }
        Update: {
          confidence?: string | null
          created_at?: string
          id?: string
          pos_menu_item_id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_recipe_maps_pos_menu_item_id_fkey"
            columns: ["pos_menu_item_id"]
            isOneToOne: false
            referencedRelation: "pos_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_recipe_maps_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          purchase_order_id: string
          quantity: number
          received_quantity: number | null
          unit: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          purchase_order_id: string
          quantity: number
          received_quantity?: number | null
          unit: string
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number | null
          unit?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string | null
          expected_delivery: string | null
          id: string
          notes: string | null
          received_at: string | null
          status: Database["public"]["Enums"]["po_status"]
          total_amount: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          received_at?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          total_amount?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          received_at?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          total_amount?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_draft_snapshots: {
        Row: {
          ai_proposal: Json | null
          created_at: string
          id: string
          recipe_id: string
          user_edits: Json | null
        }
        Insert: {
          ai_proposal?: Json | null
          created_at?: string
          id?: string
          recipe_id: string
          user_edits?: Json | null
        }
        Update: {
          ai_proposal?: Json | null
          created_at?: string
          id?: string
          recipe_id?: string
          user_edits?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_draft_snapshots_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          quantity: number
          recipe_id: string
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          quantity: number
          recipe_id: string
          unit: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          quantity?: number
          recipe_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          category: string
          confidence: string | null
          created_at: string
          id: string
          image_url: string | null
          instructions: string | null
          is_active: boolean | null
          menu_item_id: string | null
          menu_price: number | null
          name: string
          portion_size: string | null
          pos_item_id: string | null
          prep_time_minutes: number | null
          recipe_type: string | null
          status: string | null
          updated_at: string
          yield_amount: number
          yield_unit: string
        }
        Insert: {
          category: string
          confidence?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_active?: boolean | null
          menu_item_id?: string | null
          menu_price?: number | null
          name: string
          portion_size?: string | null
          pos_item_id?: string | null
          prep_time_minutes?: number | null
          recipe_type?: string | null
          status?: string | null
          updated_at?: string
          yield_amount?: number
          yield_unit?: string
        }
        Update: {
          category?: string
          confidence?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_active?: boolean | null
          menu_item_id?: string | null
          menu_price?: number | null
          name?: string
          portion_size?: string | null
          pos_item_id?: string | null
          prep_time_minutes?: number | null
          recipe_type?: string | null
          status?: string | null
          updated_at?: string
          yield_amount?: number
          yield_unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      reorder_rules: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          par_qty: number
          preferred_vendor_id: string | null
          reorder_point_qty: number
          restaurant_id: string
          safety_buffer_level: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          par_qty?: number
          preferred_vendor_id?: string | null
          reorder_point_qty?: number
          restaurant_id: string
          safety_buffer_level?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          par_qty?: number
          preferred_vendor_id?: string | null
          reorder_point_qty?: number
          restaurant_id?: string
          safety_buffer_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reorder_rules_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_rules_preferred_vendor_id_fkey"
            columns: ["preferred_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_rules_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: Json | null
          brand: Json | null
          concept_type: string | null
          created_at: string
          cuisine_tags: string[] | null
          currency: string | null
          hours: Json | null
          id: string
          instagram: string | null
          name: string
          org_id: string
          phone: string | null
          seats: number | null
          services: string[] | null
          timezone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: Json | null
          brand?: Json | null
          concept_type?: string | null
          created_at?: string
          cuisine_tags?: string[] | null
          currency?: string | null
          hours?: Json | null
          id?: string
          instagram?: string | null
          name: string
          org_id: string
          phone?: string | null
          seats?: number | null
          services?: string[] | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: Json | null
          brand?: Json | null
          concept_type?: string | null
          created_at?: string
          cuisine_tags?: string[] | null
          currency?: string | null
          hours?: Json | null
          id?: string
          instagram?: string | null
          name?: string
          org_id?: string
          phone?: string | null
          seats?: number | null
          services?: string[] | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_events: {
        Row: {
          created_at: string
          external_order_id: string | null
          id: string
          items: Json | null
          occurred_at: string
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          external_order_id?: string | null
          id?: string
          items?: Json | null
          occurred_at?: string
          restaurant_id: string
        }
        Update: {
          created_at?: string
          external_order_id?: string | null
          id?: string
          items?: Json | null
          occurred_at?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_locations: {
        Row: {
          created_at: string
          id: string
          name: string
          restaurant_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          restaurant_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "storage_locations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_items: {
        Row: {
          created_at: string
          id: string
          name: string
          pack_size: string | null
          pack_unit: string | null
          preferred: boolean | null
          sku: string | null
          unit_cost: number | null
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          pack_size?: string | null
          pack_unit?: string | null
          preferred?: boolean | null
          sku?: string | null
          unit_cost?: number | null
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          pack_size?: string | null
          pack_unit?: string | null
          preferred?: boolean | null
          sku?: string | null
          unit_cost?: number | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          contact_email: string | null
          created_at: string
          delivery_days: string[] | null
          id: string
          is_active: boolean | null
          lead_time_days: number | null
          minimum_order: number | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          delivery_days?: string[] | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          minimum_order?: number | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          delivery_days?: string[] | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          minimum_order?: number | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_owner: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      alert_severity: "low" | "medium" | "high"
      alert_type: "low_stock" | "expiring" | "anomaly" | "approval" | "system"
      app_role: "admin" | "manager" | "chef" | "staff"
      event_type:
        | "sale"
        | "receiving"
        | "adjustment"
        | "waste"
        | "transfer"
        | "count"
      po_status:
        | "draft"
        | "approved"
        | "sent"
        | "partial"
        | "received"
        | "cancelled"
      storage_location:
        | "walk_in_cooler"
        | "freezer"
        | "dry_storage"
        | "bar"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_severity: ["low", "medium", "high"],
      alert_type: ["low_stock", "expiring", "anomaly", "approval", "system"],
      app_role: ["admin", "manager", "chef", "staff"],
      event_type: [
        "sale",
        "receiving",
        "adjustment",
        "waste",
        "transfer",
        "count",
      ],
      po_status: [
        "draft",
        "approved",
        "sent",
        "partial",
        "received",
        "cancelled",
      ],
      storage_location: [
        "walk_in_cooler",
        "freezer",
        "dry_storage",
        "bar",
        "other",
      ],
    },
  },
} as const
