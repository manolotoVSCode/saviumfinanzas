import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { validarNuevaContrasena } from '@/lib/recuperacion';

/** Va por delante del router: el enlace del correo trae un fragmento que HashRouter tomaría por una ruta. */
export const Recuperacion = ({ children }: { children: ReactNode }) => {
  const { recuperacion, terminarRecuperacion } = useAuth();
  const [clave, setClave] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (!recuperacion) return <>{children}</>;

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    const invalida = validarNuevaContrasena(clave, repetida);
    setError(invalida);
    if (invalida) return;

    setGuardando(true);
    const { error: fallo } = await supabase.auth.updateUser({ password: clave });
    setGuardando(false);
    if (fallo) {
      setError(fallo.message);
      return;
    }
    terminarRecuperacion();
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{recuperacion === 'nueva' ? 'Crea una contraseña nueva' : 'El enlace ya no sirve'}</CardTitle>
        </CardHeader>
        <CardContent>
          {recuperacion === 'nueva' ? (
            <form onSubmit={guardar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nueva-clave">Contraseña nueva</Label>
                <Input id="nueva-clave" type="password" autoComplete="new-password" autoFocus value={clave} onChange={e => setClave(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repetir-clave">Repite la contraseña</Label>
                <Input id="repetir-clave" type="password" autoComplete="new-password" value={repetida} onChange={e => setRepetida(e.target.value)} required />
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar y entrar'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Caducó o ya se usó. Pide otro desde «¿Olvidaste tu contraseña?».</p>
              <Button className="w-full" onClick={terminarRecuperacion}>Volver a entrar</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};
