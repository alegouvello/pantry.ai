import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Trash2, Loader2, CalendarOff } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, isFuture, isToday } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Closure {
  id: string;
  name: string;
  event_date: string;
  event_type: string;
  impact_percent: number;
  notes?: string;
}

interface ClosuresCardProps {
  restaurantId?: string;
}

export function ClosuresCard({ restaurantId }: ClosuresCardProps) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newClosure, setNewClosure] = useState({
    name: '',
    date: '',
    notes: '',
  });

  // Fetch closures (forecast_events with type = 'closure')
  const { data: closures, isLoading } = useQuery({
    queryKey: ['closures', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from('forecast_events')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('event_type', 'closure')
        .order('event_date', { ascending: true });
      if (error) throw error;
      return data as Closure[];
    },
    enabled: !!restaurantId,
  });

  // Add closure mutation
  const addClosure = useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error('No restaurant ID');
      const { error } = await supabase.from('forecast_events').insert({
        restaurant_id: restaurantId,
        name: newClosure.name,
        event_date: newClosure.date,
        event_type: 'closure',
        impact_percent: -100, // Full closure means -100% sales
        notes: newClosure.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closures'] });
      queryClient.invalidateQueries({ queryKey: ['forecast-events'] });
      setShowAddDialog(false);
      setNewClosure({ name: '', date: '', notes: '' });
      toast.success('Closure added');
    },
    onError: (error) => {
      toast.error('Failed to add closure: ' + error.message);
    },
  });

  // Delete closure mutation
  const deleteClosure = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('forecast_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closures'] });
      queryClient.invalidateQueries({ queryKey: ['forecast-events'] });
      toast.success('Closure removed');
    },
    onError: (error) => {
      toast.error('Failed to remove: ' + error.message);
    },
  });

  // Quick add common holidays
  const addCommonHoliday = (name: string, month: number, day: number) => {
    const year = new Date().getFullYear();
    let targetYear = year;
    const holidayDate = new Date(targetYear, month - 1, day);
    
    // If the holiday has passed this year, use next year
    if (holidayDate < new Date()) {
      targetYear = year + 1;
    }
    
    const dateStr = `${targetYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setNewClosure({ name, date: dateStr, notes: '' });
    setShowAddDialog(true);
  };

  const upcomingClosures = closures?.filter(c => isFuture(parseISO(c.event_date)) || isToday(parseISO(c.event_date))) || [];
  const pastClosures = closures?.filter(c => !isFuture(parseISO(c.event_date)) && !isToday(parseISO(c.event_date))) || [];

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
    <>
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarOff className="h-4 w-4" />
                Scheduled Closures
              </CardTitle>
              <CardDescription>
                Holidays and special closures. These days will be excluded from forecasts.
              </CardDescription>
            </div>
            <Button
              variant="accent"
              size="sm"
              onClick={() => setShowAddDialog(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Closure
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Add Holidays */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Add Common Holidays</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'New Year\'s Day', month: 1, day: 1 },
                { name: 'Christmas Day', month: 12, day: 25 },
                { name: 'Thanksgiving', month: 11, day: 28 },
                { name: 'Independence Day', month: 7, day: 4 },
                { name: 'Labor Day', month: 9, day: 2 },
                { name: 'Memorial Day', month: 5, day: 27 },
              ].map((holiday) => (
                <Button
                  key={holiday.name}
                  variant="outline"
                  size="sm"
                  onClick={() => addCommonHoliday(holiday.name, holiday.month, holiday.day)}
                  className="text-xs"
                >
                  {holiday.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Upcoming Closures */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Upcoming Closures</Label>
            {upcomingClosures.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center bg-muted/30 rounded-lg">
                No upcoming closures scheduled
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingClosures.map((closure) => (
                  <div
                    key={closure.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                        <Calendar className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{closure.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(closure.event_date), 'EEEE, MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Closed</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteClosure.mutate(closure.id)}
                        disabled={deleteClosure.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Closures */}
          {pastClosures.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Past Closures</Label>
              <div className="space-y-2 opacity-60">
                {pastClosures.slice(0, 3).map((closure) => (
                  <div
                    key={closure.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{closure.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({format(parseISO(closure.event_date), 'MMM d, yyyy')})
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteClosure.mutate(closure.id)}
                      disabled={deleteClosure.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Closure Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Scheduled Closure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="closure-name">Reason / Name</Label>
              <Input
                id="closure-name"
                value={newClosure.name}
                onChange={(e) => setNewClosure(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Christmas Day, Private Event"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closure-date">Date</Label>
              <Input
                id="closure-date"
                type="date"
                value={newClosure.date}
                onChange={(e) => setNewClosure(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closure-notes">Notes (optional)</Label>
              <Input
                id="closure-notes"
                value={newClosure.notes}
                onChange={(e) => setNewClosure(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional details"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={() => addClosure.mutate()}
              disabled={!newClosure.name || !newClosure.date || addClosure.isPending}
            >
              {addClosure.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Closure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
