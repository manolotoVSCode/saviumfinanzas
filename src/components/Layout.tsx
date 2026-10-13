import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, ArrowUpDown, TrendingUp, Settings, FileText, LogOut, Wallet, Tag, Filter, Clock, Repeat, CalendarClock, CreditCard, Receipt, Bell, UsersRound } from 'lucide-react';
import { usePendings } from '@/hooks/usePendings';
import { useAlerts } from '@/hooks/useAlerts';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';
import { APP_VERSION } from '@/components/Changelog';
import { GlobalSearch, GlobalSearchTrigger } from '@/components/GlobalSearch';
import { RUTAS_LECTORA } from '@/components/ProtectedRoute';
import { esAdmin } from '@/lib/admin';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, soloLectura } = useAuth();
  const { profile } = useUserProfile();
  const [searchOpen, setSearchOpen] = useState(false);
  const { activeCount, overdueCount } = usePendings();
  const { count: alertCount } = useAlerts();

  // «/» abre el Dashboard: su entrada del menú también se marca ahí.
  const isActive = (path: string) => location.pathname === path || (path === '/dashboard' && location.pathname === '/');

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

  const todosMain = [
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
    // Panel de uso de Savium Share: solo existe en el menú del administrador.
    ...(esAdmin(user?.id) ? [{ path: '/savium-share', icon: UsersRound, label: 'Savium Share' }] : []),
  ];

  const todosConfig = [
    { path: '/cuentas', icon: Wallet, label: 'Cuentas' },
    { path: '/categorias', icon: Tag, label: 'Categorías' },
    { path: '/reglas-clasificacion', icon: Filter, label: 'Reglas' },
    { path: '/configuracion', icon: Settings, label: 'Configuración' },
  ];

  // La lectora solo ve las pantallas de consulta (sin reglas, cuentas ni categorías).
  const mainNavItems = soloLectura ? todosMain.filter(i => RUTAS_LECTORA.includes(i.path)) : todosMain;
  const configNavItems = soloLectura ? todosConfig.filter(i => RUTAS_LECTORA.includes(i.path)) : todosConfig;

  return (
      <div className="min-h-screen flex">
        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

        {/* SIDEBAR */}
        {/* Panel de cristal flotante, como la barra de pestañas de la app del iPhone. */}
        <aside className="w-64 fixed top-3 left-3 bottom-3 vidrio rounded-[1.75rem] flex flex-col z-50 overflow-hidden">
          <div className="p-4 border-b border-border/60">
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
            {mainNavItems.map(({ path, icon: Icon, label, badge, danger }: any) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative',
                  danger
                    ? isActive(path)
                      ? 'bg-destructive/10 text-destructive'
                      : 'text-destructive hover:bg-destructive/10'
                    : isActive(path)
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-foreground/80 hover:text-foreground hover:bg-foreground/5'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" strokeWidth={isActive(path) ? 2.25 : 1.75} />
                <span className="flex-1 text-left">{label}</span>
                {badge ? (
                  <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-semibold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
                    {badge}
                  </span>
                ) : null}
              </button>
            ))}

            <div className="pt-3 mt-3 border-t border-border/60">
              <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Configuración
              </p>
              {configNavItems.map(({ path, icon: Icon, label }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors',
                    isActive(path)
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={isActive(path) ? 2.25 : 1.75} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </nav>

          <div className="p-3 border-t border-border/60 space-y-2">
            {profile && (
              <div className="px-3 py-2">
                <p className="text-sm font-medium truncate">
                  {profile.nombre} {profile.apellidos}
                </p>
                <p className="text-xs text-muted-foreground">v{APP_VERSION} · {soloLectura ? 'Solo lectura' : 'Proyecto personal de MT'}</p>
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
        <main className="flex-1 min-w-0 ml-[17.5rem]">
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
