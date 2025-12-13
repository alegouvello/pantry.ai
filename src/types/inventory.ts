export interface Ingredient {
  id: string;
  name: string;
  category: string;
  unit: string;
  storageLocation: string;
  currentStock: number;
  parLevel: number;
  reorderPoint: number;
  unitCost: number;
  lastUpdated: Date;
  shelfLifeDays?: number;
  allergens?: string[];
  vendorId?: string;
  vendorSku?: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  posItemId?: string;
  yield: number;
  yieldUnit: string;
  ingredients: RecipeIngredient[];
  prepTime?: number;
  isActive: boolean;
}

export interface RecipeIngredient {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
}

export interface Vendor {
  id: string;
  name: string;
  contactEmail: string;
  leadTimeDays: number;
  minimumOrder: number;
  deliveryDays: string[];
  paymentTerms?: string;
}

export interface PurchaseOrder {
  id: string;
  vendorId: string;
  vendorName: string;
  status: 'draft' | 'approved' | 'sent' | 'received' | 'partial';
  items: PurchaseOrderItem[];
  totalAmount: number;
  createdAt: Date;
  expectedDelivery?: Date;
}

export interface PurchaseOrderItem {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  total: number;
}

export interface Alert {
  id: string;
  type: 'low_stock' | 'expiring' | 'anomaly' | 'approval';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  suggestedAction: string;
  relatedItemId?: string;
  createdAt: Date;
  isResolved: boolean;
}

export interface InventoryEvent {
  id: string;
  ingredientId: string;
  eventType: 'sale' | 'receiving' | 'adjustment' | 'waste' | 'transfer';
  quantity: number;
  previousStock: number;
  newStock: number;
  source: string;
  timestamp: Date;
  userId?: string;
  notes?: string;
}

export interface DashboardMetrics {
  totalIngredients: number;
  lowStockItems: number;
  expiringSoonItems: number;
  pendingOrders: number;
  totalInventoryValue: number;
  weeklyUsage: number;
}
