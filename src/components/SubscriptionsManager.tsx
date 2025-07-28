import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Calendar, TrendingUp, Clock, HelpCircle } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';

interface GroupedService {
  serviceName: string;
  description: string;
  ultimoPago: {
    monto: number;
    fecha: Date;
  };
  proximoPago?: Date;
  frecuencia: number;
  montoPromedio: number;
  originalComments: string[];
}

interface AIAnalysisResult {
  groups: {
    serviceName: string;
    description: string;
    originalComments: string[];
  }[];
}

export const SubscriptionsManager = () => {
  const { formatCurrency } = useAppConfig();
  const financeData = useFinanceDataSupabase();
  const { categories, transactions } = financeData;
  const [groupedServices, setGroupedServices] = useState<GroupedService[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [needsAnalysis, setNeedsAnalysis] = useState(false);

  // Obtener transacciones de los últimos 12 meses
  const subscriptionTransactions = useMemo(() => {
    if (!transactions || !categories || transactions.length === 0 || categories.length === 0) {
      return [];
    }

    const subscriptionCategory = categories.find(c => 
      c.subcategoria.toLowerCase().includes('cuotas') || 
      c.subcategoria.toLowerCase().includes('suscripciones') ||
      c.subcategoria.toLowerCase() === 'cuotas / suscripciones'
    );

    if (!subscriptionCategory) {
      return [];
    }

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    return transactions.filter(t => 
      t.subcategoriaId === subscriptionCategory.id && 
      t.gasto > 0 &&
      new Date(t.fecha) >= twelveMonthsAgo
    );
  }, [transactions, categories]);

  // Analizar servicios con IA
  const analyzeServices = async () => {
    if (subscriptionTransactions.length === 0) {
      console.log('No subscription transactions found');
      return;
    }

    setIsAnalyzing(true);
    try {
      const uniqueComments = [...new Set(subscriptionTransactions.map(t => t.comentario))];
      console.log('Unique comments to analyze:', uniqueComments);
      
      const { data, error } = await supabase.functions.invoke('analyze-subscriptions', {
        body: { comments: uniqueComments }
      });

      console.log('Supabase function response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      const aiResult: AIAnalysisResult = data;
      console.log('AI analysis result:', aiResult);
      
      // Procesar resultados y calcular estadísticas
      const services: GroupedService[] = aiResult.groups.map(group => {
        const relatedTransactions = subscriptionTransactions.filter(t => 
          group.originalComments.includes(t.comentario)
        );

        if (relatedTransactions.length === 0) return null;

        // Calcular último pago
        const sortedTransactions = relatedTransactions.sort((a, b) => 
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        const lastTransaction = sortedTransactions[0];

        // Calcular promedio
        const totalAmount = relatedTransactions.reduce((sum, t) => sum + t.gasto, 0);
        const avgAmount = totalAmount / relatedTransactions.length;

        // Estimar próximo pago (asumiendo mensual si hay múltiples transacciones)
        let proximoPago: Date | undefined;
        if (relatedTransactions.length >= 2) {
          const lastPaymentDate = new Date(lastTransaction.fecha);
          proximoPago = new Date(lastPaymentDate);
          proximoPago.setMonth(proximoPago.getMonth() + 1);
        }

        return {
          serviceName: group.serviceName,
          description: group.description,
          ultimoPago: {
            monto: lastTransaction.gasto,
            fecha: new Date(lastTransaction.fecha)
          },
          proximoPago,
          frecuencia: relatedTransactions.length,
          montoPromedio: avgAmount,
          originalComments: group.originalComments
        };
      }).filter(Boolean) as GroupedService[];

      setGroupedServices(services.sort((a, b) => b.montoPromedio - a.montoPromedio));
      setNeedsAnalysis(false);
    } catch (error) {
      console.error('Error analyzing services:', error);
      toast.error('Error al analizar servicios. Revisa la configuración de la API.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Detectar cuando hay nuevos datos para analizar
  useEffect(() => {
    if (subscriptionTransactions.length > 0 && groupedServices.length === 0) {
      setNeedsAnalysis(true);
    }
  }, [subscriptionTransactions.length, groupedServices.length]);

  const totalMensual = groupedServices.reduce((sum, service) => sum + service.montoPromedio, 0);

  return (
    <Card className="hover-scale border-primary/20 hover:border-primary/40 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Suscripciones
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground text-sm">
            Basado en los últimos 12 meses
          </p>
          <Badge variant="outline" className="text-xs">
            {groupedServices.length} servicios detectados
          </Badge>
        </div>

        {needsAnalysis && (
          <div className="text-center py-4 border border-dashed rounded-lg">
            <HelpCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-3">
              Necesito analizar tus transacciones para agrupar los servicios inteligentemente
            </p>
            <Button 
              onClick={analyzeServices} 
              disabled={isAnalyzing}
              size="sm"
            >
              {isAnalyzing ? 'Analizando...' : 'Analizar Servicios'}
            </Button>
          </div>
        )}

        {groupedServices.length === 0 && !needsAnalysis ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No se detectaron suscripciones</p>
            <p className="text-sm">Necesitas transacciones en la categoría "Cuotas / Suscripciones"</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {groupedServices.map((service, index) => (
                <div key={index} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{service.serviceName}</h3>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {service.frecuencia} pagos
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Último pago:</span>
                        <div className="font-medium">
                          {service.ultimoPago.fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                        </div>
                        <div className="text-primary font-medium">
                          ${formatCurrency(service.ultimoPago.monto)}
                        </div>
                      </div>
                    </div>
                    
                    {service.proximoPago && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-muted-foreground">Próximo pago:</span>
                          <div className="font-medium">
                            {service.proximoPago.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Promedio:</span>
                        <div className="font-medium text-primary">
                          ${formatCurrency(service.montoPromedio)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {groupedServices.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span className="font-medium">Total Mensual Estimado</span>
                  </div>
                  <span className="text-xl font-bold text-primary">
                    ${formatCurrency(totalMensual)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Calculado basándose en el promedio de los últimos 12 meses
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};