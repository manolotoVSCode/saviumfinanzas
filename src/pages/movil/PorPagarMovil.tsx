import { useMemo, useState } from 'react';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useSubscriptionServices } from '@/hooks/useSubscriptionServices';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useMobileCurrency } from '@/contexts/MobileCurrencyContext';
import { computeCxP } from '@/lib/finance/cxp';
import { formatFechaCorta } from '@/lib/finance/fechas';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cargando, Importe, Seccion } from '@/components/movil/ui';
import { cn } from '@/lib/utils';

const HORIZONTES = [30, 60, 90] as const;
type Horizonte = (typeof HORIZONTES)[number];

const PorPagarMovil = () => {
  const { accounts, categories, transactions, loading } = useFinanceDataSupabase();
  const { subscriptions, loading: loadingSubs } = useSubscriptionServices();
  const { config } = useAppConfig();
  const { convertCurrency } = useExchangeRates();
  const { currency } = useMobileCurrency();
  const [horizonte, setHorizonte] = useState<Horizonte>(30);

  // baseCurrency SIEMPRE es la del perfil (fallback de filas sin divisa y clave de
  // agrupación de recurrentes); la divisa elegida solo afecta al total.
  const rows = useMemo(
    () => computeCxP({ transactions, categories, accounts, subscriptions, horizonte, baseCurrency: config.currency }),
    [transactions, categories, accounts, subscriptions, horizonte, config.currency],
  );

  const total = useMemo(
    () => rows.reduce((sum, r) => sum + convertCurrency(r.monto, r.divisa, currency), 0),
    [rows, convertCurrency, currency],
  );

  if (loading || loadingSubs) return <Cargando texto="Cargando cuentas por pagar..." />;

  const hoy = Date.now();

  return (
    <div className="space-y-6">
      <div className="pt-2">
        <p className="text-sm text-muted-foreground mb-1">Por pagar en {horizonte} días</p>
        <Importe amount={total} currency={currency} principal className="text-destructive" />
        <p className="text-sm text-muted-foreground mt-1">{rows.length} concepto{rows.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex gap-2" role="group" aria-label="Horizonte">
        {HORIZONTES.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHorizonte(h)}
            aria-pressed={horizonte === h}
            className={cn(
              'flex-1 h-12 rounded-full text-base font-semibold transition-colors',
              horizonte === h ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {h} días
          </button>
        ))}
      </div>

      <Seccion titulo="Provisiones">
        {rows.length === 0 && <p className="text-base text-muted-foreground px-1">Sin provisiones en este horizonte.</p>}
        {rows.map((r) => {
          const dias = Math.ceil((r.fechaEstimada.getTime() - hoy) / (1000 * 60 * 60 * 24));
          const pronto = dias <= 7;
          return (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3 min-h-[72px]">
                <div className="min-w-0">
                  <p className="text-base font-semibold truncate">{r.concepto}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-sm font-normal">{r.tipo}</Badge>
                    <span className={cn('text-sm', pronto ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                      {formatFechaCorta(r.fechaEstimada)} · en {dias} d
                    </span>
                  </div>
                </div>
                <Importe amount={r.monto} currency={r.divisa} className="shrink-0" />
              </CardContent>
            </Card>
          );
        })}
      </Seccion>
    </div>
  );
};

export default PorPagarMovil;
