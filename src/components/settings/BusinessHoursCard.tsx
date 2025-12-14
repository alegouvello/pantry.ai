import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Clock, Loader2, Search, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

interface BusinessHours {
  [key: string]: DayHours;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const DEFAULT_HOURS: BusinessHours = {
  monday: { open: '11:00', close: '22:00', closed: false },
  tuesday: { open: '11:00', close: '22:00', closed: false },
  wednesday: { open: '11:00', close: '22:00', closed: false },
  thursday: { open: '11:00', close: '22:00', closed: false },
  friday: { open: '11:00', close: '23:00', closed: false },
  saturday: { open: '11:00', close: '23:00', closed: false },
  sunday: { open: '11:00', close: '21:00', closed: true },
};

interface BusinessHoursCardProps {
  restaurantId?: string;
  restaurantName?: string;
}

export function BusinessHoursCard({ restaurantId, restaurantName }: BusinessHoursCardProps) {
  const queryClient = useQueryClient();
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Fetch current hours
  const { data: restaurant, isLoading } = useQuery({
    queryKey: ['restaurant-hours', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const { data, error } = await supabase
        .from('restaurants')
        .select('hours')
        .eq('id', restaurantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  // Initialize hours from database
  useEffect(() => {
    if (restaurant?.hours && typeof restaurant.hours === 'object' && Object.keys(restaurant.hours as object).length > 0) {
      setHours(restaurant.hours as unknown as BusinessHours);
    }
  }, [restaurant]);

  // Update hours mutation
  const updateHours = useMutation({
    mutationFn: async (newHours: BusinessHours) => {
      if (!restaurantId) throw new Error('No restaurant ID');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase
        .from('restaurants')
        .update({ hours: newHours as any })
        .eq('id', restaurantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-hours'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-settings'] });
      toast.success('Business hours saved');
    },
    onError: (error) => {
      toast.error('Failed to save: ' + error.message);
    },
  });

  const handleDayChange = (day: string, field: keyof DayHours, value: string | boolean) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleLookupHours = async () => {
    if (!restaurantName) {
      toast.error('Restaurant name is required for lookup');
      return;
    }
    
    setIsLookingUp(true);
    try {
      // In a real implementation, this would call an edge function that uses Google Places API
      // For now, we'll show a message that this feature requires setup
      toast.info('Auto-lookup requires Google Places API integration. Enter hours manually for now.');
    } catch (error) {
      toast.error('Failed to lookup hours');
    } finally {
      setIsLookingUp(false);
    }
  };

  const copyToAllDays = (sourceDay: string) => {
    const sourceHours = hours[sourceDay];
    const newHours = { ...hours };
    DAYS.forEach(day => {
      if (day !== sourceDay) {
        newHours[day] = { ...sourceHours };
      }
    });
    setHours(newHours);
    toast.success(`Copied ${DAY_LABELS[sourceDay]} hours to all days`);
  };

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Business Hours
            </CardTitle>
            <CardDescription>
              Set your operating hours. Closed days are excluded from forecasts.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLookupHours}
            disabled={isLookingUp || !restaurantName}
            className="gap-2"
          >
            {isLookingUp ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Auto-Lookup
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hours Grid */}
        <div className="space-y-3">
          {DAYS.map((day) => (
            <div
              key={day}
              className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                hours[day]?.closed ? 'bg-muted/30' : 'bg-muted/50'
              }`}
            >
              <div className="w-24 flex items-center gap-2">
                <span className="font-medium text-sm">{DAY_LABELS[day]}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={!hours[day]?.closed}
                  onCheckedChange={(checked) => handleDayChange(day, 'closed', !checked)}
                />
                <span className="text-xs text-muted-foreground w-12">
                  {hours[day]?.closed ? 'Closed' : 'Open'}
                </span>
              </div>

              {!hours[day]?.closed && (
                <>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <Input
                      type="time"
                      value={hours[day]?.open || '11:00'}
                      onChange={(e) => handleDayChange(day, 'open', e.target.value)}
                      className="w-28 h-8 text-sm bg-background"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <Input
                      type="time"
                      value={hours[day]?.close || '22:00'}
                      onChange={(e) => handleDayChange(day, 'close', e.target.value)}
                      className="w-28 h-8 text-sm bg-background"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToAllDays(day)}
                    className="text-xs h-7"
                  >
                    Copy to all
                  </Button>
                </>
              )}

              {hours[day]?.closed && (
                <Badge variant="secondary" className="ml-auto">
                  Excluded from forecast
                </Badge>
              )}
            </div>
          ))}
        </div>

        {/* Info Note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">How this affects forecasting:</strong> Days marked as "Closed" will be skipped in sales predictions and ingredient requirements. Special closures (holidays) can be added in the Forecast page.
          </p>
        </div>

        <Button
          variant="accent"
          onClick={() => updateHours.mutate(hours)}
          disabled={updateHours.isPending}
          className="w-full sm:w-auto"
        >
          {updateHours.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Business Hours
        </Button>
      </CardContent>
    </Card>
  );
}
