import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { CreditCard, Plus, Trash2, Calendar } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from '@/hooks/use-toast';

const subscriptionSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  monto: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  tipo: z.enum(['Mensual', 'Trimestral', 'Anual']),
  descripcion: z.string().optional(),
});

type SubscriptionFormData = z.infer<typeof subscriptionSchema>;

interface Subscription {
  id: string;
  nombre: string;
  monto: number;
  tipo: 'Mensual' | 'Trimestral' | 'Anual';
  descripcion?: string;
  montoMensual: number;
}

export const SubscriptionsManager = () => {
  const { formatCurrency } = useAppConfig();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([
    {
      id: '1',
      nombre: 'Netflix',
      monto: 149,
      tipo: 'Mensual',
      descripcion: 'Streaming de películas y series',
      montoMensual: 149
    },
    {
      id: '2',
      nombre: 'Spotify',
      monto: 129,
      tipo: 'Mensual',
      descripcion: 'Música streaming',
      montoMensual: 129
    },
    {
      id: '3',
      nombre: 'Amazon Prime',
      monto: 999,
      tipo: 'Anual',
      descripcion: 'Compras y streaming',
      montoMensual: 83.25
    }
  ]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema)
  });

  const calculateMonthlyAmount = (monto: number, tipo: string) => {
    switch (tipo) {
      case 'Trimestral':
        return monto / 3;
      case 'Anual':
        return monto / 12;
      default:
        return monto;
    }
  };

  const onSubmit = (data: SubscriptionFormData) => {
    const newSubscription: Subscription = {
      id: Date.now().toString(),
      nombre: data.nombre,
      monto: data.monto,
      tipo: data.tipo,
      descripcion: data.descripcion,
      montoMensual: calculateMonthlyAmount(data.monto, data.tipo)
    };

    setSubscriptions(prev => [...prev, newSubscription]);
    setIsDialogOpen(false);
    reset();
    toast({
      title: "Suscripción agregada",
      description: `${data.nombre} ha sido agregada exitosamente.`
    });
  };

  const deleteSubscription = (id: string) => {
    setSubscriptions(prev => prev.filter(sub => sub.id !== id));
    toast({
      title: "Suscripción eliminada",
      description: "La suscripción ha sido eliminada exitosamente."
    });
  };

  const totalMensual = subscriptions.reduce((sum, sub) => sum + sub.montoMensual, 0);

  return (
    <Card className="hover-scale border-primary/20 hover:border-primary/40 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Suscripciones y Cuotas Mensuales
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground text-sm">
            Gestiona tus suscripciones y cuotas recurrentes
          </p>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Suscripción</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    placeholder="Netflix, Spotify, etc."
                    {...register('nombre')}
                  />
                  {errors.nombre && (
                    <p className="text-sm text-destructive mt-1">{errors.nombre.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="monto">Monto</Label>
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('monto', { valueAsNumber: true })}
                  />
                  {errors.monto && (
                    <p className="text-sm text-destructive mt-1">{errors.monto.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="tipo">Frecuencia</Label>
                  <Select onValueChange={(value) => setValue('tipo', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar frecuencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mensual">Mensual</SelectItem>
                      <SelectItem value="Trimestral">Trimestral</SelectItem>
                      <SelectItem value="Anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.tipo && (
                    <p className="text-sm text-destructive mt-1">{errors.tipo.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="descripcion">Descripción (opcional)</Label>
                  <Input
                    id="descripcion"
                    placeholder="Breve descripción del servicio"
                    {...register('descripcion')}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    Agregar Suscripción
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {subscriptions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tienes suscripciones registradas</p>
            <p className="text-sm">Agrega tus primeras suscripciones para llevar un control</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {subscriptions.map((subscription) => (
                <div key={subscription.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{subscription.nombre}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {subscription.tipo}
                      </Badge>
                    </div>
                    {subscription.descripcion && (
                      <p className="text-sm text-muted-foreground">{subscription.descripcion}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-muted-foreground">
                        {subscription.tipo}: ${formatCurrency(subscription.monto)}
                      </span>
                      <span className="text-primary font-medium">
                        Mensual: ${formatCurrency(subscription.montoMensual)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSubscription(subscription.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-medium">Total Mensual</span>
                </div>
                <span className="text-xl font-bold text-primary">
                  ${formatCurrency(totalMensual)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};