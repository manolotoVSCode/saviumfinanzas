import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, ArrowUpDown, TrendingUp, Settings, FileText, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { profile } = useUserProfile();
  const { t } = useLanguage();

  const isActive = (path: string) => location.pathname === path;

  const navigationItems = [
    { path: '/dashboard', icon: BarChart3, label: t('nav.dashboard') },
    { path: '/transacciones', icon: ArrowUpDown, label: t('nav.transactions') },
    { path: '/inversiones', icon: TrendingUp, label: t('nav.investments') },
    { path: '/informes', icon: FileText, label: t('nav.reports') },
    { path: '/configuracion', icon: Settings, label: t('nav.settings') },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-8">
        {/* HEADER */}
        <div className="mb-8 flex justify-between items-center">
          <div className="flex-shrink-0">
            <button 
              onClick={() => navigate('/dashboard')}
              className="hover:opacity-80 transition-opacity"
            >
              <Logo size={72} className="justify-start" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            {profile && (
              <div className="text-right">
                <p className="text-sm font-medium">
                  {profile.nombre} {profile.apellidos}
                </p>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              {t('settings.logout')}
            </Button>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="space-y-6">
          {children}
        </div>

        {/* NAVEGACIÓN INFERIOR FIJA */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t shadow-lg z-50">
          <div className="grid grid-cols-5 h-full">
            {navigationItems.map(({ path, icon: Icon, label }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex flex-col items-center justify-center space-y-1 h-full transition-colors ${
                  isActive(path)
                    ? 'text-primary bg-primary/5 border-t-2 border-primary'
                    : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                }`}
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