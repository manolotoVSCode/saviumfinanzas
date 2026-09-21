import { useMemo } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useInvestments } from '@/hooks/useInvestments';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useMobileCurrency } from '@/contexts/MobileCurrencyContext';
import { investmentReturn } from '@/lib/finance/investmentReturn';
import { CurrencyCode } from '@/lib/finance/dashboardMetrics';
import { formatNumber } from '@/lib/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cargando, Importe, Seccion } from '@/components/movil/ui';
import { cn } from '@/lib/utils';

const InversionesMovil = () => {
  const { investments, valuations, loading } = useInvestments();
  const { convertCurrency } = useExchangeRates();
  const { currency } = useMobileCurrency();

  const activas = useMemo(() => investments.filter((i) => i.activa !== false), [investments]);

  // Misma regla que el escritorio (toPref), pero hacia la divisa elegida en móvil
  const totals = useMemo(() => {
    const toElegida = (amount: number, divisa: string) =>
      divisa === currency ? amount : convertCurrency(amount, divisa as CurrencyCode, currency);
    return activas.reduce(
      (acc, i) => {
        acc.invertido += toElegida(i.monto_invertido || 0, i.moneda);
        acc.valor += toElegida(i.valor_actual || i.monto_invertido || 0, i.moneda);
        return acc;
      },
      { invertido: 0, valor: 0 },
    );
  }, [activas, currency, convertCurrency]);
  const rendimiento = totals.valor - totals.invertido;
  const rendimientoPct = totals.invertido ? (rendimiento / totals.invertido) * 100 : 0;

  if (loading) return <Cargando texto="Cargando inversiones..." />;

  return (
    <div className="space-y-6">
      <div className="pt-2">
        <p className="text-sm text-muted-foreground mb-1">Valor actual</p>
        <Importe amount={totals.valor} currency={currency} principal />
        <p className="text-sm text-muted-foreground mt-1">sin cripto</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3 min-h-12">
            <span className="text-base text-muted-foreground">Invertido</span>
            <Importe amount={totals.invertido} currency={currency} />
          </div>
          <div className="flex items-center justify-between gap-3 min-h-12 border-t">
            <span className="text-base text-muted-foreground">Rendimiento</span>
            <span className={cn('text-base font-semibold tabular-nums', rendimiento >= 0 ? 'text-emerald-600' : 'text-destructive')}>
              {rendimiento >= 0 ? '+' : '-'}{formatNumber(Math.abs(rendimiento))} {currency} ({rendimientoPct.toFixed(2)}%)
            </span>
          </div>
        </CardContent>
      </Card>

      <Seccion titulo={`Inversiones activas (${activas.length})`}>
        {activas.length === 0 && <p className="text-base text-muted-foreground px-1">Sin inversiones activas.</p>}
        {activas.map((i) => {
          const { valor, delta, pct } = investmentReturn(i, valuations);
          const positivo = delta >= 0;
          return (
            <Card key={i.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3 min-h-[72px]">
                <div className="min-w-0">
                  <p className="text-base font-semibold truncate">{i.nombre}</p>
                  <Badge variant="outline" className="text-sm font-normal mt-1">{i.tipo}</Badge>
                </div>
                <div className="text-right shrink-0">
                  <Importe amount={valor} currency={i.moneda} />
                  <p className={cn('text-sm font-medium flex items-center justify-end gap-1', positivo ? 'text-emerald-600' : 'text-destructive')}>
                    {positivo ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {positivo ? '+' : '-'}{formatNumber(Math.abs(delta))} ({pct.toFixed(2)}%)
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </Seccion>
    </div>
  );
};

export default InversionesMovil;
