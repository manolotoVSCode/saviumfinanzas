import { useMemo } from 'react';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useMobileCurrency } from '@/contexts/MobileCurrencyContext';
import { computeDashboardMetrics } from '@/lib/finance/dashboardMetrics';
import { Card, CardContent } from '@/components/ui/card';
import { Cargando, Importe, Seccion } from '@/components/movil/ui';
import { Account, AccountType } from '@/types/finance';
import { cn } from '@/lib/utils';

const ORDEN_TIPOS: AccountType[] = [
  'Efectivo', 'Banco', 'Ahorros', 'Tarjeta de Crédito', 'Inversiones', 'Empresa Propia', 'Bien Raíz', 'Hipoteca',
];

const nombreMesAnterior = (now: Date) => {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const s = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const Linea = ({ etiqueta, amount, currency, destacado = false, negativo = false }: {
  etiqueta: string; amount: number; currency: string; destacado?: boolean; negativo?: boolean;
}) => (
  <div className="flex items-center justify-between gap-3 min-h-12">
    <span className={cn('text-base', destacado ? 'font-semibold' : 'text-muted-foreground')}>{etiqueta}</span>
    <Importe amount={amount} currency={currency} className={cn(negativo && 'text-destructive')} />
  </div>
);

const ResumenMovil = () => {
  const { accounts, transactions, loading } = useFinanceDataSupabase();
  const { convertCurrency } = useExchangeRates();
  const { currency } = useMobileCurrency();

  // Se llama directamente porque el dashboardMetrics del hook está fijo a config.currency.
  const metrics = useMemo(
    () => computeDashboardMetrics(accounts, transactions, convertCurrency, currency),
    [accounts, transactions, convertCurrency, currency],
  );

  const cuentasPorTipo = useMemo(() => {
    // Se ocultan las vendidas y las de saldo cero o residual (< 0.005)
    const visibles = accounts.filter((a) => !a.vendida && Math.abs(a.saldoActual) >= 0.005);
    return ORDEN_TIPOS
      .map((tipo) => ({ tipo, cuentas: visibles.filter((a) => a.tipo === tipo) as Account[] }))
      .filter((g) => g.cuentas.length > 0);
  }, [accounts]);

  if (loading) return <Cargando texto="Cargando resumen..." />;

  const { activos, pasivos } = metrics;

  return (
    <div className="space-y-6">
      {/* 1. Patrimonio neto */}
      <div className="pt-2">
        <p className="text-sm text-muted-foreground mb-1">Patrimonio neto</p>
        <Importe amount={metrics.patrimonioNeto} currency={currency} principal className={cn(metrics.patrimonioNeto < 0 && 'text-destructive')} />
      </div>

      {/* 2. Activos y pasivos */}
      <div className="space-y-3">
        <Card>
          <CardContent className="p-4">
            <Linea etiqueta="Activos" amount={activos.total} currency={currency} destacado />
            <div className="border-t pt-1">
              <Linea etiqueta="Efectivo y bancos" amount={activos.efectivoBancos} currency={currency} />
              <Linea etiqueta="Inversiones" amount={activos.inversiones} currency={currency} />
              <Linea etiqueta="Empresas" amount={activos.empresasPrivadas} currency={currency} />
              <Linea etiqueta="Bien raíz" amount={activos.bienRaiz} currency={currency} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Linea etiqueta="Pasivos" amount={pasivos.total} currency={currency} destacado negativo={pasivos.total > 0} />
            <div className="border-t pt-1">
              <Linea etiqueta="Tarjetas de crédito" amount={pasivos.tarjetasCredito} currency={currency} />
              <Linea etiqueta="Hipoteca" amount={pasivos.hipoteca} currency={currency} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Mes anterior */}
      <Seccion titulo={`Mes anterior (${nombreMesAnterior(new Date())})`}>
        <Card>
          <CardContent className="p-4">
            <Linea etiqueta="Ingresos" amount={metrics.ingresosMesAnterior} currency={currency} />
            <Linea etiqueta="Gastos" amount={metrics.gastosMesAnterior} currency={currency} />
            <Linea etiqueta="Balance" amount={metrics.balanceMesAnterior} currency={currency} destacado negativo={metrics.balanceMesAnterior < 0} />
          </CardContent>
        </Card>
      </Seccion>

      {/* 4. Cuentas por tipo, saldo en su divisa */}
      <Seccion titulo="Cuentas">
        {cuentasPorTipo.map((g) => (
          <Card key={g.tipo}>
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-muted-foreground mb-1">{g.tipo}</p>
              {g.cuentas.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 min-h-12 border-t first:border-t-0">
                  <span className="text-base truncate">{a.nombre}</span>
                  <Importe amount={a.saldoActual} currency={a.divisa} className={cn(a.saldoActual < 0 && 'text-destructive')} />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        {cuentasPorTipo.length === 0 && (
          <p className="text-base text-muted-foreground px-1">Sin cuentas con saldo.</p>
        )}
      </Seccion>
    </div>
  );
};

export default ResumenMovil;
