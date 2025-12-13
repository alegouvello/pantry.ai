import { AlertTriangle, Check, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockAlerts } from '@/data/mockData';
import { useState } from 'react';

export default function Alerts() {
  const [alerts, setAlerts] = useState(mockAlerts);

  const handleResolve = (id: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, isResolved: true } : alert
      )
    );
  };

  const activeAlerts = alerts.filter((a) => !a.isResolved);
  const resolvedAlerts = alerts.filter((a) => a.isResolved);

  const highPriority = activeAlerts.filter((a) => a.severity === 'high');
  const mediumPriority = activeAlerts.filter((a) => a.severity === 'medium');
  const lowPriority = activeAlerts.filter((a) => a.severity === 'low');

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
          <Button variant="success" size="sm" disabled={activeAlerts.length === 0}>
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
            {activeAlerts.length > 0 && (
              <Badge variant="warning" className="h-5 px-1.5 text-xs">
                {activeAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved" className="gap-2">
            Resolved
            <Badge variant="muted" className="h-5 px-1.5 text-xs">
              {resolvedAlerts.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeAlerts.length === 0 ? (
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
                  <AlertCard alert={alert} onResolve={handleResolve} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-4">
          {resolvedAlerts.length === 0 ? (
            <Card variant="elevated" className="p-8 text-center">
              <p className="text-muted-foreground">No resolved alerts yet</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {resolvedAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
