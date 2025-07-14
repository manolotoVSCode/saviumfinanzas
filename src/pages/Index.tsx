import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BarChart3, ArrowUpDown, TrendingUp, Settings } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Redirigir automáticamente al dashboard en la carga inicial
  useEffect(() => {
    if (location.pathname === '/') {
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  const isActive = (path: string) => location.pathname === path;

  const navigationItems = [
    { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/transacciones', icon: ArrowUpDown, label: 'Transacciones' },
    { path: '/inversiones', icon: TrendingUp, label: 'Inversiones' },
    { path: '/configuracion', icon: Settings, label: 'Configuración' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Savium</h1>
          <p className="text-muted-foreground">Finanzas Personales</p>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="space-y-6">
          {/* Placeholder content - el contenido real se mostrará en las rutas específicas */}
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Bienvenido a Savium</h2>
            <p className="text-muted-foreground mb-6">
              Tu plataforma integral para la gestión de finanzas personales
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {navigationItems.map(({ path, icon: Icon, label }) => (
                <Button
                  key={path}
                  variant="outline"
                  className="h-20 flex flex-col items-center gap-2"
                  onClick={() => navigate(path)}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* NAVEGACIÓN INFERIOR FIJA */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t shadow-lg z-50">
          <div className="grid grid-cols-4 h-full">
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

export default Index;
