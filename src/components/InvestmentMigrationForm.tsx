import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Account } from '@/types/finance';
import { Save, AlertCircle } from 'lucide-react';

const inversionFormSchema = z.object({
  tipo_inversion: z.enum(['Interés fijo', 'Fondo variable', 'Criptomoneda']),
  modalidad: z.enum(['Reinversión', 'Pago mensual', 'Pago trimestral']),
  rendimiento_bruto: z.number().optional(),
  rendimiento_neto: z.number().optional(),
  fecha_inicio: z.string().min(1, 'La fecha de inicio es requerida'),
  ultimo_pago: z.string().optional(),
  valor_mercado_actualizado: z.number().min(0, 'El valor debe ser mayor a 0'),
});

type InversionFormData = z.infer<typeof inversionFormSchema>;

interface InvestmentMigrationFormProps {
  account: Account;
  onComplete: () => void;
}

export const InvestmentMigrationForm: React.FC<InvestmentMigrationFormProps> = ({
  account,
  onComplete
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<InversionFormData>({
    resolver: zodResolver(inversionFormSchema),
    defaultValues: {
      tipo_inversion: account.tipo_inversion || 'Fondo variable',
      modalidad: account.modalidad || 'Reinversión',
      fecha_inicio: account.fecha_inicio || '2025-01-01',
      valor_mercado_actualizado: account.valorMercado || account.saldoActual || account.saldoInicial,
      rendimiento_bruto: account.rendimiento_bruto,
      rendimiento_neto: account.rendimiento_neto,
      ultimo_pago: account.ultimo_pago || '',
    }
  });

  const watchedTipo = form.watch('tipo_inversion');
  const watchedModalidad = form.watch('modalidad');
  const watchedFechaInicio = form.watch('fecha_inicio');
  const watchedRendimientoBruto = form.watch('rendimiento_bruto');

  const calcularRendimientoNeto = () => {
    const bruto = form.getValues('rendimiento_bruto');
    if (bruto && watchedTipo === 'Interés fijo') {
      // Aplicar impuestos del 30% aproximadamente
      const neto = bruto * 0.7;
      form.setValue('rendimiento_neto', parseFloat(neto.toFixed(2)));
    }
  };

  const calcularValorActualReinversion = () => {
    if (watchedModalidad === 'Reinversión' && watchedRendimientoBruto && watchedFechaInicio) {
      const fechaInicio = new Date(watchedFechaInicio);
      const hoy = new Date();
      const diasTranscurridos = Math.floor((hoy.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diasTranscurridos > 0) {
        const aniosTranscurridos = diasTranscurridos / 365.25;
        const tasaDecimal = watchedRendimientoBruto / 100;
        const valorCalculado = account.saldoInicial * Math.pow(1 + tasaDecimal, aniosTranscurridos);
        form.setValue('valor_mercado_actualizado', parseFloat(valorCalculado.toFixed(2)));
      }
    }
  };

  const handleSubmit = async (data: InversionFormData) => {
    setLoading(true);
    try {
      const updateData: any = {
        tipo_inversion: data.tipo_inversion,
        modalidad: data.modalidad,
        fecha_inicio: data.fecha_inicio,
        valor_mercado: data.valor_mercado_actualizado,
      };

      if (data.rendimiento_bruto) updateData.rendimiento_bruto = data.rendimiento_bruto;
      if (data.rendimiento_neto) updateData.rendimiento_neto = data.rendimiento_neto;
      if (data.ultimo_pago) updateData.ultimo_pago = data.ultimo_pago;

      console.log('Datos a actualizar:', updateData);
      console.log('ID de la cuenta:', account.id);

      const { data: updatedData, error } = await supabase
        .from('cuentas')
        .update(updateData)
        .eq('id', account.id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Datos actualizados:', updatedData);

      toast({
        title: "¡Inversión actualizada!",
        description: `La información de ${account.nombre} ha sido completada exitosamente.`,
      });

      // Forzar actualización inmediata
      window.location.reload();
    } catch (error) {
      console.error('Error updating investment:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la información de la inversión",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Completar información: {account.nombre}
        </CardTitle>
        <div className="flex gap-2">
          <Badge variant="outline">{account.divisa}</Badge>
          <Badge variant="secondary">{account.tipo}</Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          Saldo inicial: ${account.saldoInicial.toLocaleString()} | 
          Valor actual: ${(account.valorMercado || account.saldoActual || 0).toLocaleString()}
        </div>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo_inversion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Inversión</FormLabel>
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

              <FormField
                control={form.control}
                name="modalidad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modalidad</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      setTimeout(calcularValorActualReinversion, 100);
                    }} defaultValue={field.value}>
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
                            setTimeout(() => {
                              calcularRendimientoNeto();
                              calcularValorActualReinversion();
                            }, 100);
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
                name="fecha_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Inicio</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          setTimeout(calcularValorActualReinversion, 100);
                        }}
                      />
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

            <FormField
              control={form.control}
              name="valor_mercado_actualizado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Valor Actual Correcto
                    {watchedModalidad === 'Reinversión' && watchedRendimientoBruto && watchedFechaInicio && (
                      <span className="text-xs text-blue-600 ml-2">(Se calcula automáticamente con reinversión)</span>
                    )}
                  </FormLabel>
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

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Guardando...' : 'Completar Información'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};