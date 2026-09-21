import { useMemo } from 'react';
import { useSubscriptionServices } from '@/hooks/useSubscriptionServices';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useMobileCurrency } from '@/contexts/MobileCurrencyContext';
import { computeSubscriptionsSummary, estadoSuscripcion } from '@/lib/finance/subscriptionsSummary';
import { formatFechaCorta, parseFechaLocal } from '@/lib/finance/fechas';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cargando, Importe, Seccion } from '@/components/movil/ui';
import { cn } from '@/lib/utils';

/**
 * Texto y color según el estado. El mes en curso no está importado, así que una
 * fecha pasada solo es un aviso si cae en un mes ya cerrado ("sin cargo").
 */
const presentarFecha = (proximoPago: string, now: Date) => {
  const { estado, dias } = estadoSuscripcion(proximoPago, now);
  const fecha = formatFechaCorta(parseFechaLocal(proximoPago));
  if (estado === 'sin_cargo') return { texto: `Sin cargo desde el ${fecha}`, aviso: 'sin_cargo' as const };
  if (estado === 'este_mes') return { texto: `Este mes · ${fecha}`, aviso: null };
  if (dias <= 7) return { texto: `${fecha} · en ${dias} día${dias !== 1 ? 's' : ''}`, aviso: 'pronto' as const };
  return { texto: fecha, aviso: null };
};

const SuscripcionesMovil = () => {
  const { subscriptions, loading } = useSubscriptionServices();
  const { convertCurrency } = useExchangeRates();
  const { currency, profileCurrency } = useMobileCurrency();

  // La tabla no guarda divisa: todo importe es config.currency (igual que CxP)
  const divisaTabla = profileCurrency;

  // El hook devuelve también las inactivas; aquí solo cuentan las activas.
  const activas = useMemo(() => subscriptions.filter((s) => s.active), [subscriptions]);
  const resumen = useMemo(() => computeSubscriptionsSummary(activas), [activas]);
  const estimadoElegida =
    divisaTabla === currency ? resumen.estimadoMensual : convertCurrency(resumen.estimadoMensual, divisaTabla, currency);

  const ordenadas = useMemo(
    () => [...activas].sort((a, b) => a.proximo_pago.localeCompare(b.proximo_pago)),
    [activas],
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
          const { texto, aviso } = presentarFecha(s.proximo_pago, now);
          return (
            <Card key={s.id} className={cn(aviso === 'sin_cargo' && 'border-amber-500', aviso === 'pronto' && 'border-destructive')}>
              <CardContent className="p-4 flex items-center justify-between gap-3 min-h-[72px]">
                <div className="min-w-0">
                  <p className="text-base font-semibold truncate">{s.service_name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-sm font-normal">{s.frecuencia}</Badge>
                    <span className={cn('text-sm', aviso === 'sin_cargo' && 'text-amber-600 font-medium', aviso === 'pronto' && 'text-destructive font-medium', !aviso && 'text-muted-foreground')}>
                      {texto}
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
