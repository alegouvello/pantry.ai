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
import { useTranslation } from 'react-i18next';

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

interface BusinessHours {
  [key: string]: DayHours;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

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
  location?: string;
}

export function BusinessHoursCard({ restaurantId, restaurantName, location }: BusinessHoursCardProps) {
  const { t } = useTranslation();
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
      const { error } = await supabase
        .from('restaurants')
        .update({ hours: newHours as any })
        .eq('id', restaurantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-hours'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-settings'] });
      toast.success(t('businessHours.saved'));
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
      toast.error(t('businessHours.lookupRequired'));
      return;
    }
    
    setIsLookingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('lookup-business-hours', {
        body: { restaurantName, location },
      });

      if (error) throw error;

      if (data?.success && data?.hours) {
        setHours(data.hours);
        toast.success(t('businessHours.lookupSuccess', { source: data.source || 'online listing' }));
      } else {
        toast.info(data?.error || t('businessHours.lookupNotFound'));
      }
    } catch (error) {
      console.error('Lookup error:', error);
      toast.error(t('businessHours.lookupFailed'));
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
    toast.success(t('businessHours.copiedToAll', { day: t(`businessHours.days.${sourceDay}`) }));
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
              {t('businessHours.title')}
            </CardTitle>
            <CardDescription>
              {t('businessHours.description')}
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
            {t('businessHours.autoLookup')}
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
                <span className="font-medium text-sm">{t(`businessHours.days.${day}`)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={!hours[day]?.closed}
                  onCheckedChange={(checked) => handleDayChange(day, 'closed', !checked)}
                />
                <span className="text-xs text-muted-foreground w-12">
                  {hours[day]?.closed ? t('businessHours.closed') : t('businessHours.open')}
                </span>
              </div>

              {!hours[day]?.closed && (
                <>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">{t('businessHours.from')}</Label>
                    <Input
                      type="time"
                      value={hours[day]?.open || '11:00'}
                      onChange={(e) => handleDayChange(day, 'open', e.target.value)}
                      className="w-28 h-8 text-sm bg-background"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">{t('businessHours.to')}</Label>
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
                    {t('businessHours.copyToAll')}
                  </Button>
                </>
              )}

              {hours[day]?.closed && (
                <Badge variant="secondary" className="ml-auto">
                  {t('businessHours.excludedFromForecast')}
                </Badge>
              )}
            </div>
          ))}
        </div>

        {/* Info Note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">{t('businessHours.forecastNote')}</strong> {t('businessHours.forecastNoteText')}
          </p>
        </div>

        <Button
          variant="accent"
          onClick={() => updateHours.mutate(hours)}
          disabled={updateHours.isPending}
          className="w-full sm:w-auto"
        >
          {updateHours.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {t('businessHours.saveHours')}
        </Button>
      </CardContent>
    </Card>
  );
}
