import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp, Waves, TrendingUp } from 'lucide-react';
import { DashboardMetrics, Transaction } from '@/types/finance';
import { useMemo } from 'react';

interface CashFlowReportProps {
  metrics: DashboardMetrics;
  formatCurrency: (amount: number) => string;
  transactions: (Transaction & { categoria?: string; subcategoria?: string })[];
}

export const CashFlowReport = ({ metrics, formatCurrency, transactions }: CashFlowReportProps) => {
  const cashFlowData = useMemo(() => {
    const currentDate = new Date();
    const startOfPreviousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    
    const previousMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.fecha);
      return transactionDate >= startOfPreviousMonth && transactionDate <= endOfPreviousMonth;
    });

    // Flujos de efectivo operativos (ingresos y gastos regulares)
    const operatingInflows = previousMonthTransactions
      .filter(t => t.ingreso > 0 && t.tipo === 'Ingreso')
      .reduce((sum, t) => sum + t.ingreso, 0);

    const operatingOutflows = previousMonthTransactions
      .filter(t => t.gasto > 0 && t.tipo === 'Gastos')
      .reduce((sum, t) => sum + t.gasto, 0);

    // Flujos de inversión (aportaciones y retiros de inversiones)
    const investmentInflows = previousMonthTransactions
      .filter(t => t.ingreso > 0 && t.tipo === 'Retiro')
      .reduce((sum, t) => sum + t.ingreso, 0);

    const investmentOutflows = previousMonthTransactions
      .filter(t => t.gasto > 0 && t.tipo === 'Aportación')
      .reduce((sum, t) => sum + t.gasto, 0);

    const netOperatingCashFlow = operatingInflows - operatingOutflows;
    const netInvestmentCashFlow = investmentInflows - investmentOutflows;
    const netCashFlow = netOperatingCashFlow + netInvestmentCashFlow;

    return {
      operatingInflows,
      operatingOutflows,
      netOperatingCashFlow,
      investmentInflows,
      investmentOutflows,
      netInvestmentCashFlow,
      netCashFlow,
      monthName: startOfPreviousMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    };
  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Waves className="h-5 w-5" />
          Estado de Flujo de Efectivo
        </CardTitle>
        <p className="text-sm text-muted-foreground capitalize">
          {cashFlowData.monthName}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Flujo de Efectivo Operativo */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Flujo de Efectivo Operativo</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Entradas Operativas</p>
                  <p className="text-xl font-bold text-green-600">
                    ${formatCurrency(cashFlowData.operatingInflows)}
                  </p>
                </div>
                <ArrowDown className="h-6 w-6 text-green-600" />
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Salidas Operativas</p>
                  <p className="text-xl font-bold text-red-600">
                    ${formatCurrency(cashFlowData.operatingOutflows)}
                  </p>
                </div>
                <ArrowUp className="h-6 w-6 text-red-600" />
              </div>
            </div>

            <div className={`p-4 rounded-lg border ${
              cashFlowData.netOperatingCashFlow >= 0 
                ? 'bg-blue-50 dark:bg-blue-950' 
                : 'bg-orange-50 dark:bg-orange-950'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Flujo Operativo Neto</p>
                  <p className={`text-xl font-bold ${
                    cashFlowData.netOperatingCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'
                  }`}>
                    ${formatCurrency(cashFlowData.netOperatingCashFlow)}
                  </p>
                </div>
                <TrendingUp className={`h-6 w-6 ${
                  cashFlowData.netOperatingCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`} />
              </div>
            </div>
          </div>
        </div>

        {/* Flujo de Efectivo de Inversión */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Flujo de Efectivo de Inversión</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-cyan-50 dark:bg-cyan-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Retiros de Inversión</p>
                  <p className="text-xl font-bold text-cyan-600">
                    ${formatCurrency(cashFlowData.investmentInflows)}
                  </p>
                </div>
                <ArrowDown className="h-6 w-6 text-cyan-600" />
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-purple-50 dark:bg-purple-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aportaciones a Inversión</p>
                  <p className="text-xl font-bold text-purple-600">
                    ${formatCurrency(cashFlowData.investmentOutflows)}
                  </p>
                </div>
                <ArrowUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>

            <div className={`p-4 rounded-lg border ${
              cashFlowData.netInvestmentCashFlow >= 0 
                ? 'bg-indigo-50 dark:bg-indigo-950' 
                : 'bg-pink-50 dark:bg-pink-950'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Flujo de Inversión Neto</p>
                  <p className={`text-xl font-bold ${
                    cashFlowData.netInvestmentCashFlow >= 0 ? 'text-indigo-600' : 'text-pink-600'
                  }`}>
                    ${formatCurrency(cashFlowData.netInvestmentCashFlow)}
                  </p>
                </div>
                <Waves className={`h-6 w-6 ${
                  cashFlowData.netInvestmentCashFlow >= 0 ? 'text-indigo-600' : 'text-pink-600'
                }`} />
              </div>
            </div>
          </div>
        </div>

        {/* Flujo de Efectivo Total */}
        <div className="border-t pt-4">
          <div className={`p-6 rounded-lg border-2 ${
            cashFlowData.netCashFlow >= 0 
              ? 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800' 
              : 'border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800'
          }`}>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Flujo de Efectivo Neto Total</h3>
              <p className={`text-3xl font-bold ${
                cashFlowData.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ${formatCurrency(cashFlowData.netCashFlow)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {cashFlowData.netCashFlow >= 0 
                  ? 'Generación positiva de efectivo' 
                  : 'Consumo neto de efectivo'}
              </p>
            </div>
          </div>
        </div>

        {/* Análisis de Ratios */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-4">Análisis de Flujo de Efectivo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-muted-foreground">Cobertura de Gastos Operativos</p>
              <p className="font-semibold">
                {cashFlowData.operatingOutflows > 0 
                  ? ((cashFlowData.operatingInflows / cashFlowData.operatingOutflows) * 100).toFixed(1) 
                  : '∞'}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-muted-foreground">Ratio de Flujo de Inversión</p>
              <p className="font-semibold">
                {cashFlowData.operatingInflows > 0 
                  ? ((Math.abs(cashFlowData.netInvestmentCashFlow) / cashFlowData.operatingInflows) * 100).toFixed(1) 
                  : '0'}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};