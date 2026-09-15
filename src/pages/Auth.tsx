import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
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

    const { error } = await signIn(email, password, rememberMe);

    if (error) {
      toast({
        title: 'Error al iniciar sesión',
        description: error.message,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await resetPassword(email);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setShowForgotPassword(false);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-primary/5 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card className="border-border/50 shadow-xl backdrop-blur-sm">
          <CardHeader className="pb-6 px-8 pt-10">
            <div className="flex items-center justify-center gap-3">
              <img
                src="/images/logo-auth.png"
                alt="Savium"
                className="h-12 w-12"
              />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Savium Finance</h1>
                <p className="text-sm text-muted-foreground font-medium">Wealth Management Platform</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-8 px-8 pb-10">
            {!showForgotPassword ? (
              <form onSubmit={handleSignIn} method="post" className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="signin-email" className="text-sm font-semibold">
                    Email
                  </Label>
                  <Input
                    id="signin-email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                      Recordarme
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
                      Entrando...
                    </div>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleForgotPassword} method="post" className="space-y-6">
                <div className="text-center space-y-3">
                  <h3 className="text-xl font-semibold">Recuperar contraseña</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Te enviaremos un enlace por email para restablecerla
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="forgot-email" className="text-sm font-semibold">
                    Email
                  </Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                      'Enviar enlace'
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 font-medium"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Volver
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
