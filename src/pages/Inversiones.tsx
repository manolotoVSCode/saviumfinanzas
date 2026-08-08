import { useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import CriptomonedasManager from '@/components/CriptomonedasManager';
import { InvestmentTypesManager } from '@/components/investments/InvestmentTypesManager';
import { InvestmentDialog } from '@/components/investments/InvestmentDialog';
import { InvestmentTrackingDialog } from '@/components/investments/InvestmentTrackingDialog';
import { useInvestments } from '@/hooks/useInvestments';
import { useInvestmentTypes } from '@/hooks/useInvestmentTypes';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { formatNumber } from '@/lib/formatters';
import { Investment } from '@/types/investments';
import { LineChart, Pencil, Plus, RefreshCw, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['hsl(var(--primary))', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#0088FE'];

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX');
};

const Inversiones = (): JSX.Element => {
  const {
    investments, valuations, payouts, loading,
    saveInvestment, deleteInvestment, addValuation, deleteValuation, addPayout, deletePayout,
  } = useInvestments();
  const { types } = useInvestmentTypes();
  const { config } = useAppConfig();
  const { convertCurrency } = useExchangeRates();
  const prefCurrency = config.currency;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [tracking, setTracking] = useState<Investment | null>(null);
  const [toDelete, setToDelete] = useState<Investment | null>(null);

  const activas = useMemo(() => investments.filter((i) => i.activa !== false), [investments]);

  const toPref = (amount: number, divisa: string) =>
    divisa === prefCurrency ? amount : convertCurrency(amount, divisa as 'MXN' | 'USD' | 'EUR', prefCurrency);

  const totals = activas.reduce(
    (acc, i) => {
      acc.invertido += toPref(i.monto_invertido || 0, i.moneda);
      acc.valor += toPref(i.valor_actual || i.monto_invertido || 0, i.moneda);
      return acc;
    },
    { invertido: 0, valor: 0 },
  );
  const rendimiento = totals.valor - totals.invertido;
  const rendimientoPct = totals.invertido ? (rendimiento / totals.invertido) * 100 : 0;

  const cobrosAnio = payouts
    .filter((p) => p.fecha.startsWith(String(new Date().getFullYear())))
    .reduce((sum, p) => sum + toPref(p.monto, p.divisa), 0);

  const usageCount = useMemo(() => {
    const map: Record<string, number> = {};
    investments.forEach((i) => {
      if (i.tipo_id) map[i.tipo_id] = (map[i.tipo_id] || 0) + 1;
    });
    return map;
  }, [investments]);

  const grupos = useMemo(() => {
    const map = new Map<string, { nombre: string; items: Investment[] }>();
    activas.forEach((i) => {
      const t = types.find((x) => x.id === i.tipo_id);
      const key = t?.id || 'sin-tipo';
      if (!map.has(key)) map.set(key, { nombre: t?.nombre || 'Sin tipo asignado', items: [] });
      map.get(key)!.items.push(i);
    });
    return Array.from(map.values());
  }, [activas, types]);

  const pieData = grupos.map((g) => ({
    name: g.nombre,
    value: Math.abs(g.items.reduce((s, i) => s + toPref(i.valor_actual || i.monto_invertido || 0, i.moneda), 0)),
  }));

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (i: Investment) => { setEditing(i); setDialogOpen(true); };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Cargando inversiones...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Inversiones</h1>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nueva inversión</Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardDescription>Invertido</CardDescription></CardHeader>
            <CardContent className="text-2xl font-bold">{prefCurrency} {formatNumber(totals.invertido)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>Valor actual</CardDescription></CardHeader>
            <CardContent className="text-2xl font-bold">{prefCurrency} {formatNumber(totals.valor)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>Rendimiento</CardDescription></CardHeader>
            <CardContent className={`text-2xl font-bold flex items-center gap-2 ${rendimiento >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {rendimiento >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {formatNumber(rendimiento)}
              <span className="text-sm font-normal">({rendimientoPct.toFixed(2)}%)</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>Cobrado este año</CardDescription></CardHeader>
            <CardContent className="text-2xl font-bold">{prefCurrency} {formatNumber(cobrosAnio)}</CardContent>
          </Card>
        </div>

        <Tabs defaultValue="portafolio">
          <TabsList>
            <TabsTrigger value="portafolio">Portafolio</TabsTrigger>
            <TabsTrigger value="cripto">Criptomonedas</TabsTrigger>
            <TabsTrigger value="tipos">Tipos</TabsTrigger>
          </TabsList>

          <TabsContent value="portafolio" className="space-y-6">
            {pieData.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Distribución por tipo</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-col lg:flex-row items-center gap-6">
                    <div className="h-64 w-full max-w-sm">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                            label={({ percent }) => `${(percent * 100).toFixed(1)}%`} labelLine={false} fontSize={12}>
                            {pieData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => [`${prefCurrency} ${formatNumber(v)}`, 'Valor actual']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full lg:flex-1 space-y-2">
                      {pieData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-sm truncate">{entry.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{prefCurrency} {formatNumber(entry.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {grupos.map((g) => (
              <Card key={g.nombre}>
                <CardHeader>
                  <CardTitle className="text-lg">{g.nombre}</CardTitle>
                  <CardDescription>{g.items.length} inversión{g.items.length !== 1 ? 'es' : ''}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {g.items.map((i) => {
                    const valor = i.valor_actual || i.monto_invertido || 0;
                    const delta = valor - (i.monto_invertido || 0);
                    const pct = i.monto_invertido ? (delta / i.monto_invertido) * 100 : 0;
                    const ultima = valuations.filter((v) => v.inversion_id === i.id).slice(-1)[0];
                    const tipo = types.find((t) => t.id === i.tipo_id);
                    const esPatrimonial = tipo?.comportamiento === 'activo_patrimonial';
                    const esManual = tipo?.comportamiento === 'valuacion_manual' || esPatrimonial;

                    // Interés fijo con cobro periódico: el capital no crece, lo que rinde son los intereses
                    const cobraIntereses =
                      tipo?.comportamiento === 'interes_fijo' && i.modalidad_pago !== 'Reinversión';
                    const tasaMensual = i.rendimiento_neto ?? (i.tasa_anual ? i.tasa_anual / 12 : null);
                    const interesMensual = tasaMensual ? (i.monto_invertido || 0) * (tasaMensual / 100) : 0;
                    const mesesTranscurridos = (() => {
                      if (!i.fecha_inicio) return 0;
                      const [y, m] = i.fecha_inicio.split('-').map(Number);
                      const hoy = new Date();
                      return Math.max(0, (hoy.getFullYear() - y) * 12 + (hoy.getMonth() + 1 - m));
                    })();
                    const devengado = interesMensual * mesesTranscurridos;
                    const cobrado = payouts
                      .filter((p) => p.inversion_id === i.id)
                      .reduce((s, p) => s + p.monto, 0);
                    return (
                      <div key={i.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold truncate">{i.nombre}</h3>
                            <Badge variant="outline" className="text-xs">{i.moneda}</Badge>
                            {i.modalidad_pago && <Badge variant="secondary" className="text-xs">{i.modalidad_pago}</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                            <div>Inicio: {fmtDate(i.fecha_inicio)}{i.fecha_vencimiento ? ` · Vence: ${fmtDate(i.fecha_vencimiento)}` : ''}</div>
                            {i.tasa_anual ? <div>Tasa anual: {i.tasa_anual}%</div> : null}
                            {cobraIntereses && tasaMensual ? (
                              <div>
                                Interés mensual ({tasaMensual}%): {i.moneda} {formatNumber(interesMensual)} · devengado estimado{' '}
                                {formatNumber(devengado)} en {mesesTranscurridos} meses
                              </div>
                            ) : null}
                            {ultima ? (
                              <div>Última valuación: {fmtDate(ultima.fecha)}</div>
                            ) : i.saldo_cuenta !== null && i.saldo_cuenta !== undefined ? (
                              <div>Valor según movimientos de la cuenta vinculada</div>
                            ) : null}
                            {i.beneficio_estimado ? <div>Beneficio estimado: {formatNumber(i.beneficio_estimado)}</div> : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 sm:justify-end">
                          <div className="text-left sm:text-right">
                            <div className="text-xs text-muted-foreground">Invertido: {formatNumber(i.monto_invertido || 0)}</div>
                            <div className="font-bold">{i.moneda} {formatNumber(valor)}</div>
                            {cobraIntereses ? (
                              <div className="text-xs font-medium text-emerald-600">
                                Cobrado: {formatNumber(cobrado)}
                                {devengado > 0 && (
                                  <span className="text-muted-foreground font-normal"> / {formatNumber(devengado)} devengado</span>
                                )}
                              </div>
                            ) : (
                              <div className={`text-xs font-medium ${delta >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                                {delta >= 0 ? '+' : '-'}{formatNumber(Math.abs(delta))} ({pct.toFixed(2)}%)
                              </div>
                            )}
                          </div>

                          <div className="flex gap-1">
                            {esManual ? (
                              <Button variant="outline" size="sm" onClick={() => setTracking(i)}>
                                <LineChart className="h-4 w-4 mr-1" /> Actualizar valor
                              </Button>
                            ) : (
                              <Button variant="ghost" size="icon" title="Seguimiento" onClick={() => setTracking(i)}>
                                <LineChart className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(i)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Eliminar" onClick={() => setToDelete(i)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}

            {activas.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>Aún no tienes inversiones registradas.</p>
                  <Button className="mt-4" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Agregar la primera</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="cripto">
            <Card>
              <CardHeader><CardTitle>Criptomonedas</CardTitle></CardHeader>
              <CardContent><CriptomonedasManager /></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tipos">
            <InvestmentTypesManager usageCount={usageCount} />
          </TabsContent>
        </Tabs>
      </div>

      <InvestmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        types={types}
        investment={editing}
        onSave={saveInvestment}
      />

      <InvestmentTrackingDialog
        open={!!tracking}
        onOpenChange={(v) => !v && setTracking(null)}
        investment={tracking}
        valuations={valuations}
        payouts={payouts}
        onAddValuation={addValuation}
        onDeleteValuation={deleteValuation}
        onAddPayout={addPayout}
        onDeletePayout={deletePayout}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar inversión?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{toDelete?.nombre}" junto con sus valuaciones y cobros registrados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => { if (toDelete) await deleteInvestment(toDelete.id); setToDelete(null); }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Inversiones;
