import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Calendar, Clock, TrendingUp, ChevronDown } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface TrackedPayment {
  id: string;
  categoryId: string;
  categoryName: string;
  subcategoryName: string;
  lastPayment: {
    amount: number;
    date: Date;
    formattedDate: string;
  };
  nextPayment: Date;
  paymentHistory: Array<{
    date: Date;
    amount: number;
    formattedDate: string;
  }>;
  totalPaid: number;
  active: boolean;
}

export const AnnualPaymentsTracker = () => {
  const { formatCurrency } = useAppConfig();
  const financeData = useFinanceDataSupabase();
  const { categories, transactions } = financeData;
  const [trackedPayments, setTrackedPayments] = useState<TrackedPayment[]>([]);
  const [inactivePayments, setInactivePayments] = useState<Set<string>>(new Set());
  const [showInactive, setShowInactive] = useState(false);
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());

  // Load inactive status from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('inactive_annual_payments');
    if (saved) {
      setInactivePayments(new Set(JSON.parse(saved)));
    }
  }, []);

  // Get categories with annual tracking (frecuencia_seguimiento = 'anual')
  const annualCategories = useMemo(() => {
    return categories.filter(c => 
      c.tipo === 'Gastos' && 
      (c as any).frecuencia_seguimiento === 'anual'
    );
  }, [categories]);

  // Process transactions for annual tracked categories
  useEffect(() => {
    if (!transactions || !annualCategories || annualCategories.length === 0) {
      setTrackedPayments([]);
      return;
    }

    const payments: TrackedPayment[] = [];

    annualCategories.forEach(category => {
      // Get all transactions for this category
      const categoryTransactions = transactions
        .filter(t => t.subcategoriaId === category.id && t.gasto > 0)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      if (categoryTransactions.length === 0) return;

      const lastTransaction = categoryTransactions[0];
      const lastPaymentDate = new Date(lastTransaction.fecha);
      
      // Calculate next payment (1 year from last payment)
      const nextPayment = new Date(lastPaymentDate);
      nextPayment.setFullYear(nextPayment.getFullYear() + 1);

      // Build payment history
      const paymentHistory = categoryTransactions.map(t => ({
        date: new Date(t.fecha),
        amount: t.gasto,
        formattedDate: new Date(t.fecha).toLocaleDateString('es-ES', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })
      }));

      // Calculate total paid
      const totalPaid = categoryTransactions.reduce((sum, t) => sum + t.gasto, 0);

      payments.push({
        id: category.id,
        categoryId: category.id,
        categoryName: category.categoria,
        subcategoryName: category.subcategoria,
        lastPayment: {
          amount: lastTransaction.gasto,
          date: lastPaymentDate,
          formattedDate: lastPaymentDate.toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })
        },
        nextPayment,
        paymentHistory,
        totalPaid,
        active: !inactivePayments.has(category.id)
      });
    });

    // Sort by next payment date
    payments.sort((a, b) => a.nextPayment.getTime() - b.nextPayment.getTime());

    setTrackedPayments(payments);
  }, [transactions, annualCategories, inactivePayments]);

  const toggleActive = (paymentId: string) => {
    const newInactive = new Set(inactivePayments);
    if (newInactive.has(paymentId)) {
      newInactive.delete(paymentId);
      toast.success('Pago activado');
    } else {
      newInactive.add(paymentId);
      toast.success('Pago desactivado');
    }
    setInactivePayments(newInactive);
    localStorage.setItem('inactive_annual_payments', JSON.stringify([...newInactive]));
  };

  const toggleExpanded = (paymentId: string) => {
    const newExpanded = new Set(expandedPayments);
    if (newExpanded.has(paymentId)) {
      newExpanded.delete(paymentId);
    } else {
      newExpanded.add(paymentId);
    }
    setExpandedPayments(newExpanded);
  };

  const filteredPayments = useMemo(() => {
    return trackedPayments.filter(p => showInactive || p.active);
  }, [trackedPayments, showInactive]);

  const totalAnnual = useMemo(() => {
    return trackedPayments
      .filter(p => p.active)
      .reduce((sum, p) => sum + p.lastPayment.amount, 0);
  }, [trackedPayments]);

  const getDaysUntilPayment = (nextPayment: Date) => {
    const today = new Date();
    const diffTime = nextPayment.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPaymentStatus = (nextPayment: Date) => {
    const days = getDaysUntilPayment(nextPayment);
    if (days < 0) {
      return { label: 'Vencido', variant: 'destructive' as const, days: Math.abs(days) };
    } else if (days <= 30) {
      return { label: 'Próximo', variant: 'default' as const, days };
    } else if (days <= 90) {
      return { label: 'En 3 meses', variant: 'secondary' as const, days };
    }
    return { label: `En ${Math.floor(days / 30)} meses`, variant: 'outline' as const, days };
  };

  if (annualCategories.length === 0) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Seguimiento de Pagos Anuales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium mb-2">No hay categorías con seguimiento anual</p>
            <p className="text-sm">
              Ve a Configuración → Categorías y marca "Seguimiento Anual" en las categorías de gastos que quieras seguir (ej: Seguros)
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Seguimiento de Pagos Anuales
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground text-sm">
            Seguimiento de pagos anuales recurrentes
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="show-inactive-annual"
                checked={showInactive}
                onCheckedChange={(checked) => setShowInactive(checked as boolean)}
              />
              <label 
                htmlFor="show-inactive-annual" 
                className="text-xs text-muted-foreground cursor-pointer"
              >
                Mostrar inactivos
              </label>
            </div>
            <Badge variant="outline" className="text-xs">
              {filteredPayments.length} pagos
            </Badge>
          </div>
        </div>

        {/* Annual Total Summary */}
        {totalAnnual > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="font-semibold text-primary">Total Anual Estimado</h4>
                  <p className="text-sm text-muted-foreground">
                    {trackedPayments.filter(p => p.active).length} pago{trackedPayments.filter(p => p.active).length !== 1 ? 's' : ''} activo{trackedPayments.filter(p => p.active).length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  ${formatCurrency(totalAnnual)}
                </div>
                <div className="text-sm text-muted-foreground">
                  ~${formatCurrency(totalAnnual / 12)}/mes
                </div>
              </div>
            </div>
          </div>
        )}

        {filteredPayments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay pagos anuales detectados</p>
            <p className="text-sm">Registra transacciones en las categorías con seguimiento anual</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPayments.map((payment) => {
              const status = getPaymentStatus(payment.nextPayment);
              const isExpanded = expandedPayments.has(payment.id);
              
              return (
                <Collapsible 
                  key={payment.id} 
                  open={isExpanded}
                  onOpenChange={() => toggleExpanded(payment.id)}
                >
                  <div className={`rounded-lg border transition-colors ${payment.active ? 'bg-card hover:bg-muted/5' : 'bg-muted/20 border-muted opacity-60'}`}>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            checked={payment.active}
                            onCheckedChange={() => toggleActive(payment.id)}
                            aria-label={`${payment.active ? 'Desactivar' : 'Activar'} seguimiento de ${payment.subcategoryName}`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className={`font-semibold text-lg ${!payment.active ? 'text-muted-foreground' : ''}`}>
                                {payment.subcategoryName}
                              </h3>
                              <Badge variant={status.variant} className="text-xs">
                                {status.label}
                              </Badge>
                              {!payment.active && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  Inactivo
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{payment.categoryName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-primary">
                            ${formatCurrency(payment.lastPayment.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">último pago</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="text-muted-foreground">Último pago:</span>
                            <div className="font-medium">{payment.lastPayment.formattedDate}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="text-muted-foreground">Próximo pago:</span>
                            <div className="font-medium">
                              {payment.nextPayment.toLocaleDateString('es-ES', { 
                                day: 'numeric',
                                month: 'long', 
                                year: 'numeric' 
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full mt-3 text-muted-foreground">
                          <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          Historial de pagos ({payment.paymentHistory.length})
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent>
                      <div className="px-4 pb-4 border-t">
                        <div className="pt-3 space-y-2">
                          <div className="flex justify-between text-sm font-medium text-muted-foreground mb-2">
                            <span>Total pagado</span>
                            <span className="text-foreground">${formatCurrency(payment.totalPaid)}</span>
                          </div>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {payment.paymentHistory.map((hist, idx) => (
                              <div key={idx} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                                <span className="text-muted-foreground">{hist.formattedDate}</span>
                                <span className="font-medium">${formatCurrency(hist.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};