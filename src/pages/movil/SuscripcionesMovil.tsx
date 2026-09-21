import { useMemo } from 'react';
import { useSubscriptionServices } from '@/hooks/useSubscriptionServices';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useMobileCurrency } from '@/contexts/MobileCurrencyContext';
import { computeSubscriptionsSummary } from '@/lib/finance/subscriptionsSummary';
import { diasHasta, formatFechaCorta, parseFechaLocal } from '@/lib/finance/fechas';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cargando, Importe, Seccion } from '@/components/movil/ui';
import { cn } from '@/lib/utils';

const etiquetaVencimiento = (dias: number) => {
  if (dias < 0) return 'Vencida';
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  return `En ${dias} días`;
};

const SuscripcionesMovil = () => {
  const { subscriptions, loading } = useSubscriptionServices();
  const { config } = useAppConfig();
  const { convertCurrency } = useExchangeRates();
  const { currency } = useMobileCurrency();

  // La tabla no guarda divisa: todo importe es config.currency (igual que CxP)
  const divisaTabla = config.currency;

  const resumen = useMemo(() => computeSubscriptionsSummary(subscriptions), [subscriptions]);
  const estimadoElegida =
    divisaTabla === currency ? resumen.estimadoMensual : convertCurrency(resumen.estimadoMensual, divisaTabla, currency);

  const ordenadas = useMemo(
    () => [...subscriptions].sort((a, b) => a.proximo_pago.localeCompare(b.proximo_pago)),
    [subscriptions],
  );

  if (loading) return <Cargando texto="Cargando suscripciones..." />;

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="pt-2">
        <p className="text-sm text-muted-foreground mb-1">Estimado mensual (prorrateado)</p>
        <Importe amount={estimadoElegida} currency={currency} principal />
        <p className="text-sm text-muted-foreground mt-1">
          {resumen.estimadas} con frecuencia conocida
          {resumen.sinEstimar > 0 && ` · ${resumen.sinEstimar} irregular${resumen.sinEstimar !== 1 ? 'es' : ''} sin estimar`}
        </p>
      </div>

      <Seccion titulo={`Activas (${ordenadas.length})`}>
        {ordenadas.length === 0 && <p className="text-base text-muted-foreground px-1">Sin suscripciones activas.</p>}
        {ordenadas.map((s) => {
          const dias = diasHasta(s.proximo_pago, now);
          const pronto = dias <= 7;
          return (
            <Card key={s.id} className={cn(pronto && 'border-destructive')}>
              <CardContent className="p-4 flex items-center justify-between gap-3 min-h-[72px]">
                <div className="min-w-0">
                  <p className="text-base font-semibold truncate">{s.service_name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-sm font-normal">{s.frecuencia}</Badge>
                    <span className={cn('text-sm', pronto ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                      {formatFechaCorta(parseFechaLocal(s.proximo_pago))}
                      {pronto && ` · ${etiquetaVencimiento(dias)}`}
                    </span>
                  </div>
                </div>
                <Importe amount={Number(s.ultimo_pago_monto) || 0} currency={divisaTabla} className="shrink-0" />
              </CardContent>
            </Card>
          );
        })}
      </Seccion>
    </div>
  );
};

export default SuscripcionesMovil;
