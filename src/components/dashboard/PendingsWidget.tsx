import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { usePendings } from '@/hooks/usePendings';
import { useAppConfig } from '@/hooks/useAppConfig';
import { formatNumber } from '@/lib/formatters';

export const PendingsWidget = () => {
  const navigate = useNavigate();
  const { activeCount, overdueCount, totalPendientePorCobrar, loading } = usePendings();
  const { config } = useAppConfig();

  if (loading || activeCount === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pendientes por cobrar</p>
            <p className="text-lg font-bold">
              {formatNumber(totalPendientePorCobrar)} {config.currency}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                · {activeCount} {activeCount === 1 ? 'registro' : 'registros'}
              </span>
            </p>
            {overdueCount > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                <AlertCircle className="h-3 w-3" /> {overdueCount} vencido{overdueCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate('/pendientes')}>
          Ver <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
};
