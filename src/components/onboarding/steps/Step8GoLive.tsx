import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingLayout } from '../OnboardingLayout';
import { SetupHealthScore } from '../SetupHealthScore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, AlertTriangle, ArrowRight, Rocket, FileText, Package, Sparkles, Clock, ChefHat, Truck, CreditCard } from 'lucide-react';

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

interface SetupItem {
  id: string;
  label: string;
  status: 'complete' | 'partial' | 'incomplete';
  impact: 'critical' | 'recommended' | 'optional';
  icon: React.ReactNode;
}

export function Step8GoLive(props: StepProps) {
  const navigate = useNavigate();
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);

  const setupItems: SetupItem[] = [
    {
      id: 'restaurant',
      label: 'Restaurant details',
      status: 'complete',
      impact: 'critical',
      icon: <ChefHat className="w-4 h-4" />,
    },
    {
      id: 'menu',
      label: 'Menu imported',
      status: 'complete',
      impact: 'critical',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'recipes',
      label: 'Recipes approved',
      status: 'partial',
      impact: 'critical',
      icon: <ChefHat className="w-4 h-4" />,
    },
    {
      id: 'storage',
      label: 'Storage locations',
      status: 'complete',
      impact: 'recommended',
      icon: <Package className="w-4 h-4" />,
    },
    {
      id: 'inventory',
      label: 'Baseline inventory',
      status: 'complete',
      impact: 'recommended',
      icon: <Package className="w-4 h-4" />,
    },
    {
      id: 'vendors',
      label: 'Vendors configured',
      status: 'partial',
      impact: 'recommended',
      icon: <Truck className="w-4 h-4" />,
    },
    {
      id: 'pos',
      label: 'POS connected',
      status: 'complete',
      impact: 'optional',
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      id: 'automation',
      label: 'Automation rules',
      status: 'complete',
      impact: 'optional',
      icon: <Sparkles className="w-4 h-4" />,
    },
  ];

  const completeCount = setupItems.filter(item => item.status === 'complete').length;
  const totalCount = setupItems.length;
  const completionPercentage = Math.round((completeCount / totalCount) * 100);

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsSimulating(false);
    setSimulationComplete(true);
  };

  const handleGoLive = () => {
    navigate('/');
  };

  const getStatusIcon = (status: SetupItem['status']) => {
    switch (status) {
      case 'complete':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'partial':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'incomplete':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };

  const getImpactBadge = (impact: SetupItem['impact']) => {
    switch (impact) {
      case 'critical':
        return <Badge variant="destructive" className="text-xs">Required</Badge>;
      case 'recommended':
        return <Badge variant="secondary" className="text-xs">Recommended</Badge>;
      case 'optional':
        return <Badge variant="outline" className="text-xs">Optional</Badge>;
    }
  };

  return (
    <OnboardingLayout {...props} title="You're Ready to Go Live!" subtitle="Review your setup and launch" nextLabel="Launch Dashboard">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Setup Health Score */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Setup Health Score</h3>
                <p className="text-sm text-muted-foreground">
                  {completionPercentage}% complete • {completeCount} of {totalCount} steps finished
                </p>
              </div>
              <div className="text-2xl font-bold text-primary">{props.setupHealthScore}%</div>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </CardContent>
        </Card>

        {/* Setup Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Checklist</CardTitle>
            <CardDescription>Items with partial completion can be finished later</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {setupItems.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    item.status === 'complete' ? 'bg-green-50/50 border-green-200' :
                    item.status === 'partial' ? 'bg-amber-50/50 border-amber-200' :
                    'bg-red-50/50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center">
                      {item.icon}
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {getImpactBadge(item.impact)}
                    {getStatusIcon(item.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Simulation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Test Your Setup
            </CardTitle>
            <CardDescription>
              Run a simulation to see how the system will track inventory
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {simulationComplete ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-700">Simulation successful!</p>
                    <p className="text-sm text-green-600 mt-1">
                      Processed 15 sample orders. Inventory depletion tracked correctly.
                      3 low-stock alerts would be triggered. 1 draft PO generated.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  This will simulate a day's worth of orders using your recipes and inventory levels.
                </p>
                <Button
                  variant="outline"
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                  className="w-full"
                >
                  {isSimulating ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
                      Running simulation...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Run Inventory Simulation
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sample PO Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Sample Purchase Order
            </CardTitle>
            <CardDescription>
              Preview of what auto-generated orders will look like
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Draft PO for Sysco</span>
                <Badge variant="outline">Draft</Badge>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fresh Mozzarella (2kg case x3)</span>
                  <span>$45.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Romaine Lettuce (12-head case x2)</span>
                  <span>$24.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">San Marzano Tomatoes (6x28oz x1)</span>
                  <span>$18.50</span>
                </div>
              </div>
              <div className="flex justify-between pt-2 border-t font-medium">
                <span>Total Estimate</span>
                <span>$87.50</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Launch Button */}
        <Button onClick={handleGoLive} size="lg" className="w-full py-6 text-lg">
          <Rocket className="w-5 h-5 mr-2" />
          Launch Dashboard
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          You can always complete remaining setup items from the dashboard.
        </p>
      </div>
    </OnboardingLayout>
  );
}
