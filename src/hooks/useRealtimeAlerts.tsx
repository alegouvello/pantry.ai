import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, PackageX, Clock, Bell } from 'lucide-react';

type AlertType = 'low_stock' | 'expiring' | 'anomaly' | 'approval' | 'system';
type AlertSeverity = 'low' | 'medium' | 'high';

interface Alert {
  id: string;
  title: string;
  description: string | null;
  type: AlertType;
  severity: AlertSeverity;
  is_resolved: boolean | null;
  created_at: string;
}

const getAlertIcon = (type: AlertType) => {
  switch (type) {
    case 'low_stock':
      return <PackageX className="h-4 w-4" />;
    case 'expiring':
      return <Clock className="h-4 w-4" />;
    case 'anomaly':
      return <AlertTriangle className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getSeverityStyles = (severity: AlertSeverity) => {
  switch (severity) {
    case 'high':
      return { className: 'text-destructive', label: 'High Priority' };
    case 'medium':
      return { className: 'text-warning', label: 'Medium Priority' };
    default:
      return { className: 'text-muted-foreground', label: 'Low Priority' };
  }
};

export function useRealtimeAlerts() {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('Setting up realtime alerts subscription...');
    
    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          console.log('New alert received:', payload);
          const alert = payload.new as Alert;
          
          // Only show toast for unresolved alerts
          if (!alert.is_resolved) {
            const { className } = getSeverityStyles(alert.severity);
            
            toast(alert.title, {
              description: alert.description || undefined,
              icon: getAlertIcon(alert.type),
              className: className,
              duration: alert.severity === 'high' ? 10000 : 5000,
              action: {
                label: 'View',
                onClick: () => {
                  window.location.href = '/alerts';
                },
              },
            });
          }
          
          // Invalidate alerts queries to refresh the data
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          console.log('Alert updated:', payload);
          // Invalidate alerts queries to refresh the data
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
        }
      )
      .subscribe((status) => {
        console.log('Alerts subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime alerts subscription...');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useLowStockCheck() {
  const queryClient = useQueryClient();

  const checkLowStock = async () => {
    // Trigger a re-check by doing a small update on ingredients
    // The database trigger will handle creating alerts
    const { data: ingredients, error } = await supabase
      .from('ingredients')
      .select('id, name, current_stock, reorder_point')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching ingredients:', error);
      toast.error('Failed to check stock levels');
      return { checked: 0, lowStock: 0 };
    }

    const lowStockItems = ingredients?.filter(
      ing => ing.current_stock <= ing.reorder_point
    ) || [];

    // Force trigger updates on low stock items to ensure alerts are created
    for (const item of lowStockItems) {
      await supabase
        .from('ingredients')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', item.id);
    }

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
    queryClient.invalidateQueries({ queryKey: ['ingredients'] });

    if (lowStockItems.length > 0) {
      toast.warning(`${lowStockItems.length} items are below reorder point`, {
        description: 'Check the Alerts page for details.',
        action: {
          label: 'View Alerts',
          onClick: () => {
            window.location.href = '/alerts';
          },
        },
      });
    } else {
      toast.success('All stock levels are healthy!');
    }

    return { checked: ingredients?.length || 0, lowStock: lowStockItems.length };
  };

  return { checkLowStock };
}