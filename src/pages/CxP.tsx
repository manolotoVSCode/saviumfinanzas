import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CreditCard, Repeat, CalendarClock, Landmark, TrendingDown, Wallet } from 'lucide-react';
import { SampleDataBanner } from '@/components/SampleDataBanner';

type CxPRow = {
  id: string;
  concepto: string;
  tipo: 'Suscripción' | 'Pago anual' | 'Recurrente mensual' | 'Tarjeta de crédito' | 'Préstamo';
  monto: number;
  divisa: 'MXN' | 'USD' | 'EUR';
  fechaEstimada: Date;
  detalle?: string;
};

const HORIZONTES = [30, 60, 90] as const;

const formatDate = (d: Date) =>
  d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

const CxP = () => {
  const financeData = useFinanceDataSupabase();
  const { formatCurrency, config } = useAppConfig();
  const { convertCurrency } = useExchangeRates();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('subscription_services').select('*').eq('active', true);
      setSubscriptions(data || []);
    })();
  }, []);

  const [horizonte, setHorizonte] = useState<number>(30);

  const baseCurrency = (config.currency as 'MXN' | 'USD' | 'EUR') || 'MXN';

  // 1) Suscripciones activas próximas al horizonte
  const cxpSuscripciones = useMemo<CxPRow[]>(() => {
    const now = new Date();
    const limite = new Date();
    limite.setDate(now.getDate() + horizonte);
    return (subscriptions || [])
      .filter((s: any) => s.active)
      .filter((s: any) => {
        const px = new Date(s.proximo_pago);
        return px >= now && px <= limite;
      })
      .map((s: any) => ({
        id: `sub-${s.id}`,
        concepto: s.service_name,
        tipo: 'Suscripción' as const,
        monto: Number(s.ultimo_pago_monto) || 0,
        divisa: 'MXN' as const, // subscription_services no guarda divisa → asumimos base
        fechaEstimada: new Date(s.proximo_pago),
        detalle: s.frecuencia,
      }));
  }, [subscriptions, horizonte]);

  // 2) Pagos anuales próximos (categorías anuales, next payment = last + 1 año)
  const cxpAnuales = useMemo<CxPRow[]>(() => {
    const now = new Date();
    const limite = new Date();
    limite.setDate(now.getDate() + horizonte);
    const rows: CxPRow[] = [];

    const anualCats = financeData.categories.filter((c: any) => {
      const s = `${c.categoria} ${c.subcategoria}`.toLowerCase();
      const esPrestamo = s.includes('préstamo') || s.includes('prestamo') || s.includes('hipoteca');
      return c.frecuencia_seguimiento === 'anual' && c.tipo === 'Gastos' && !esPrestamo;
    });


    anualCats.forEach((cat) => {
      const txs = financeData.transactions
        .filter((t) => t.subcategoriaId === cat.id && t.gasto > 0)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      if (!txs.length) return;
      const last = txs[0];
      const nextDate = new Date(last.fecha);
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      if (nextDate >= now && nextDate <= limite) {
        rows.push({
          id: `anual-${cat.id}`,
          concepto: `${cat.categoria} · ${cat.subcategoria}`,
          tipo: 'Pago anual',
          monto: Number(last.gasto),
          divisa: (last.divisa as any) || baseCurrency,
          fechaEstimada: nextDate,
          detalle: 'Estimado según último pago',
        });
      }
    });
    return rows;
  }, [financeData.categories, financeData.transactions, horizonte, baseCurrency]);

  // 3) Recurrentes mensuales (frecuencia_seguimiento = 'mensual', tipo Gasto)
  const cxpRecurrentes = useMemo<CxPRow[]>(() => {
    const rows: CxPRow[] = [];
    const mensualCats = financeData.categories.filter(
      (c: any) => c.frecuencia_seguimiento === 'mensual' && c.tipo === 'Gastos'
    );

    // Excluir subcategorías ya cubiertas como "Suscripciones" para no duplicar
    const subLabels = new Set((subscriptions || []).map((s: any) => (s.service_name || '').toLowerCase()));

    mensualCats.forEach((cat) => {
      // Excluir subcategoría "Suscripciones" completa (ya está en bloque 1)
      if ((cat.subcategoria || '').toLowerCase().includes('suscripc')) return;

      const txs = financeData.transactions
        .filter((t) => t.subcategoriaId === cat.id && t.gasto > 0)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      if (!txs.length) return;
      const last = txs[0];
      // Estimado: mismo día del próximo mes
      const nextDate = new Date(last.fecha);
      nextDate.setMonth(nextDate.getMonth() + 1);
      const now = new Date();
      const limite = new Date();
      limite.setDate(now.getDate() + horizonte);
      if (nextDate < now || nextDate > limite) return;
      if (subLabels.has((last.comentario || '').toLowerCase())) return;

      rows.push({
        id: `rec-${cat.id}`,
        concepto: `${cat.categoria} · ${cat.subcategoria}`,
        tipo: 'Recurrente mensual',
        monto: Number(last.gasto),
        divisa: (last.divisa as any) || baseCurrency,
        fechaEstimada: nextDate,
        detalle: last.comentario?.slice(0, 40),
      });
    });
    return rows;
  }, [financeData.categories, financeData.transactions, subscriptions, horizonte, baseCurrency]);

  // 4) Tarjetas de crédito con saldo negativo
  const cxpTarjetas = useMemo<CxPRow[]>(() => {
    return financeData.accounts
      .filter((a) => a.tipo === 'Tarjeta de Crédito' && !a.vendida && a.saldoActual < 0)
      .map((a) => {
        // Fecha estimada: 15 días adelante como aproximación
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 15);
        return {
          id: `card-${a.id}`,
          concepto: a.nombre,
          tipo: 'Tarjeta de crédito' as const,
          monto: Math.abs(a.saldoActual),
          divisa: (a.divisa as any) || baseCurrency,
          fechaEstimada: nextDate,
          detalle: 'Saldo pendiente actual',
        };
      });
  }, [financeData.accounts, baseCurrency]);

  // 5) Préstamos (subcategoría contiene "Préstamo" o "Credito Personal")
  const cxpPrestamos = useMemo<CxPRow[]>(() => {
    const rows: CxPRow[] = [];
    const now = new Date();
    const limite = new Date();
    limite.setDate(now.getDate() + horizonte);

    const prestamoCats = financeData.categories.filter((c) => {
      const s = `${c.categoria} ${c.subcategoria}`.toLowerCase();
      return c.tipo === 'Gastos' && (s.includes('préstamo') || s.includes('prestamo') || s.includes('hipoteca'));
    });

    prestamoCats.forEach((cat) => {
      const txs = financeData.transactions
        .filter((t) => t.subcategoriaId === cat.id && t.gasto > 0)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      if (!txs.length) return;
      const last = txs[0];
      const nextDate = new Date(last.fecha);
      nextDate.setMonth(nextDate.getMonth() + 1);
      if (nextDate < now || nextDate > limite) return;
      rows.push({
        id: `loan-${cat.id}`,
        concepto: `${cat.categoria} · ${cat.subcategoria}`,
        tipo: 'Préstamo',
        monto: Number(last.gasto),
        divisa: (last.divisa as any) || baseCurrency,
        fechaEstimada: nextDate,
        detalle: 'Cuota estimada',
      });
    });
    return rows;
  }, [financeData.categories, financeData.transactions, horizonte, baseCurrency]);

  const allRows = useMemo(
    () =>
      [...cxpSuscripciones, ...cxpAnuales, ...cxpRecurrentes, ...cxpTarjetas, ...cxpPrestamos].sort(
        (a, b) => a.fechaEstimada.getTime() - b.fechaEstimada.getTime()
      ),
    [cxpSuscripciones, cxpAnuales, cxpRecurrentes, cxpTarjetas, cxpPrestamos]
  );

  const totalEnBase = useMemo(
    () => allRows.reduce((sum, r) => sum + convertCurrency(r.monto, r.divisa, baseCurrency), 0),
    [allRows, convertCurrency, baseCurrency]
  );

  // Liquidez: efectivo + banco + ahorros (todas divisas convertidas a base)
  const liquidez = useMemo(() => {
    return financeData.accounts
      .filter((a) => ['Efectivo', 'Banco', 'Ahorros'].includes(a.tipo) && !a.vendida)
      .reduce((s, a) => s + convertCurrency(a.saldoActual, a.divisa, baseCurrency), 0);
  }, [financeData.accounts, convertCurrency, baseCurrency]);

  const colchon = liquidez - totalEnBase;

  const totalPorTipo = (tipo: CxPRow['tipo']) =>
    allRows
      .filter((r) => r.tipo === tipo)
      .reduce((s, r) => s + convertCurrency(r.monto, r.divisa, baseCurrency), 0);

  if (financeData.loading) {
    return (
      <Layout>
        <div className="animate-fade-in flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando datos financieros...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const bloques: { key: string; label: string; icon: any; rows: CxPRow[] }[] = [
    { key: 'susc', label: 'Suscripciones', icon: CreditCard, rows: cxpSuscripciones },
    { key: 'anual', label: 'Pagos Anuales', icon: CalendarClock, rows: cxpAnuales },
    { key: 'recur', label: 'Recurrentes', icon: Repeat, rows: cxpRecurrentes },
    { key: 'card', label: 'Tarjetas', icon: CreditCard, rows: cxpTarjetas },
    { key: 'loan', label: 'Préstamos', icon: Landmark, rows: cxpPrestamos },
  ];

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <SampleDataBanner />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">CxP · Cuentas por Pagar</h1>
            <p className="text-muted-foreground text-sm">
              Provisiones estimadas de dinero comprometido. Considéralo antes de gastar.
            </p>
          </div>
          <Select value={String(horizonte)} onValueChange={(v) => setHorizonte(parseInt(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HORIZONTES.map((h) => (
                <SelectItem key={h} value={String(h)}>
                  Próximos {h} días
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4" /> Total CxP {horizonte}d
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">${formatCurrency(totalEnBase)}</p>
              <p className="text-xs text-muted-foreground">{baseCurrency} · {allRows.length} conceptos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Liquidez disponible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${formatCurrency(liquidez)}</p>
              <p className="text-xs text-muted-foreground">Efectivo + Banco + Ahorros</p>
            </CardContent>
          </Card>
          <Card className={colchon < 0 ? 'border-destructive' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Colchón tras CxP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${colchon < 0 ? 'text-destructive' : 'text-primary'}`}>
                ${formatCurrency(colchon)}
              </p>
              <p className="text-xs text-muted-foreground">
                {colchon < 0 ? '⚠️ Insuficiente para cubrir provisiones' : 'Disponible tras cubrir provisiones'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Desglose por tipo */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {bloques.map((b) => (
            <Card key={b.key}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <b.icon className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{b.label}</p>
                </div>
                <p className="text-lg font-semibold">${formatCurrency(totalPorTipo(b.rows[0]?.tipo || 'Suscripción'))}</p>
                <p className="text-[10px] text-muted-foreground">{b.rows.length} conceptos</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabla unificada + tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalle de provisiones</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4 flex-wrap h-auto">
                <TabsTrigger value="all">Todo ({allRows.length})</TabsTrigger>
                {bloques.map((b) => (
                  <TabsTrigger key={b.key} value={b.key}>
                    {b.label} ({b.rows.length})
                  </TabsTrigger>
                ))}
              </TabsList>

              {[{ key: 'all', rows: allRows }, ...bloques.map((b) => ({ key: b.key, rows: b.rows }))].map(
                (t) => (
                  <TabsContent key={t.key} value={t.key}>
                    {t.rows.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Sin provisiones en este horizonte
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Concepto</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Fecha estimada</TableHead>
                              <TableHead className="text-right">Monto</TableHead>
                              <TableHead>Divisa</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {t.rows.map((r) => {
                              const dias = Math.ceil(
                                (r.fechaEstimada.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                              );
                              return (
                                <TableRow key={r.id}>
                                  <TableCell>
                                    <div className="font-medium">{r.concepto}</div>
                                    {r.detalle && (
                                      <div className="text-xs text-muted-foreground">{r.detalle}</div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{r.tipo}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div>{formatDate(r.fechaEstimada)}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {dias <= 7 ? `⚠️ en ${dias}d` : `en ${dias} días`}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    ${formatCurrency(r.monto)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="text-xs">
                                      {r.divisa}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>
                )
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CxP;
