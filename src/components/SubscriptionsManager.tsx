import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionService, useSubscriptionServices } from '@/hooks/useSubscriptionServices';
import { useSubscriptionSync } from '@/hooks/useSubscriptionSync';
import { supabase } from '@/integrations/supabase/client';
import { financeQueryKeys } from '@/lib/finance/queryKeys';
import { calculateNextPayment, previousPaymentAmount, SubscriptionFrequency } from '@/lib/finance/subscriptions';
import { parseFechaLocal, toFechaISO } from '@/lib/finance/fechas';
import { Transaction } from '@/types/finance';
import { CreditCard, Calendar, Clock, Repeat, RefreshCw, Edit2, Check, X, TrendingUp, TrendingDown, Merge } from 'lucide-react';
import { toast } from 'sonner';

const FREQUENCY_OPTIONS: { value: SubscriptionFrequency; label: string }[] = [
  { value: 'Semanal', label: 'Semanal' },
  { value: 'Mensual', label: 'Mensual' },
  { value: 'Bimestral', label: 'Bimestral' },
  { value: 'Trimestral', label: 'Trimestral' },
  { value: 'Semestral', label: 'Semestral' },
  { value: 'Anual', label: 'Anual' },
];

/** Fila de BD + datos derivados para pintar. */
interface ServiceView {
  id: string;
  serviceName: string;
  tipoServicio: string;
  frecuencia: SubscriptionFrequency;
  ultimoPago: { monto: number; fecha: Date; mes: string };
  previousPaymentAmount: number | null;
  proximoPago: Date;
  numeroPagos: number;
  originalComments: string[];
  active: boolean;
}

const toView = (row: SubscriptionService, transactions: Transaction[]): ServiceView => {
  const fecha = parseFechaLocal(row.ultimo_pago_fecha);
  return {
    id: row.id,
    serviceName: row.service_name,
    tipoServicio: row.tipo_servicio,
    frecuencia: row.frecuencia as SubscriptionFrequency,
    ultimoPago: {
      monto: Number(row.ultimo_pago_monto),
      fecha,
      mes: fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
    },
    previousPaymentAmount: previousPaymentAmount(row.original_comments ?? [], transactions),
    proximoPago: parseFechaLocal(row.proximo_pago),
    numeroPagos: row.numero_pagos,
    originalComments: row.original_comments ?? [],
    active: row.active,
  };
};

const getFrequencyBadgeVariant = (frequency: string) => {
  switch (frequency) {
    case 'Semanal': return 'default';
    case 'Mensual': return 'default';
    case 'Bimestral': return 'default';
    case 'Trimestral': return 'secondary';
    case 'Semestral': return 'secondary';
    case 'Anual': return 'secondary';
    default: return 'outline';
  }
};

