import { useState } from 'react';
import { OnboardingLayout } from '../OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck, Plus, Trash2, Building2, Mail, Phone, Clock, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface StepProps {
  currentStep: number;
  completedSteps: number[];
  setupHealthScore: number;
  orgId: string | null;
  onNext: () => void;
  onBack?: () => void;
  onSave: () => void;
  updateHealthScore: (delta: number) => void;
}

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone?: string;
  leadTimeDays: number;
  deliveryDays: string[];
  minimumOrder: number;
  category?: string;
}

const deliveryDayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Mock high-impact ingredients for mapping
const topIngredients = [
  { id: '1', name: 'Fresh Mozzarella', category: 'Dairy', unit: 'kg' },
  { id: '2', name: 'San Marzano Tomatoes', category: 'Canned Goods', unit: 'cans' },
  { id: '3', name: 'Olive Oil', category: 'Oils', unit: 'L' },
  { id: '4', name: 'Salmon Fillet', category: 'Seafood', unit: 'kg' },
  { id: '5', name: 'Romaine Lettuce', category: 'Produce', unit: 'heads' },
  { id: '6', name: 'Parmesan', category: 'Dairy', unit: 'kg' },
];

export function Step5VendorSetup(props: StepProps) {
  const [phase, setPhase] = useState<'vendors' | 'mapping'>('vendors');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [ingredientMappings, setIngredientMappings] = useState<Record<string, { vendorId: string; sku?: string; packSize?: string; unitCost?: number }>>({});

  const [formData, setFormData] = useState<Partial<Vendor>>({
    name: '',
    email: '',
    phone: '',
    leadTimeDays: 2,
    deliveryDays: [],
    minimumOrder: 0,
    category: '',
  });

  const handleSaveVendor = () => {
    if (!formData.name || !formData.email) return;

    if (editingVendor) {
      setVendors(vendors.map(v => v.id === editingVendor.id ? { ...v, ...formData } as Vendor : v));
    } else {
      const newVendor: Vendor = {
        id: Date.now().toString(),
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        leadTimeDays: formData.leadTimeDays || 2,
        deliveryDays: formData.deliveryDays || [],
        minimumOrder: formData.minimumOrder || 0,
        category: formData.category,
      };
      setVendors([...vendors, newVendor]);
    }

    setFormData({ name: '', email: '', phone: '', leadTimeDays: 2, deliveryDays: [], minimumOrder: 0, category: '' });
    setEditingVendor(null);
    setIsDialogOpen(false);
    props.updateHealthScore(5);
  };

  const handleDeleteVendor = (id: string) => {
    setVendors(vendors.filter(v => v.id !== id));
  };

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData(vendor);
    setIsDialogOpen(true);
  };

  const toggleDeliveryDay = (day: string) => {
    const current = formData.deliveryDays || [];
    setFormData({
      ...formData,
      deliveryDays: current.includes(day)
        ? current.filter(d => d !== day)
        : [...current, day],
    });
  };

  const updateMapping = (ingredientId: string, field: string, value: any) => {
    setIngredientMappings(prev => ({
      ...prev,
      [ingredientId]: { ...prev[ingredientId], [field]: value },
    }));
  };

  const suggestedCategories = ['Produce', 'Dairy', 'Meat & Poultry', 'Seafood', 'Dry Goods', 'Beverages', 'Spirits'];

  if (phase === 'vendors') {
    return (
      <OnboardingLayout {...props} title="Add Your Vendors" subtitle="Set up supplier information for automated ordering">
        <div className="max-w-3xl mx-auto space-y-6">
          {vendors.length > 0 && (
            <div className="grid gap-4">
              {vendors.map(vendor => (
                <Card key={vendor.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Truck className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{vendor.name}</h3>
                          <p className="text-sm text-muted-foreground">{vendor.email}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {vendor.category && (
                              <Badge variant="secondary">{vendor.category}</Badge>
                            )}
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              {vendor.leadTimeDays} day lead time
                            </Badge>
                            {vendor.minimumOrder > 0 && (
                              <Badge variant="outline">
                                <DollarSign className="w-3 h-3 mr-1" />
                                ${vendor.minimumOrder} min
                              </Badge>
                            )}
                          </div>
                          {vendor.deliveryDays.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Delivers: {vendor.deliveryDays.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditVendor(vendor)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteVendor(vendor.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full border-dashed py-8">
                <Plus className="w-5 h-5 mr-2" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Vendor Name *</Label>
                    <div className="relative mt-1">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        className="pl-10"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Sysco, US Foods"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Email *</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        className="pl-10"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="orders@vendor.com"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Phone</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="tel"
                        className="pl-10"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Lead Time (days)</Label>
                    <Input
                      type="number"
                      className="mt-1"
                      value={formData.leadTimeDays}
                      onChange={(e) => setFormData({ ...formData, leadTimeDays: parseInt(e.target.value) || 2 })}
                    />
                  </div>

                  <div>
                    <Label>Minimum Order ($)</Label>
                    <Input
                      type="number"
                      className="mt-1"
                      value={formData.minimumOrder}
                      onChange={(e) => setFormData({ ...formData, minimumOrder: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {suggestedCategories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label>Delivery Days</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {deliveryDayOptions.map(day => (
                        <Badge
                          key={day}
                          variant={formData.deliveryDays?.includes(day) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleDeliveryDay(day)}
                        >
                          {day.slice(0, 3)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveVendor} disabled={!formData.name || !formData.email}>
                    {editingVendor ? 'Save Changes' : 'Add Vendor'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {vendors.length > 0 && (
            <Button onClick={() => setPhase('mapping')} className="w-full" size="lg">
              Continue to Item Mapping
            </Button>
          )}

          <Button variant="ghost" onClick={props.onNext} className="w-full text-muted-foreground">
            Skip for now
          </Button>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout {...props} title="Map Ingredients to Vendors" subtitle="Start with your top 25 high-impact ingredients">
      <div className="space-y-6">
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          💡 These are your most-used ingredients based on menu analysis. Map them first for accurate ordering.
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Pack Size</TableHead>
                <TableHead>Unit Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topIngredients.map(ingredient => (
                <TableRow key={ingredient.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{ingredient.name}</span>
                      <p className="text-xs text-muted-foreground">{ingredient.category}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={ingredientMappings[ingredient.id]?.vendorId || ''}
                      onValueChange={(value) => updateMapping(ingredient.id, 'vendorId', value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map(vendor => (
                          <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-28"
                      placeholder="SKU"
                      value={ingredientMappings[ingredient.id]?.sku || ''}
                      onChange={(e) => updateMapping(ingredient.id, 'sku', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-28"
                      placeholder="e.g., 6x1kg"
                      value={ingredientMappings[ingredient.id]?.packSize || ''}
                      onChange={(e) => updateMapping(ingredient.id, 'packSize', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        className="w-24 pl-8"
                        placeholder="0.00"
                        value={ingredientMappings[ingredient.id]?.unitCost || ''}
                        onChange={(e) => updateMapping(ingredient.id, 'unitCost', parseFloat(e.target.value))}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setPhase('vendors')}>
            Back to Vendors
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={props.onNext}>
              Finish Later
            </Button>
            <Button onClick={() => {
              props.updateHealthScore(10);
              props.onNext();
            }}>
              Save Mappings & Continue
            </Button>
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}
