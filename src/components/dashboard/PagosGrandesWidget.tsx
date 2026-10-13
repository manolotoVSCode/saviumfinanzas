import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useProvisionesCxP } from '@/hooks/useProvisionesCxP';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { pagosGrandes, UMBRAL_PAGO_GRANDE_MXN } from '@/lib/finance/cxp';
import { CurrencyCode } from '@/lib/finance/dashboardMetrics';
import { diasHasta, formatFechaCorta, parseFechaLocal } from '@/lib/finance/fechas';
import { formatNumber } from '@/lib/formatters';

const cuando = (dias: number) =>
  dias < 0 ? `vencido hace ${-dias} d` : dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`;

/** Aviso arriba del Dashboard: provisiones de CxP desde 100K MXN, sin importar la fecha. */
export const PagosGrandesWidget = () => {
  const navigate = useNavigate();
  const { provisiones } = useProvisionesCxP();
  const { convertCurrency } = useExchangeRates();

  const grandes = useMemo(
    () => pagosGrandes(provisiones, (monto, divisa) => convertCurrency(monto, divisa as CurrencyCode, 'MXN')),
    [provisiones, convertCurrency]
  );

  if (grandes.length === 0) return null;

  return (
    <Card className="border-amber-500/60 bg-amber-500/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/15">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-semibold">Pagos grandes por realizar</p>
              <p className="text-xs text-muted-foreground">
                Provisiones de {formatNumber(UMBRAL_PAGO_GRANDE_MXN)} MXN o más, sea cual sea su fecha
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate('/cxp')}>
            Ver en CxP <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        <ul className="divide-y divide-border/60">
          {grandes.map((p) => {
            const dias = diasHasta(p.fecha);
            return (
              <li key={p.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.concepto}</p>
                  <p className={`text-xs ${dias < 0 ? 'text-destructive' : dias <= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                    {formatFechaCorta(parseFechaLocal(p.fecha))} · {cuando(dias)}
                  </p>
                </div>
                <p className="font-semibold tabular-nums whitespace-nowrap">
                  {formatNumber(p.monto)} {p.divisa}
                </p>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};
