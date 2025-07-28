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
      {/* Left side - Professional Financial Branding */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:items-center p-12">
        <div className="max-w-lg text-center space-y-12">
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-4">
              <Logo size={56} />
              <div className="text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Savium Finance</h1>
                <p className="text-base text-muted-foreground font-medium">Wealth Management Platform</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-foreground leading-tight">
                Professional Portfolio Management & Financial Analytics
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Comprehensive wealth management solution featuring advanced portfolio analytics, 
                multi-asset class tracking, and institutional-grade financial reporting.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-8">
            <div className="flex items-center justify-center gap-4 p-6 rounded-xl bg-card/50 border border-border/50">
              <div className="p-3 rounded-lg bg-primary/15">
                <TrendingUp className="h-7 w-7 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold">Advanced Portfolio Analytics</h3>
                <p className="text-sm text-muted-foreground">Real-time performance tracking, risk metrics, and alpha generation analysis</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-4 p-6 rounded-xl bg-card/50 border border-border/50">
              <div className="p-3 rounded-lg bg-primary/15">
                <BarChart3 className="h-7 w-7 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold">Institutional-Grade Reporting</h3>
                <p className="text-sm text-muted-foreground">P&L statements, balance sheets, cash flow analysis, and regulatory compliance</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-4 p-6 rounded-xl bg-card/50 border border-border/50">
              <div className="p-3 rounded-lg bg-primary/15">
                <DollarSign className="h-7 w-7 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold">Multi-Asset Class Management</h3>
                <p className="text-sm text-muted-foreground">Equities, fixed income, alternatives, and digital assets in unified interface</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-4 p-6 rounded-xl bg-card/50 border border-border/50">
              <div className="p-3 rounded-lg bg-primary/15">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold">Enterprise Security</h3>
                <p className="text-sm text-muted-foreground">Bank-grade encryption, secure data architecture, and compliance frameworks</p>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border/30">
            <p className="text-base text-muted-foreground font-medium">
              © 2025 Personal Project by <span className="font-semibold text-foreground">Manuel de la Torre</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2 opacity-80">
              Professional Financial Management & Investment Analytics Platform
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Centered Login Form */}
      <div className="flex flex-1 lg:max-w-xl xl:max-w-2xl items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Card className="border-border/50 shadow-xl backdrop-blur-sm">
            <CardHeader className="space-y-8 pb-8 px-8 pt-10">
              <div className="flex justify-center lg:hidden">
                <div className="flex items-center gap-3">
                  <Logo size={44} />
                  <div>
                    <h1 className="text-xl font-bold">Savium Finance</h1>
                    <p className="text-xs text-muted-foreground">Wealth Management</p>
                  </div>
                </div>
              </div>
              <div className="text-center space-y-3">
                <CardTitle className="text-2xl font-bold tracking-tight">Iniciar Sesión</CardTitle>
                <CardDescription className="text-base">
                  Accede a tu plataforma de gestión financiera profesional
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-8 px-8 pb-10">
              {!showForgotPassword ? (
                <form onSubmit={handleSignIn} method="post" className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="signin-email" className="text-sm font-semibold">
                      Correo Electrónico
                    </Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="usuario@ejemplo.com"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      className="h-12 text-base"
                      required
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="signin-password" className="text-sm font-semibold">
                      Contraseña
                    </Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      className="h-12 text-base"
                      required
                    />
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      />
                      <Label htmlFor="remember-me" className="text-sm text-muted-foreground font-medium">
                        Recordar sesión
                      </Label>
                    </div>
                    
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-sm text-primary hover:text-primary/80 font-medium"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      ¿Olvidaste tu contraseña?
                    </Button>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold mt-8" 
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Iniciando sesión...
                      </div>
                    ) : (
                      'Iniciar Sesión'
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleForgotPassword} method="post" className="space-y-6">
                  <div className="text-center space-y-3">
                    <h3 className="text-xl font-semibold">Recuperar Contraseña</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Ingresa tu correo electrónico y te enviaremos un enlace seguro para restablecer tu contraseña
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="forgot-email" className="text-sm font-semibold">
                      Correo Electrónico
                    </Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="usuario@ejemplo.com"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      className="h-12 text-base"
                      required
                    />
                  </div>
                  
                  <div className="space-y-4 pt-4">
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-semibold" 
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center gap-3">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Enviando...
                        </div>
                      ) : (
                        'Enviar enlace de recuperación'
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 font-medium"
                      onClick={() => setShowForgotPassword(false)}
                    >
                      Volver al inicio de sesión
                    </Button>
                  </div>
                </form>
              )}
              
              <div className="lg:hidden text-center pt-8 border-t border-border/30">
                <p className="text-sm text-muted-foreground">
                  Proyecto personal de <span className="font-semibold">Manuel de la Torre</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;