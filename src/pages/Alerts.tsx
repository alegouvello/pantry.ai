import { AlertTriangle, Check, Filter, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActiveAlerts, useResolvedAlerts, useResolveAlert } from '@/hooks/useAlerts';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

export default function Alerts() {
  const { user, loading: authLoading } = useAuth();
  const { data: activeAlerts, isLoading: activeLoading } = useActiveAlerts();
  const { data: resolvedAlerts, isLoading: resolvedLoading } = useResolvedAlerts();
  const resolveAlert = useResolveAlert();

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Sign in required</h1>
          <p className="text-muted-foreground">
            Please sign in to view alerts.
          </p>
        </div>
        <Link to="/auth">
          <Button variant="accent" size="lg">
            <LogIn className="h-5 w-5 mr-2" />
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  const handleResolve = (id: string) => {
    resolveAlert.mutate(id);
  };

  const highPriority = activeAlerts?.filter((a) => a.severity === 'high') || [];
  const mediumPriority = activeAlerts?.filter((a) => a.severity === 'medium') || [];
  const lowPriority = activeAlerts?.filter((a) => a.severity === 'low') || [];

  // Map alerts to the format expected by AlertCard
  const mapAlert = (alert: NonNullable<typeof activeAlerts>[number]) => ({
    id: alert.id,
    type: alert.type,
    severity: alert.severity,
    title: alert.title,
    description: alert.description || '',
    suggestedAction: alert.suggested_action || '',
    relatedItemId: alert.related_item_id || undefined,
    createdAt: new Date(alert.created_at),
    isResolved: alert.is_resolved || false,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
          <p className="text-muted-foreground">
            Monitor alerts and take action
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="success" size="sm" disabled={!activeAlerts || activeAlerts.length === 0}>
            <Check className="h-4 w-4 mr-2" />
            Resolve All
          </Button>
        </div>
      </div>

      {/* Priority Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          variant={highPriority.length > 0 ? 'alert' : 'default'}
          className="p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="font-medium text-foreground">High Priority</span>
            </div>
            <Badge variant="low">{highPriority.length}</Badge>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="font-medium text-foreground">Medium</span>
            </div>
            <Badge variant="medium">{mediumPriority.length}</Badge>
          </div>
        </Card>

        <Card variant="success" className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-success" />
              <span className="font-medium text-foreground">Low Priority</span>
            </div>
            <Badge variant="high">{lowPriority.length}</Badge>
          </div>
        </Card>
      </div>

      {/* Alert Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="active" className="gap-2">
            Active
            {activeAlerts && activeAlerts.length > 0 && (
              <Badge variant="warning" className="h-5 px-1.5 text-xs">
                {activeAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved" className="gap-2">
            Resolved
            <Badge variant="muted" className="h-5 px-1.5 text-xs">
              {resolvedAlerts?.length || 0}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : !activeAlerts || activeAlerts.length === 0 ? (
            <Card variant="success" className="p-8 text-center">
              <Check className="h-12 w-12 text-success mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground">All clear!</p>
              <p className="text-muted-foreground">
                No active alerts at this time.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeAlerts.map((alert, index) => (
                <div
                  key={alert.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <AlertCard alert={mapAlert(alert)} onResolve={handleResolve} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4">
          {resolvedLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : !resolvedAlerts || resolvedAlerts.length === 0 ? (
            <Card variant="elevated" className="p-8 text-center">
              <p className="text-muted-foreground">No resolved alerts yet</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {resolvedAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={mapAlert(alert)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