export const SubscriptionsManager = () => {
  const { formatCurrency } = useAppConfig();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { transactions, loading: loadingTx } = useFinanceDataSupabase();
  const { subscriptions, loading: loadingSubs } = useSubscriptionServices();
  const { sync, syncIfChanged, syncing } = useSubscriptionSync();

  const [showInactive, setShowInactive] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingFrequencyId, setEditingFrequencyId] = useState<string | null>(null);
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');

  // Disparador (a): detectar al montar, una vez por identidad del array de transacciones de la caché.
  useEffect(() => {
    if (!loadingTx && transactions.length > 0) syncIfChanged();
  }, [transactions, loadingTx, syncIfChanged]);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: financeQueryKeys(user?.id).subscriptions });

  const services = useMemo(
    () => subscriptions
      .map(r => toView(r, transactions))
      .sort((a, b) => b.ultimoPago.fecha.getTime() - a.ultimoPago.fecha.getTime()),
    [subscriptions, transactions],
  );

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('subscription_services').update({ active }).eq('id', id);
      if (error) throw error;
      return active;
    },
    onSuccess: (active) => {
      toast.success(active ? 'Suscripción activada' : 'Suscripción desactivada');
      invalidar();
    },
    onError: (e) => {
      console.error('Error updating subscription status:', e);
      toast.error('Error al actualizar el estado de la suscripción');
    },
  });

  const saveName = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('subscription_services')
        .update({ service_name: name })
        .eq('id', id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('not-found');
    },
    onSuccess: () => {
      toast.success('Nombre de suscripción actualizado');
      setEditingServiceId(null);
      setEditingName('');
      invalidar();
    },
    onError: (e: { code?: string; message?: string }) => {
      console.error('Error updating service name:', e);
      if (e?.code === '23505') toast.error('Ya existe otra suscripción con ese nombre');
      else if (e?.message === 'not-found') toast.error('No se encontró la suscripción a renombrar. Vuelve a analizar las suscripciones.');
      else toast.error(`Error al actualizar el nombre: ${e?.message ?? ''}`);
    },
  });

  const saveFrequency = useMutation({
    mutationFn: async ({ id, frecuencia, ultimoPago }: { id: string; frecuencia: SubscriptionFrequency; ultimoPago: Date }) => {
      const { error } = await supabase
        .from('subscription_services')
        .update({
          frecuencia,
          proximo_pago: toFechaISO(calculateNextPayment(ultimoPago, frecuencia)),
          // Editada por el usuario: el sync ya no la vuelve a detectar.
          frecuencia_manual: true,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingFrequencyId(null);
      invalidar();
    },
    onError: (e) => {
      console.error('Error updating frequency:', e);
      toast.error('Error al actualizar la frecuencia');
    },
  });

  const merge = useMutation({
    mutationFn: async ({ source, target }: { source: ServiceView; target: ServiceView }) => {
      const { data: targetRow } = await supabase
        .from('subscription_services')
        .select('aliases')
        .eq('id', target.id)
        .maybeSingle();
      const existingAliases: string[] = targetRow?.aliases ?? [];
      const newAliases = Array.from(new Set([
        ...existingAliases,
        ...source.originalComments.map(c => (c || '').toLowerCase().trim()).filter(Boolean),
      ]));
      const { error: updErr } = await supabase.from('subscription_services').update({ aliases: newAliases }).eq('id', target.id);
      if (updErr) throw updErr;
      const { error: delErr } = await supabase.from('subscription_services').delete().eq('id', source.id);
      if (delErr) throw delErr;
    },
    onSuccess: async () => {
      setMergeSourceId(null);
      setMergeTargetId('');
      await invalidar();
      // Los alias nuevos cambian la detección: sincronización explícita, sin await:
      // un fallo del sync tiene su propio toast y no debe marcar la fusión (ya hecha) como error.
      sync().catch(() => undefined);
    },
    onError: (e) => {
      console.error('Error merging subscriptions:', e);
      toast.error('Error al fusionar las suscripciones');
    },
  });

  const startEditingName = (serviceId: string, currentName: string) => {
    setEditingServiceId(serviceId);
    setEditingName(currentName);
  };
  const saveEditedName = () => {
    if (syncing || !editingServiceId || !editingName.trim()) return;
    saveName.mutate({ id: editingServiceId, name: editingName.trim() });
  };
  const cancelEditingName = () => {
    setEditingServiceId(null);
    setEditingName('');
  };
  const saveEditedFrequency = (service: ServiceView, frecuencia: SubscriptionFrequency) => {
    if (syncing) return;
    saveFrequency.mutate({ id: service.id, frecuencia, ultimoPago: service.ultimoPago.fecha });
  };
  const performMerge = () => {
    if (syncing || !mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId) return;
    const source = services.find(s => s.id === mergeSourceId);
    const target = services.find(s => s.id === mergeTargetId);
    if (!source || !target) return;
    merge.mutate({ source, target });
  };

  const isLoading = syncing || loadingSubs;

  const filteredServices = useMemo(
    () => services.filter(service => (showInactive ? true : service.active)),
    [services, showInactive],
  );

  const monthlySubscriptionsTotal = useMemo(() => {
    const activeMonthlyServices = services.filter(service => service.active && service.frecuencia === 'Mensual');
    const totalAmount = activeMonthlyServices.reduce((sum, service) => sum + service.ultimoPago.monto, 0);
    return { count: activeMonthlyServices.length, totalAmount };
  }, [services]);

  return (
    <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Suscripciones Activas
          </div>
          {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground text-sm">
            Análisis automático de los últimos 24 meses
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={(checked) => setShowInactive(checked as boolean)}
              />
              <label htmlFor="show-inactive" className="text-xs text-muted-foreground cursor-pointer">
                Mostrar inactivas
              </label>
            </div>
            <Badge variant="outline" className="text-xs">
              {filteredServices.length} servicios {showInactive ? 'total' : 'activos'}
            </Badge>
          </div>
        </div>

        {monthlySubscriptionsTotal.count > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="font-semibold text-primary">Suscripciones Mensuales Activas</h4>
                  <p className="text-sm text-muted-foreground">
                    {monthlySubscriptionsTotal.count} servicio{monthlySubscriptionsTotal.count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  ${formatCurrency(monthlySubscriptionsTotal.totalAmount)}
                </div>
                <div className="text-sm text-muted-foreground">por mes</div>
              </div>
            </div>
          </div>
        )}

        {filteredServices.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No se detectaron suscripciones</p>
            <p className="text-sm">Se detectarán automáticamente a partir de tus transacciones</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredServices.map((service) => (
              <div key={service.id} className={`group p-4 rounded-lg border transition-colors ${!service.active ? 'bg-muted/20 border-muted' : 'bg-card hover:bg-muted/5'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      checked={service.active}
                      onCheckedChange={(checked) => toggleActive.mutate({ id: service.id, active: checked as boolean })}
                      aria-label={`${service.active ? 'Desactivar' : 'Activar'} suscripción de ${service.serviceName}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {editingServiceId === service.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="h-8 text-lg font-semibold"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditedName();
                                else if (e.key === 'Escape') cancelEditingName();
                              }}
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" onClick={saveEditedName} disabled={syncing} className="h-8 w-8 p-0">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEditingName} className="h-8 w-8 p-0">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold text-lg ${!service.active ? 'text-muted-foreground' : ''}`}>
                              {service.serviceName}
                            </h3>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditingName(service.id, service.serviceName)}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Editar nombre"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setMergeSourceId(service.id); setMergeTargetId(''); }}
                              disabled={syncing}
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Fusionar con otra suscripción"
                            >
                              <Merge className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {editingFrequencyId === service.id ? (
                          <div className="flex items-center gap-1">
                            {FREQUENCY_OPTIONS.map(opt => (
                              <Badge
                                key={opt.value}
                                variant={service.frecuencia === opt.value ? 'default' : 'outline'}
                                className={`text-xs cursor-pointer hover:bg-primary/20 ${syncing ? 'pointer-events-none opacity-60' : ''}`}
                                onClick={() => saveEditedFrequency(service, opt.value)}
                              >
                                {opt.label}
                              </Badge>
                            ))}
                            <Button size="sm" variant="ghost" onClick={() => setEditingFrequencyId(null)} className="h-5 w-5 p-0">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Badge
                            variant={getFrequencyBadgeVariant(service.frecuencia)}
                            className="text-xs cursor-pointer hover:ring-1 hover:ring-primary/50"
                            onClick={() => setEditingFrequencyId(service.id)}
                            title="Clic para cambiar frecuencia"
                          >
                            {service.frecuencia}
                          </Badge>
                        )}
                        {!service.active && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Inactiva
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{service.tipoServicio}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {service.numeroPagos} pagos
                  </Badge>
                </div>

                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 text-sm ${!service.active ? 'opacity-60' : ''}`}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Último pago:</span>
                        <div className="font-medium">{service.ultimoPago.mes}</div>
                        <div className="flex items-center gap-1">
                          <span className="text-primary font-bold text-lg">
                            ${formatCurrency(service.ultimoPago.monto)}
                          </span>
                          {service.previousPaymentAmount != null && service.previousPaymentAmount !== service.ultimoPago.monto && (
                            <span title={`Anterior: $${formatCurrency(service.previousPaymentAmount)}`}>
                              {service.ultimoPago.monto > service.previousPaymentAmount
                                ? <TrendingUp className="h-4 w-4 text-destructive" />
                                : <TrendingDown className="h-4 w-4 text-success" />
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Próximo pago estimado:</span>
                        <div className="font-medium">
                          {service.proximoPago.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Repeat className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Frecuencia: {service.frecuencia}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!mergeSourceId} onOpenChange={(open) => { if (!open) { setMergeSourceId(null); setMergeTargetId(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fusionar suscripción</DialogTitle>
            <DialogDescription>
              Une <strong>{services.find(s => s.id === mergeSourceId)?.serviceName}</strong> con otra suscripción. Los cargos actuales y futuros se agruparán bajo la suscripción destino.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Fusionar en:</label>
            <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la suscripción destino" />
              </SelectTrigger>
              <SelectContent>
                {services
                  .filter(s => s.id !== mergeSourceId)
                  .map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.serviceName}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMergeSourceId(null); setMergeTargetId(''); }}>Cancelar</Button>
            <Button onClick={performMerge} disabled={syncing || !mergeTargetId || merge.isPending}>Fusionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
