import { CalendarClock, CreditCard, TrendingUp } from 'lucide-react';
import { useAlerts } from '@/hooks/useAlerts';
import { AlertType } from '@/lib/finance/alerts';
import { Card, CardContent } from '@/components/ui/card';
import { Importe, Seccion } from '@/components/movil/ui';
import { cn } from '@/lib/utils';

const ICONO: Record<AlertType, typeof CalendarClock> = {
  pago_anual: CalendarClock,
  suscripcion_sube: CreditCard,
  categoria_disparada: TrendingUp,
};

/**
 * Alertas activas (no descartadas) en el Resumen móvil. Solo lectura; si no hay,
 * no se pinta. Comparte la caché de useAlerts con el escritorio.
 */
export const AlertasResumen = () => {
  const { alerts, loading } = useAlerts();
  if (loading || alerts.length === 0) return null;

  return (
    <Seccion titulo={`Alertas (${alerts.length})`}>
      <Card className="border-destructive/40">
        <CardContent className="p-4">
          {alerts.map((a) => {
            const Icon = ICONO[a.type];
            return (
              <div key={a.key} className="flex items-start gap-3 min-h-12 py-3 border-t first:border-t-0 first:pt-0 last:pb-0">
                <div className={cn('p-2 rounded-lg shrink-0', a.severity === 'alta' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary')}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold truncate">{a.title}</p>
                  <p className="text-sm text-muted-foreground">{a.detail}</p>
                  <div className="mt-1">
                    <Importe amount={a.amount} currency={a.currency} />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </Seccion>
  );
};
