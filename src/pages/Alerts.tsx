import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, Filter, LogIn, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActiveAlerts, useResolvedAlerts, useResolveAlert } from '@/hooks/useAlerts';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import heroImage from '@/assets/pages/hero-alerts.jpg';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
  },
};

export default function Alerts() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { data: activeAlerts, isLoading: activeLoading } = useActiveAlerts();
  const { data: resolvedAlerts, isLoading: resolvedLoading } = useResolvedAlerts();
  const resolveAlert = useResolveAlert();

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-2">
          <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">{t('auth.signInRequired')}</h1>
          <p className="text-muted-foreground">
            {t('auth.pleaseSignIn', { area: t('nav.alerts').toLowerCase() })}
          </p>
        </div>
        <Link to="/auth">
          <Button variant="accent" size="lg">
            <LogIn className="h-5 w-5 mr-2" />
            {t('auth.signIn')}
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
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section */}
      <motion.div 
        variants={itemVariants}
        className="relative h-48 md:h-56 rounded-2xl overflow-hidden"
      >
        <img 
          src={heroImage} 
          alt="Command Center" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-transparent" />
        <div className="absolute inset-0 flex items-center px-8 md:px-12">
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              {t('alerts.title')}
            </h1>
            <p className="text-muted-foreground max-w-md">
              {t('alerts.subtitle')}
            </p>
            <div className="flex gap-3 pt-2">
              <Button 
                variant="success" 
                size="sm" 
                disabled={!activeAlerts || activeAlerts.length === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                {t('alerts.resolveAll')}
              </Button>
              <Button variant="outline" size="sm" className="bg-background/50 backdrop-blur-sm">
                <Filter className="h-4 w-4 mr-2" />
                {t('alerts.filter')}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Priority Summary */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <Card className={highPriority.length > 0 ? 'border-destructive/50 bg-destructive/5' : ''}>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="font-medium text-foreground">{t('alerts.highPriority')}</span>
            </div>
            <Badge variant="low">{highPriority.length}</Badge>
          </div>
        </Card>

        <Card>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="font-medium text-foreground">{t('alerts.medium')}</span>
            </div>
            <Badge variant="medium">{mediumPriority.length}</Badge>
          </div>
        </Card>

        <Card className="border-success/50 bg-success/5">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-success" />
              <span className="font-medium text-foreground">{t('alerts.lowPriority')}</span>
            </div>
            <Badge variant="high">{lowPriority.length}</Badge>
          </div>
        </Card>
      </motion.div>

      {/* Alert Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              {t('alerts.active')}
              {activeAlerts && activeAlerts.length > 0 && (
                <Badge variant="warning" className="h-5 px-1.5 text-xs">
                  {activeAlerts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="resolved" className="gap-2">
              {t('alerts.resolved')}
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
              <Card className="p-12 text-center border-success/50 bg-success/5">
                <Check className="h-12 w-12 text-success mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">{t('dashboard.allClear')}</p>
                <p className="text-muted-foreground">
                  {t('alerts.noActive')}
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeAlerts.map((alert) => (
                  <AlertCard 
                    key={alert.id} 
                    alert={mapAlert(alert)} 
                    onResolve={handleResolve} 
                  />
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
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">{t('alerts.noResolved')}</p>
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
      </motion.div>
    </motion.div>
  );
}
