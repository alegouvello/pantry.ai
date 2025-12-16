import { Plug, Check, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { StaggeredGrid, StaggeredItem } from '@/components/ui/staggered-grid';
import heroIntegrations from '@/assets/pages/hero-integrations.jpg';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  
  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative h-48 md:h-56 rounded-2xl overflow-hidden"
      >
        <img 
          src={heroIntegrations} 
          alt={t('integrations.title')} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="px-6 md:px-8">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-2xl md:text-3xl font-bold text-foreground mb-2"
            >
              {t('integrations.title')}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-muted-foreground max-w-md"
            >
              {t('integrations.subtitle')}
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Integration Status */}
      <StaggeredGrid className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StaggeredItem>
          <Card variant="success" className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="font-medium text-foreground">{t('integrations.connectedCount', { count: 2 })}</p>
                <p className="text-xs text-muted-foreground">
                  {t('integrations.activelySyncing')}
                </p>
              </div>
            </div>
          </Card>
        </StaggeredItem>

        <StaggeredItem>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Plug className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">{t('integrations.availableCount', { count: 2 })}</p>
                <p className="text-xs text-muted-foreground">{t('integrations.readyToConnect')}</p>
              </div>
            </div>
          </Card>
        </StaggeredItem>
      </StaggeredGrid>

      {/* Integration List */}
      <StaggeredGrid className="space-y-4">
        {integrations.map((integration) => (
          <StaggeredItem key={integration.id}>
            <Card
              variant="elevated"
              className="p-5"
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
                          ? t('integrations.connected')
                          : t('integrations.available')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {integration.description}
                    </p>
                    {integration.lastSync && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('integrations.lastSynced', { time: integration.lastSync })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {integration.status === 'connected' ? (
                    <>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-1" />
                        {t('integrations.sync')}
                      </Button>
                      <Button variant="ghost" size="sm">
                        {t('integrations.configure')}
                      </Button>
                    </>
                  ) : (
                    <Button variant="accent" size="sm">
                      <Plug className="h-4 w-4 mr-1" />
                      {t('integrations.connect')}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </StaggeredItem>
        ))}
      </StaggeredGrid>

      {/* Mapping Queue */}
      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning" />
            {t('integrations.unmappedItems')}
          </CardTitle>
          <Badge variant="warning">{t('integrations.itemsCount', { count: 3 })}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg bg-muted/30 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Grilled Salmon</p>
              <p className="text-xs text-muted-foreground">
                {t('integrations.posItemId', { id: 'pos-045' })}
              </p>
            </div>
            <Button variant="outline" size="sm">
              {t('integrations.mapToRecipe')}
            </Button>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Caesar Salad (Large)</p>
              <p className="text-xs text-muted-foreground">
                {t('integrations.posItemId', { id: 'pos-067' })}
              </p>
            </div>
            <Button variant="outline" size="sm">
              {t('integrations.mapToRecipe')}
            </Button>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">House Wine (Glass)</p>
              <p className="text-xs text-muted-foreground">
                {t('integrations.posItemId', { id: 'pos-089' })}
              </p>
            </div>
            <Button variant="outline" size="sm">
              {t('integrations.mapToRecipe')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
