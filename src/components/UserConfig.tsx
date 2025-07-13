import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Settings, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { User as UserType, Currency, CURRENCIES } from '@/types/user';
import { COUNTRIES } from '@/types/countries';
import { useToast } from '@/hooks/use-toast';

interface UserConfigProps {
  user: UserType;
  onUpdateUser: (updates: Partial<Omit<UserType, 'id' | 'createdAt'>>) => void;
}

export const UserConfig = ({ user, onUpdateUser }: UserConfigProps) => {
  const [nombre, setNombre] = useState(user.nombre);
  const [apellidos, setApellidos] = useState(user.apellidos);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState(user.password);
  const [pais, setPais] = useState(user.pais);
  const [edad, setEdad] = useState(user.edad);
  const [primaryCurrency, setPrimaryCurrency] = useState(user.primaryCurrency);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    onUpdateUser({
      nombre,
      apellidos,
      email,
      password,
      pais,
      edad,
      primaryCurrency
    });
    
    toast({
      title: "Configuración guardada",
      description: "Los datos del usuario se han actualizado correctamente.",
    });
  };

  const hasChanges = nombre !== user.nombre || 
                    apellidos !== user.apellidos || 
                    email !== user.email || 
                    password !== user.password ||
                    pais !== user.pais ||
                    edad !== user.edad ||
                    primaryCurrency !== user.primaryCurrency;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Configuración de Usuario</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre"
              />
            </div>
            <div>
              <Label htmlFor="apellidos">Apellidos</Label>
              <Input
                id="apellidos"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                placeholder="Apellidos"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email (Usuario)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="pais">País</Label>
              <Select value={pais} onValueChange={(value) => setPais(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edad">Edad</Label>
              <Input
                id="edad"
                type="number"
                min="18"
                max="120"
                value={edad}
                onChange={(e) => setEdad(parseInt(e.target.value) || 18)}
                placeholder="Edad"
              />
            </div>
            <div>
              <Label htmlFor="currency">Divisa Principal</Label>
              <Select value={primaryCurrency} onValueChange={(value: Currency) => setPrimaryCurrency(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CURRENCIES).map(([code, { name, symbol }]) => (
                    <SelectItem key={code} value={code}>
                      {symbol} - {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4">
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges}
              className="w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              Guardar Configuración
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};