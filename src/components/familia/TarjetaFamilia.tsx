import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { HeartHandshake } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { fetchRevisionFamilia } from '@/hooks/useAlerts';
import { financeQueryKeys } from '@/lib/finance/queryKeys';
import { estadoRevision } from '@/lib/finance/familia';

/** Acceso a «Para mi familia» desde Configuración: la sección ya no está en el menú. */
export const TarjetaFamilia = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: financeQueryKeys(user?.id).revisionFamilia, queryFn: fetchRevisionFamilia, enabled: !!user, retry: false });
  const revisadoAt = data?.revisadoAt ?? null;
  const estado = estadoRevision(revisadoAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartHandshake className="h-5 w-5 text-destructive" />
          Para mi familia
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Carta, contactos, seguros, patrimonio, pagos y documentos para tu familia.
          </p>
          <p className="text-sm">
            Última revisión: {revisadoAt
              ? new Date(revisadoAt).toLocaleDateString('es-MX', { dateStyle: 'medium' })
              : 'nunca'}
            {estado === 'vencida' && <Badge variant="destructive" className="ml-2">Toca revisarla</Badge>}
          </p>
        </div>
        <Button onClick={() => navigate('/familia')}>Abrir</Button>
      </CardContent>
    </Card>
  );
};
