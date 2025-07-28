import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/Logo';
import { TrendingUp, Shield, BarChart3, PieChart, DollarSign, Banknote } from 'lucide-react';

const Auth = () => {
  // Sign In states
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  // Sign Up states (commented out for future use)
  // const [signUpEmail, setSignUpEmail] = useState('');
  // const [signUpPassword, setSignUpPassword] = useState('');
  // const [nombre, setNombre] = useState('');
  // const [apellidos, setApellidos] = useState('');
  // const [divisaPreferida, setDivisaPreferida] = useState('MXN');
  
  const [loading, setLoading] = useState(false);
  const { signIn, resetPassword, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signIn(signInEmail, signInPassword, rememberMe);
    
    if (error) {
      toast({
        title: 'Error al iniciar sesión',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Bienvenido',
        description: 'Has iniciado sesión correctamente',
      });
    }
    
    setLoading(false);
  };

  // Sign up handler commented out for future use
  // const handleSignUp = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setLoading(true);
  //   
  //   const userData = {
  //     nombre,
  //     apellidos,
  //     divisa_preferida: divisaPreferida
  //   };
  //   
  //   const { error } = await signUp(signUpEmail, signUpPassword, userData);
  //   
  //   if (error) {
  //     toast({
  //       title: 'Error al registrarse',
  //       description: error.message,
  //       variant: 'destructive',
  //     });
  //   } else {
  //     toast({
  //       title: 'Registro exitoso',
  //       description: 'Revisa tu email para confirmar tu cuenta',
  //     });
  //   }
  //   
  //   setLoading(false);
  // };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await resetPassword(signInEmail);
    
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Email enviado',
        description: 'Revisa tu email para restablecer tu contraseña',
      });
      setShowForgotPassword(false);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex">
      {/* Left side - Branding and Features */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <Logo size={48} />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Savium Finanzas</h1>
              <p className="text-sm text-muted-foreground">Plataforma de Gestión Financiera</p>
            </div>
          </div>
          
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-foreground leading-tight">
                Control total de tus finanzas personales
              </h2>
              <p className="text-lg text-muted-foreground">
                Gestiona tus inversiones, gastos, ingresos y criptomonedas en una sola plataforma profesional.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Análisis de Inversiones</h3>
                  <p className="text-sm text-muted-foreground">Seguimiento de rendimientos y portafolios</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <PieChart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Reportes Detallados</h3>
                  <p className="text-sm text-muted-foreground">P&L, Balance y flujo de caja</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Banknote className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Criptomonedas</h3>
                  <p className="text-sm text-muted-foreground">Gestión de activos digitales</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Seguridad</h3>
                  <p className="text-sm text-muted-foreground">Datos protegidos y encriptados</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t pt-8">
          <p className="text-sm text-muted-foreground">
            © 2025 Proyecto personal de <span className="font-semibold">Manuel de la Torre</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Plataforma profesional para control de finanzas personales
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex flex-1 lg:max-w-md xl:max-w-lg items-center justify-center p-8">
        <Card className="w-full border-border/50 shadow-lg">
          <CardHeader className="space-y-6 pb-8">
            <div className="flex justify-center lg:hidden">
              <div className="flex items-center gap-3">
                <Logo size={40} />
                <div>
                  <h1 className="text-xl font-bold">Savium Finanzas</h1>
                  <p className="text-xs text-muted-foreground">Gestión Financiera</p>
                </div>
              </div>
            </div>
            <div className="text-center space-y-2">
              <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
              <CardDescription>
                Accede a tu plataforma de gestión financiera
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {!showForgotPassword ? (
              <form onSubmit={handleSignIn} method="post" className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-medium">
                    Correo Electrónico
                  </Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-medium">
                    Contraseña
                  </Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label htmlFor="remember-me" className="text-sm text-muted-foreground">
                      Recordar sesión
                    </Label>
                  </div>
                  
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-sm text-primary hover:text-primary/80"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    ¿Olvidaste tu contraseña?
                  </Button>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-medium" 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Iniciando sesión...
                    </div>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleForgotPassword} method="post" className="space-y-5">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">Recuperar Contraseña</h3>
                  <p className="text-sm text-muted-foreground">
                    Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-sm font-medium">
                    Correo Electrónico
                  </Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
                
                <div className="space-y-3">
                  <Button 
                    type="submit" 
                    className="w-full h-11 text-base font-medium" 
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Enviando...
                      </div>
                    ) : (
                      'Enviar enlace de recuperación'
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Volver al inicio de sesión
                  </Button>
                </div>
              </form>
            )}
            
            <div className="lg:hidden text-center pt-6 border-t">
              <p className="text-xs text-muted-foreground">
                Proyecto personal de <span className="font-semibold">Manuel de la Torre</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;