import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, ArrowUpDown, TrendingUp, Settings, FileText, LogOut, Wallet, Tag, Filter, Clock, Repeat, CalendarClock, CreditCard, Receipt, Bell } from 'lucide-react';
import { usePendings } from '@/hooks/usePendings';
import { useAlerts } from '@/hooks/useAlerts';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';
import { APP_VERSION } from '@/components/Changelog';
import { GlobalSearch, GlobalSearchTrigger } from '@/components/GlobalSearch';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { profile } = useUserProfile();
  const [searchOpen, setSearchOpen] = useState(false);
  const { activeCount, overdueCount } = usePendings();
  const { count: alertCount } = useAlerts();

  const isActive = (path: string) => location.pathname === path;

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const mainNavItems = [
    { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/transacciones', icon: ArrowUpDown, label: 'Transacciones' },
    { path: '/inversiones', icon: TrendingUp, label: 'Inversiones' },
    { path: '/pendientes', icon: Clock, label: 'Cuentas x Cobrar', badge: overdueCount || undefined, dotCount: activeCount },
    { path: '/cxp', icon: Receipt, label: 'Cuentas x Pagar' },
    { path: '/suscripciones', icon: CreditCard, label: 'Suscripciones' },
    { path: '/ingresos-recurrentes', icon: Repeat, label: 'Ingresos Recurrentes' },
    { path: '/pagos-anuales', icon: CalendarClock, label: 'Pagos Anuales' },
    { path: '/informes', icon: FileText, label: 'Informes Financieros' },
    { path: '/alertas', icon: Bell, label: 'Alertas', badge: alertCount || undefined },
  ];

  const configNavItems = [
    { path: '/cuentas', icon: Wallet, label: 'Cuentas' },
    { path: '/categorias', icon: Tag, label: 'Categorías' },
    { path: '/reglas-clasificacion', icon: Filter, label: 'Reglas' },
    { path: '/configuracion', icon: Settings, label: 'Configuración' },
  ];

  return (
      <div className="min-h-screen bg-background flex">
        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

        {/* SIDEBAR */}
        <aside className="w-64 fixed top-0 left-0 bottom-0 bg-card border-r flex flex-col z-50">
          <div className="p-4 border-b">
            <button
              onClick={() => navigate('/dashboard')}
              className="hover:opacity-80 transition-opacity"
            >
              <Logo size={56} className="justify-start" />
            </button>
          </div>

          {/* SEARCH */}
          <div className="p-3 pb-0">
            <GlobalSearchTrigger onClick={() => setSearchOpen(true)} />
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {mainNavItems.map(({ path, icon: Icon, label, badge }: any) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative',
                  isActive(path)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {badge ? (
                  <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-semibold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
                    {badge}
                  </span>
                ) : null}
              </button>
            ))}

            <div className="pt-3 mt-3 border-t">
              <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Configuración
              </p>
              {configNavItems.map(({ path, icon: Icon, label }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive(path)
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </nav>

          <div className="p-3 border-t space-y-2">
            {profile && (
              <div className="px-3 py-2">
                <p className="text-sm font-medium truncate">
                  {profile.nombre} {profile.apellidos}
                </p>
                <p className="text-xs text-muted-foreground">v{APP_VERSION} · Proyecto personal de MT</p>
              </div>
            )}
            <div className="flex items-center gap-3 px-3">
              <button
                onClick={() => navigate('/changelog')}
                className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                Changelog
              </button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 ml-64">
          <div className="container mx-auto px-6 py-8">
            <div className="space-y-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    );
};

export default Layout;
