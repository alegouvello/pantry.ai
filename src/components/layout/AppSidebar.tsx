import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ChefHat,
  PieChart,
  ShoppingCart,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Plug,
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { LanguageSelectorCompact } from '@/components/settings/LanguageSelectorCompact';

const navItems = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/inventory', icon: Package, labelKey: 'nav.inventory' },
  { to: '/recipes', icon: ChefHat, labelKey: 'nav.recipes' },
  { to: '/profitability', icon: PieChart, labelKey: 'nav.profitability' },
  { to: '/orders', icon: ShoppingCart, labelKey: 'nav.orders' },
  { to: '/forecast', icon: TrendingUp, labelKey: 'nav.forecast' },
  { to: '/sales-history', icon: BarChart3, labelKey: 'nav.salesHistory' },
  { to: '/alerts', icon: AlertTriangle, labelKey: 'nav.alerts' },
  { to: '/integrations', icon: Plug, labelKey: 'nav.integrations' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
];


export function AppSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, profile, signOut } = useAuth();
  
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';

  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden transition-opacity",
          isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        onClick={() => setIsCollapsed(true)}
      />

      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
          "lg:translate-x-0",
          isCollapsed ? "-translate-x-full lg:w-20" : "translate-x-0 w-64"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in">
                <h1 className="text-lg font-semibold text-foreground">{t('app.name')}</h1>
                <p className="text-xs text-muted-foreground">{t('app.tagline')}</p>

              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  {!isCollapsed && (
                    <span className="animate-fade-in">{t(item.labelKey)}</span>
                  )}
                  {isActive && !isCollapsed && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse-subtle" />
                  )}
                </NavLink>
              );
            })}

          </nav>

          {/* Collapse toggle for desktop */}
          <div className="hidden lg:block border-t border-sidebar-border p-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <Menu className="h-5 w-5" />
                {!isCollapsed && <span>{t('nav.collapse')}</span>}

            </Button>
          </div>

          {/* User section */}
          <div className="border-t border-sidebar-border p-3 space-y-2">
            <div className={cn(
              "flex items-center gap-3 rounded-lg bg-sidebar-accent/30 px-3 py-2",
              isCollapsed && "justify-center"
            )}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-accent text-accent-foreground font-medium text-sm">
                {initials}
              </div>
              {!isCollapsed && (
                <div className="animate-fade-in overflow-hidden flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              )}
            </div>
            <LanguageSelectorCompact collapsed={isCollapsed} />
            <Button
              variant="ghost"
              size="sm"
              className={cn("w-full gap-2 text-muted-foreground hover:text-destructive", isCollapsed && "px-2")}
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span>{t('nav.signOut')}</span>}
            </Button>

          </div>
        </div>
      </aside>
    </>
  );
}
