import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { User, AlertCircle, CheckCircle } from 'lucide-react';

export const CompleteProfileBanner = () => {
  const { profile, completeProfile } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [edad, setEdad] = useState('');
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);

  const isProfileIncomplete = profile && (!profile.nombre || !profile.apellidos);

  useEffect(() => {
    if (profile && profile.nombre && profile.apellidos) {
      setCompleted(true);
    }
  }, [profile]);

  if (!isProfileIncomplete || completed) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!nombre.trim() || !apellidos.trim()) {
      setError('Nombre y apellidos son obligatorios');
      setLoading(false);
      return;
    }

    const { error } = await completeProfile({
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      edad: edad ? parseInt(edad) : undefined
    });

    if (error) {
      setError('Error al actualizar el perfil');
    } else {
      setCompleted(true);
    }

    setLoading(false);
  };

  if (!showForm) {
    return (
      <Card className="border-blue-200 bg-blue-50 mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <User className="h-5 w-5" />
            Completa tu Perfil
          </CardTitle>
          <CardDescription className="text-blue-700">
            Tu perfil está incompleto. Complétalo para una mejor experiencia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Completar Perfil
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setCompleted(true)}
            >
              Más Tarde
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <User className="h-5 w-5" />
          Completa tu Perfil
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                placeholder="Tu nombre"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="apellidos">Apellidos *</Label>
              <Input
                id="apellidos"
                type="text"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                required
                placeholder="Tus apellidos"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edad">Edad</Label>
            <Input
              id="edad"
              type="number"
              value={edad}
              onChange={(e) => setEdad(e.target.value)}
              placeholder="25"
              min="13"
              max="120"
            />
          </div>
          
          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowForm(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};