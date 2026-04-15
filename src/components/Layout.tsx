import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, ArrowUpDown, TrendingUp, Settings, FileText, LogOut, Wallet, Tag, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';
import { GlobalSearch, GlobalSearchTrigger } from '@/components/GlobalSearch';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { profile } = useUserProfile();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [searchOpen, setSearchOpen] = useState(false);

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
    { path: '/dashboard', icon: BarChart3, label: t('nav.dashboard') },
    { path: '/transacciones', icon: ArrowUpDown, label: t('nav.transactions') },
    { path: '/inversiones', icon: TrendingUp, label: t('nav.investments') },
    { path: '/informes', icon: FileText, label: t('nav.reports') },
  ];

  const configNavItems = [
    { path: '/cuentas', icon: Wallet, label: 'Cuentas' },
    { path: '/categorias', icon: Tag, label: 'Categorías' },
    { path: '/reglas-clasificacion', icon: Filter, label: 'Reglas' },
    { path: '/configuracion', icon: Settings, label: t('nav.settings') },
  ];

  const mobileNavItems = [
    { path: '/dashboard', icon: BarChart3, label: t('nav.dashboard') },
    { path: '/transacciones', icon: ArrowUpDown, label: t('nav.transactions') },
    { path: '/inversiones', icon: TrendingUp, label: t('nav.investments') },
    { path: '/informes', icon: FileText, label: t('nav.reports') },
    { path: '/configuracion', icon: Settings, label: t('nav.settings') },
  ];

  // Desktop layout with sidebar
  if (!isMobile) {
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
            {mainNavItems.map(({ path, icon: Icon, label }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(path)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{label}</span>
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
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              {t('settings.logout')}
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
  }

  // Mobile layout with bottom nav
  return (
    <div className="min-h-screen bg-background pb-20">
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      <div className="container mx-auto px-4 py-8">
        {/* MOBILE HEADER */}
        <div className="mb-8 flex justify-between items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="hover:opacity-80 transition-opacity"
          >
            <Logo size={56} className="justify-start" />
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setSearchOpen(true)} className="h-9 w-9">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {children}
        </div>

        {/* BOTTOM NAV */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t shadow-lg z-50">
          <div className="grid grid-cols-5 h-full">
            {mobileNavItems.map(({ path, icon: Icon, label }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  'flex flex-col items-center justify-center space-y-1 h-full transition-colors',
                  isActive(path)
                    ? 'text-primary bg-primary/5 border-t-2 border-primary'
                    : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Layout;
