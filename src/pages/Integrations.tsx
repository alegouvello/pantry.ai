import { Plug, Check, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const integrations = [
  {
    id: 'toast',
    name: 'Toast POS',
    description: 'Sync menu items and orders automatically',
    status: 'connected',
    lastSync: '5 min ago',
    logo: '🍞',
  },
  {
    id: 'square',
    name: 'Square',
    description: 'Connect Square for order data',
    status: 'available',
    lastSync: null,
    logo: '⬛',
  },
  {
    id: 'clover',
    name: 'Clover',
    description: 'Sync with Clover POS system',
    status: 'available',
    lastSync: null,
    logo: '🍀',
  },
  {
    id: 'csv',
    name: 'CSV Import',
    description: 'Import sales data from CSV files',
    status: 'connected',
    lastSync: '1 day ago',
    logo: '📄',
  },
];

export default function Integrations() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
          <p className="text-muted-foreground">
            Connect your POS and external systems
          </p>
        </div>
      </div>

      {/* Integration Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card variant="success" className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Check className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-medium text-foreground">2 Connected</p>
              <p className="text-xs text-muted-foreground">
                Actively syncing data
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <Plug className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">2 Available</p>
              <p className="text-xs text-muted-foreground">Ready to connect</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Integration List */}
      <div className="space-y-4">
        {integrations.map((integration, index) => (
          <Card
            key={integration.id}
            variant="elevated"
            className="p-5 animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-2xl">
                  {integration.logo}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">
                      {integration.name}
                    </h3>
                    <Badge
                      variant={
                        integration.status === 'connected' ? 'success' : 'muted'
                      }
                    >
                      {integration.status === 'connected'
                        ? 'Connected'
                        : 'Available'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {integration.description}
                  </p>
                  {integration.lastSync && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last synced: {integration.lastSync}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {integration.status === 'connected' ? (
                  <>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Sync
                    </Button>
                    <Button variant="ghost" size="sm">
                      Configure
                    </Button>
                  </>
                ) : (
                  <Button variant="accent" size="sm">
                    <Plug className="h-4 w-4 mr-1" />
                    Connect
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Mapping Queue */}
      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning" />
            Unmapped Items
          </CardTitle>
          <Badge variant="warning">3 items</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg bg-muted/30 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Grilled Salmon</p>
              <p className="text-xs text-muted-foreground">
                POS Item ID: pos-045
              </p>
            </div>
            <Button variant="outline" size="sm">
              Map to Recipe
            </Button>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Caesar Salad (Large)</p>
              <p className="text-xs text-muted-foreground">
                POS Item ID: pos-067
              </p>
            </div>
            <Button variant="outline" size="sm">
              Map to Recipe
            </Button>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">House Wine (Glass)</p>
              <p className="text-xs text-muted-foreground">
                POS Item ID: pos-089
              </p>
            </div>
            <Button variant="outline" size="sm">
              Map to Recipe
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
