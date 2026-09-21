import { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { usePendings } from '@/hooks/usePendings';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useMobileCurrency } from '@/contexts/MobileCurrencyContext';
import { computePendingsSummary } from '@/lib/finance/pendingsSummary';
import { formatFechaCorta, parseFechaLocal } from '@/lib/finance/fechas';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cargando, Importe, Seccion } from '@/components/movil/ui';
import { cn } from '@/lib/utils';

const TIPO_LABEL: Record<string, string> = {
  reembolso_gasto: 'Reembolso',
  ingreso_esperado: 'Ingreso esperado',
};

const PorCobrarMovil = () => {
  const { pendings, loading } = usePendings();
  const { convertCurrency } = useExchangeRates();
  const { currency } = useMobileCurrency();

  // El total NO usa totalPendientePorCobrar (suma sin convertir): se convierte fila a fila.
  const resumen = useMemo(
    () => computePendingsSummary(pendings, convertCurrency, currency),
    [pendings, convertCurrency, currency],
  );

  if (loading) return <Cargando texto="Cargando pendientes..." />;

  return (
    <div className="space-y-6">
      <div className="pt-2">
        <p className="text-sm text-muted-foreground mb-1">Por cobrar</p>
        <Importe amount={resumen.total} currency={currency} principal />
        <p className="text-sm text-muted-foreground mt-1">
          {resumen.rows.length} pendiente{resumen.rows.length !== 1 ? 's' : ''}
          {resumen.vencidos > 0 && (
            <span className="text-destructive font-medium"> · {resumen.vencidos} vencido{resumen.vencidos !== 1 ? 's' : ''}</span>
          )}
        </p>
      </div>

      <Seccion titulo="Pendientes">
        {resumen.rows.length === 0 && <p className="text-base text-muted-foreground px-1">Nada por cobrar.</p>}
        {resumen.rows.map(({ pending: p, restante, vencido }) => (
          <Card key={p.id} className={cn(vencido && 'border-destructive')}>
            <CardContent className="p-4 flex items-center justify-between gap-3 min-h-[72px]">
              <div className="min-w-0">
                <p className={cn('text-base font-semibold truncate', vencido && 'text-destructive')}>{p.concepto}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-sm font-normal">{TIPO_LABEL[p.tipo] ?? p.tipo}</Badge>
                  {p.estado === 'cobrado_parcial' && <Badge variant="outline" className="text-sm font-normal">Parcial</Badge>}
                  <span className={cn('text-sm flex items-center gap-1', vencido ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                    {vencido && <AlertCircle className="h-4 w-4" />}
                    {p.fecha_esperada ? formatFechaCorta(parseFechaLocal(p.fecha_esperada)) : 'Sin fecha'}
                  </span>
                </div>
              </div>
              <Importe amount={restante} currency={p.divisa} className={cn('shrink-0', vencido && 'text-destructive')} />
            </CardContent>
          </Card>
        ))}
      </Seccion>
    </div>
  );
};

export default PorCobrarMovil;
