import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { EVENT_TYPES, PRESET_HOLIDAYS, useForecastEvents, ForecastEvent } from '@/hooks/useForecastEvents';
import { useTranslation } from 'react-i18next';

interface ForecastEventDialogProps {
  restaurantId: string;
  existingEvent?: ForecastEvent;
  trigger?: React.ReactNode;
  onClose?: () => void;
}

export function ForecastEventDialog({ restaurantId, existingEvent, trigger, onClose }: ForecastEventDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(
    existingEvent ? new Date(existingEvent.event_date) : undefined
  );
  const [name, setName] = useState(existingEvent?.name || '');
  const [eventType, setEventType] = useState(existingEvent?.event_type || 'custom');
  const [impact, setImpact] = useState(existingEvent?.impact_percent ? Number(existingEvent.impact_percent) : 0);
  const [notes, setNotes] = useState(existingEvent?.notes || '');
  const [isRecurring, setIsRecurring] = useState(existingEvent?.is_recurring || false);

  const { addEvent, updateEvent, deleteEvent } = useForecastEvents(restaurantId);

  const handleEventTypeChange = (type: string) => {
    setEventType(type);
    const eventConfig = EVENT_TYPES.find(e => e.value === type);
    if (eventConfig && !existingEvent) {
      setImpact(eventConfig.defaultImpact);
    }
  };

  const handlePresetSelect = (preset: typeof PRESET_HOLIDAYS[0]) => {
    setName(preset.name);
    setEventType('holiday');
    setImpact(preset.impact);
    setIsRecurring(true);
    // Set date to this year's occurrence
    const thisYear = new Date().getFullYear();
    setDate(new Date(thisYear, preset.month - 1, preset.day));
  };

  const handleSubmit = async () => {
    if (!date || !name) return;

    const eventData = {
      restaurant_id: restaurantId,
      event_date: format(date, 'yyyy-MM-dd'),
      name,
      event_type: eventType,
      impact_percent: impact,
      notes: notes || null,
      is_recurring: isRecurring,
    };

    if (existingEvent) {
      await updateEvent.mutateAsync({ id: existingEvent.id, ...eventData });
    } else {
      await addEvent.mutateAsync(eventData);
    }

    setOpen(false);
    onClose?.();
    resetForm();
  };

  const handleDelete = async () => {
    if (!existingEvent) return;
    await deleteEvent.mutateAsync(existingEvent.id);
    setOpen(false);
    onClose?.();
  };

  const resetForm = () => {
    if (!existingEvent) {
      setDate(undefined);
      setName('');
      setEventType('custom');
      setImpact(0);
      setNotes('');
      setIsRecurring(false);
    }
  };

  const getImpactColor = () => {
    if (impact > 20) return 'text-emerald-500';
    if (impact > 0) return 'text-emerald-400';
    if (impact < -20) return 'text-red-500';
    if (impact < 0) return 'text-red-400';
    return 'text-muted-foreground';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('forecastEvent.addEvent')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{existingEvent ? t('forecastEvent.editEvent') : t('forecastEvent.addForecastEvent')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick preset holidays */}
          {!existingEvent && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">{t('forecastEvent.quickAddHoliday')}</Label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_HOLIDAYS.slice(0, 6).map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => handlePresetSelect(preset)}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Date picker */}
          <div className="space-y-2">
            <Label>{t('forecastEvent.date')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : t('forecastEvent.pickDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Event name */}
          <div className="space-y-2">
            <Label>{t('forecastEvent.eventName')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('forecastEvent.eventNamePlaceholder')}
            />
          </div>

          {/* Event type */}
          <div className="space-y-2">
            <Label>{t('forecastEvent.eventType')}</Label>
            <Select value={eventType} onValueChange={handleEventTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Impact slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('forecastEvent.salesImpact')}</Label>
              <span className={cn('font-mono font-medium', getImpactColor())}>
                {impact > 0 ? '+' : ''}{impact}%
              </span>
            </div>
            <Slider
              value={[impact]}
              onValueChange={([v]) => setImpact(v)}
              min={-75}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('forecastEvent.closedSlow')}</span>
              <span>{t('forecastEvent.veryBusy')}</span>
            </div>
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('forecastEvent.recurring')}</Label>
              <p className="text-xs text-muted-foreground">{t('forecastEvent.recurringDesc')}</p>
            </div>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t('forecastEvent.notes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('forecastEvent.notesPlaceholder')}
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-between">
          {existingEvent ? (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete')}
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={!date || !name}>
              {existingEvent ? t('forecastEvent.saveChanges') : t('forecastEvent.addEvent')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
