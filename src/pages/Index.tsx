import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { BarChart3, ArrowUpDown, TrendingUp, Settings, LogIn, UserPlus } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Redirigir automáticamente al dashboard si está autenticado
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4 text-primary">SAVIUM</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Tu plataforma integral para la gestión de finanzas personales
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Toma control de tus finanzas con herramientas avanzadas para rastrear ingresos, 
            gastos, inversiones y mucho más. Gestiona tu patrimonio de manera inteligente.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                Dashboard Completo
              </CardTitle>
              <CardDescription>
                Visualiza tus finanzas con gráficos intuitivos y métricas en tiempo real
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="h-6 w-6 text-primary" />
                Gestión de Transacciones
              </CardTitle>
              <CardDescription>
                Registra y categoriza tus ingresos y gastos de manera eficiente
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                Seguimiento de Inversiones
              </CardTitle>
              <CardDescription>
                Monitorea el rendimiento de tus inversiones y portafolio
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-6 w-6 text-primary" />
                Configuración Avanzada
              </CardTitle>
              <CardDescription>
                Personaliza categorías, cuentas y preferencias según tus necesidades
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="text-center">
          <h3 className="text-2xl font-bold mb-8">¿Listo para comenzar?</h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="text-lg px-8 py-6"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Crear Cuenta
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="text-lg px-8 py-6"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Iniciar Sesión
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
