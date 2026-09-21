import { useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useSubscriptionServices } from '@/hooks/useSubscriptionServices';
import { computeCxP, CxPRow } from '@/lib/finance/cxp';
import { CurrencyCode } from '@/lib/finance/dashboardMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CreditCard, Repeat, CalendarClock, Landmark, TrendingDown, Wallet } from 'lucide-react';

const HORIZONTES = [30, 60, 90] as const;

const formatDate = (d: Date) =>
  d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

const CxP = () => {
  const financeData = useFinanceDataSupabase();
  const { formatCurrency, config } = useAppConfig();
  const { convertCurrency } = useExchangeRates();
  const { subscriptions } = useSubscriptionServices();

  const [horizonte, setHorizonte] = useState<number>(30);

  const baseCurrency = (config.currency as CurrencyCode) || 'MXN';

  const allRows = useMemo<CxPRow[]>(
    () =>
      computeCxP({
        transactions: financeData.transactions,
        categories: financeData.categories,
        accounts: financeData.accounts,
        subscriptions,
        horizonte,
        baseCurrency,
      }),
    [financeData.transactions, financeData.categories, financeData.accounts, subscriptions, horizonte, baseCurrency]
  );

  const totalEnBase = useMemo(
    () => allRows.reduce((sum, r) => sum + convertCurrency(r.monto, r.divisa, baseCurrency), 0),
    [allRows, convertCurrency, baseCurrency]
  );

  // Liquidez: saldo actual real de cuentas líquidas (Efectivo + Banco + Ahorros)
  // Desglose por tipo para mostrar de dónde viene el total
  const liquidezBreakdown = useMemo(() => {
    const acc: Record<string, number> = { Efectivo: 0, Banco: 0, Ahorros: 0 };
    financeData.accounts
      .filter((a) => ['Efectivo', 'Banco', 'Ahorros'].includes(a.tipo) && !a.vendida)
      .forEach((a) => {
        acc[a.tipo] += convertCurrency(a.saldoActual, a.divisa, baseCurrency);
      });
    return acc;
  }, [financeData.accounts, convertCurrency, baseCurrency]);

  const liquidez = liquidezBreakdown.Efectivo + liquidezBreakdown.Banco + liquidezBreakdown.Ahorros;

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

  const bloques: { key: string; label: string; icon: any; rows: CxPRow[]; tipo: CxPRow['tipo'] }[] = [
    { key: 'susc', label: 'Suscripciones', icon: CreditCard, rows: allRows.filter((r) => r.tipo === 'Suscripción'), tipo: 'Suscripción' },
    { key: 'anual', label: 'Pagos Anuales', icon: CalendarClock, rows: allRows.filter((r) => r.tipo === 'Pago anual'), tipo: 'Pago anual' },
    { key: 'recur', label: 'Recurrentes', icon: Repeat, rows: allRows.filter((r) => r.tipo === 'Recurrente mensual'), tipo: 'Recurrente mensual' },
    { key: 'card', label: 'Tarjetas', icon: CreditCard, rows: allRows.filter((r) => r.tipo === 'Tarjeta de crédito'), tipo: 'Tarjeta de crédito' },
    { key: 'loan', label: 'Préstamos', icon: Landmark, rows: allRows.filter((r) => r.tipo === 'Préstamo'), tipo: 'Préstamo' },
  ];


  return (
    <Layout>
      <div className="animate-fade-in space-y-6">

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
              <p className="text-xs text-muted-foreground">
                Saldo actual de cuentas líquidas
              </p>
              <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                <div className="flex justify-between"><span>Efectivo</span><span>${formatCurrency(liquidezBreakdown.Efectivo)}</span></div>
                <div className="flex justify-between"><span>Banco</span><span>${formatCurrency(liquidezBreakdown.Banco)}</span></div>
                <div className="flex justify-between"><span>Ahorros</span><span>${formatCurrency(liquidezBreakdown.Ahorros)}</span></div>
              </div>

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
                <p className="text-lg font-semibold">${formatCurrency(totalPorTipo(b.tipo))}</p>
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
