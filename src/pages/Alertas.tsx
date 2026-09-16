import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAlerts } from '@/hooks/useAlerts';
import { useAppConfig } from '@/hooks/useAppConfig';
import { Alert, AlertType, ALERT_RULES } from '@/lib/finance/alerts';
import { CalendarClock, CreditCard, TrendingUp, X, Undo2, BellOff, ArrowRight } from 'lucide-react';

const TYPE_META: Record<AlertType, { label: string; icon: React.ReactNode }> = {
  pago_anual: { label: 'Pago anual', icon: <CalendarClock className="h-5 w-5" /> },
  suscripcion_sube: { label: 'Suscripción', icon: <CreditCard className="h-5 w-5" /> },
  categoria_disparada: { label: 'Gasto inusual', icon: <TrendingUp className="h-5 w-5" /> },
};

const AlertRow = ({ alert, action, onAction, formatCurrency }: {
  alert: Alert;
  action: 'dismiss' | 'restore';
  onAction: (a: Alert) => void;
  formatCurrency: (n: number) => string;
}) => {
  const navigate = useNavigate();
  const meta = TYPE_META[alert.type];
  const isHigh = alert.severity === 'alta' && action === 'dismiss';
  return (
    <Card className={isHigh ? 'border-destructive/40' : ''}>
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${isHigh ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold truncate">{alert.title}</p>
            <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{alert.detail}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
            <span className="text-sm font-semibold tabular-nums">${formatCurrency(alert.amount)} {alert.currency}</span>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => navigate(alert.href)}>
              Ver <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground"
          title={action === 'dismiss' ? 'Descartar' : 'Restaurar'}
          onClick={() => onAction(alert)}
        >
          {action === 'dismiss' ? <X className="h-4 w-4" /> : <Undo2 className="h-4 w-4" />}
        </Button>
      </CardContent>
    </Card>
  );
};

const Alertas = () => {
  const { alerts, dismissedAlerts, loading, dismiss, restore } = useAlerts();
  const { formatCurrency } = useAppConfig();
  const [showDismissed, setShowDismissed] = useState(false);

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">Alertas</h1>
          <p className="text-muted-foreground">
            Pagos anuales a ≤{ALERT_RULES.annualDaysAhead} días, suscripciones que suben de precio y categorías un {Math.round((ALERT_RULES.categoryOverRatio - 1) * 100)}% por encima de su media
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
              <BellOff className="h-8 w-8 opacity-50" />
              <p>Sin alertas. Todo en orden.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {alerts.map(a => (
              <AlertRow key={a.key} alert={a} action="dismiss" onAction={dismiss} formatCurrency={formatCurrency} />
            ))}
          </div>
        )}

        {dismissedAlerts.length > 0 && (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowDismissed(v => !v)}>
              {showDismissed ? 'Ocultar' : 'Ver'} descartadas ({dismissedAlerts.length})
            </Button>
            {showDismissed && (
              <div className="space-y-3 opacity-70">
                {dismissedAlerts.map(a => (
                  <AlertRow key={a.key} alert={a} action="restore" onAction={restore} formatCurrency={formatCurrency} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Alertas;
