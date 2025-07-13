import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Settings } from 'lucide-react';
import { useState } from 'react';
import { User as UserType, Currency, CURRENCIES } from '@/types/user';
import { useToast } from '@/hooks/use-toast';

interface UserConfigProps {
  user: UserType;
  onUpdateUser: (updates: Partial<Omit<UserType, 'id' | 'createdAt'>>) => void;
}

export const UserConfig = ({ user, onUpdateUser }: UserConfigProps) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [primaryCurrency, setPrimaryCurrency] = useState(user.primaryCurrency);
  const { toast } = useToast();

  const handleSave = () => {
    onUpdateUser({
      name,
      email,
      primaryCurrency
    });
    
    toast({
      title: "Configuración guardada",
      description: "Los datos del usuario se han actualizado correctamente.",
    });
  };

  const hasChanges = name !== user.name || email !== user.email || primaryCurrency !== user.primaryCurrency;

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
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </div>
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