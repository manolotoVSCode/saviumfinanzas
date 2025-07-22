import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InversionFormData, Inversion } from '@/types/inversiones';

const inversionSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  tipo: z.enum(['Interés fijo', 'Fondo variable', 'Criptomoneda']),
  monto_invertido: z.number().min(0, 'El monto debe ser mayor a 0'),
  rendimiento_bruto: z.number().optional(),
  rendimiento_neto: z.number().optional(),
  valor_actual: z.number().min(0, 'El valor actual debe ser mayor a 0'),
  modalidad: z.enum(['Reinversión', 'Pago mensual', 'Pago trimestral']),
  moneda: z.enum(['MXN', 'USD', 'EUR']),
  fecha_inicio: z.string().min(1, 'La fecha de inicio es requerida'),
  ultimo_pago: z.string().optional(),
});

interface InversionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InversionFormData) => Promise<boolean>;
  inversion?: Inversion;
  title?: string;
}

export const InversionForm: React.FC<InversionFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  inversion,
  title = "Nueva Inversión"
}) => {
  const form = useForm<InversionFormData>({
    resolver: zodResolver(inversionSchema),
    defaultValues: inversion ? {
      nombre: inversion.nombre,
      tipo: inversion.tipo,
      monto_invertido: inversion.monto_invertido,
      rendimiento_bruto: inversion.rendimiento_bruto || undefined,
      rendimiento_neto: inversion.rendimiento_neto || undefined,
      valor_actual: inversion.valor_actual,
      modalidad: inversion.modalidad,
      moneda: inversion.moneda,
      fecha_inicio: inversion.fecha_inicio,
      ultimo_pago: inversion.ultimo_pago || undefined,
    } : {
      nombre: '',
      tipo: 'Fondo variable',
      monto_invertido: 0,
      valor_actual: 0,
      modalidad: 'Reinversión',
      moneda: 'MXN',
      fecha_inicio: new Date().toISOString().split('T')[0],
    }
  });

  const watchedTipo = form.watch('tipo');
  const watchedModalidad = form.watch('modalidad');

  const handleSubmit = async (data: InversionFormData) => {
    const success = await onSubmit(data);
    if (success) {
      onOpenChange(false);
      form.reset();
    }
  };

  const calcularRendimientoNeto = () => {
    const bruto = form.getValues('rendimiento_bruto');
    if (bruto && watchedTipo === 'Interés fijo') {
      // Aplicar impuestos del 30% aproximadamente
      const neto = bruto * 0.7;
      form.setValue('rendimiento_neto', parseFloat(neto.toFixed(2)));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre de la inversión" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Interés fijo">Interés fijo</SelectItem>
                        <SelectItem value="Fondo variable">Fondo variable</SelectItem>
                        <SelectItem value="Criptomoneda">Criptomoneda</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monto_invertido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto Invertido</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valor_actual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Actual</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        disabled={watchedTipo === 'Criptomoneda'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {watchedTipo === 'Interés fijo' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rendimiento_bruto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rendimiento Bruto (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => {
                            field.onChange(parseFloat(e.target.value) || undefined);
                            setTimeout(calcularRendimientoNeto, 100);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rendimiento_neto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rendimiento Neto (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="modalidad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modalidad</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar modalidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Reinversión">Reinversión</SelectItem>
                        <SelectItem value="Pago mensual">Pago mensual</SelectItem>
                        <SelectItem value="Pago trimestral">Pago trimestral</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="moneda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moneda</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar moneda" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MXN">MXN</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fecha_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Inicio</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedModalidad !== 'Reinversión' && (
                <FormField
                  control={form.control}
                  name="ultimo_pago"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Último Pago</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {inversion ? 'Actualizar' : 'Crear'} Inversión
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};