import { useMemo, useState } from 'react';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, TrendingUp, TrendingDown, Cloud } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useForecastEvents, EVENT_TYPES, ForecastEvent } from '@/hooks/useForecastEvents';
import { ForecastEventDialog } from './ForecastEventDialog';
import { WeatherData, getWeatherIcon } from '@/hooks/useWeatherForecast';
import { useTranslation } from 'react-i18next';

interface ForecastCalendarProps {
  restaurantId: string;
  daysAhead?: number;
  weatherData?: WeatherData[];
}

export function ForecastCalendar({ restaurantId, daysAhead = 14, weatherData }: ForecastCalendarProps) {
  const { t } = useTranslation();
  const [startOffset, setStartOffset] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<ForecastEvent | null>(null);
  
  const today = startOfDay(new Date());
  const startDate = addDays(today, startOffset);
  const endDate = addDays(startDate, daysAhead);

  const { events, isLoading } = useForecastEvents(
    restaurantId,
    startDate,
    endDate
  );

  const days = useMemo(() => {
    const result = [];
    for (let i = 0; i < daysAhead; i++) {
      const date = addDays(startDate, i);
      const dayEvents = events.filter(e => isSameDay(new Date(e.event_date), date));
      const dateStr = format(date, 'yyyy-MM-dd');
      const weather = weatherData?.find(w => w.date === dateStr);
      result.push({ date, events: dayEvents, weather });
    }
    return result;
  }, [startDate, daysAhead, events, weatherData]);

  const getEventTypeConfig = (type: string) => {
    return EVENT_TYPES.find(e => e.value === type) || EVENT_TYPES[EVENT_TYPES.length - 1];
  };

  const getImpactIndicator = (impact: number) => {
    if (impact > 0) {
      return <TrendingUp className={cn('h-3 w-3', impact > 25 ? 'text-emerald-500' : 'text-emerald-400')} />;
    }
    if (impact < 0) {
      return <TrendingDown className={cn('h-3 w-3', impact < -25 ? 'text-red-500' : 'text-red-400')} />;
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" />
            {t('forecastCalendar.title')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setStartOffset(s => s - 7)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStartOffset(0)}
              disabled={startOffset === 0}
            >
              {t('forecastCalendar.today')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setStartOffset(s => s + 7)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <ForecastEventDialog restaurantId={restaurantId} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {days.map(({ date, events: dayEvents, weather }) => {
            const isToday = isSameDay(date, today);
            const hasEvents = dayEvents.length > 0;
            const totalImpact = dayEvents.reduce((sum, e) => sum + Number(e.impact_percent), 0) + (weather?.impact || 0);

            return (
              <TooltipProvider key={date.toISOString()}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'relative min-h-[70px] p-1 rounded-md border transition-colors cursor-pointer',
                        isToday && 'border-primary bg-primary/5',
                        !isToday && 'border-border/50 hover:border-border hover:bg-muted/30',
                        hasEvents && 'ring-1 ring-inset',
                        totalImpact > 0 && 'ring-emerald-500/30',
                        totalImpact < 0 && 'ring-red-500/30'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          'text-xs font-medium',
                          isToday && 'text-primary',
                          !isToday && 'text-muted-foreground'
                        )}>
                          {format(date, 'd')}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {weather && (
                            <span className="text-xs">{getWeatherIcon(weather.condition)}</span>
                          )}
                          {hasEvents && getImpactIndicator(totalImpact)}
                        </div>
                      </div>
                      
                      {/* Weather info */}
                      {weather && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {Math.round(weather.temp)}°F
                        </div>
                      )}
                      
                      <div className="mt-1 space-y-0.5">
                        {dayEvents.slice(0, 2).map(event => {
                          const config = getEventTypeConfig(event.event_type);
                          return (
                            <div
                              key={event.id}
                              className="text-[10px] truncate px-1 py-0.5 rounded bg-muted/50"
                              onClick={() => setSelectedEvent(event)}
                            >
                              <span className="mr-1">{config.icon}</span>
                              {event.name}
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <div className="text-[10px] text-muted-foreground px-1">
                            {t('forecastCalendar.more', { count: dayEvents.length - 2 })}
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px]">
                    <p className="font-medium">{format(date, 'EEEE, MMM d')}</p>
                    {weather && (
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="text-lg">{getWeatherIcon(weather.condition)}</span>
                        <div>
                          <p>{weather.description}</p>
                          <p className="text-muted-foreground">
                            {Math.round(weather.tempMin)}° - {Math.round(weather.tempMax)}°F
                          </p>
                          {weather.impact !== 0 && (
                            <Badge 
                              variant={weather.impact > 0 ? 'default' : 'destructive'} 
                              className="text-[10px] mt-1"
                            >
                              {weather.impact > 0 ? '+' : ''}{weather.impact}% {t('forecastCalendar.weatherImpact')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    {hasEvents ? (
                      <div className="mt-2 space-y-1">
                        {dayEvents.map(event => (
                          <div key={event.id} className="text-xs">
                            <span className="mr-1">{getEventTypeConfig(event.event_type).icon}</span>
                            {event.name}
                            <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">
                              {Number(event.impact_percent) > 0 ? '+' : ''}{event.impact_percent}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : !weather && (
                      <p className="text-xs text-muted-foreground mt-1">{t('forecastCalendar.noEvents')}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t">
          {weatherData && weatherData.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Cloud className="h-3 w-3" />
              <span>{t('forecastCalendar.weatherImpacts')}</span>
            </div>
          )}
          {EVENT_TYPES.slice(0, 4).map(type => (
            <div key={type.value} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{type.icon}</span>
              <span>{type.label}</span>
            </div>
          ))}
        </div>

        {/* Edit dialog for selected event */}
        {selectedEvent && (
          <ForecastEventDialog
            restaurantId={restaurantId}
            existingEvent={selectedEvent}
            trigger={<span className="hidden" />}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
