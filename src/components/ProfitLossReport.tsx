import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { DashboardMetrics, Transaction, Category } from '@/types/finance';
import { useMemo } from 'react';

interface ProfitLossReportProps {
  metrics: DashboardMetrics;
  formatCurrency: (amount: number) => string;
  transactions: (Transaction & { categoria?: string; subcategoria?: string })[];
  categories: Category[];
}

export const ProfitLossReport = ({ metrics, formatCurrency, transactions, categories }: ProfitLossReportProps) => {
  // Calcular P&L del mes anterior
  const previousMonthPL = useMemo(() => {
    const currentDate = new Date();
    const startOfPreviousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    
    const previousMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.fecha);
      return transactionDate >= startOfPreviousMonth && transactionDate <= endOfPreviousMonth;
    });

    // Obtener tipo de categoría para cada transacción
    const getCategoryType = (subcategoriaId: string) => {
      const category = categories.find(c => c.id === subcategoriaId);
      return category?.tipo;
    };

    // Reembolso = ingreso > 0 asociado a categoría tipo 'Gastos'
    const reembolsos = previousMonthTransactions
      .filter(t => t.ingreso > 0 && getCategoryType(t.subcategoriaId) === 'Gastos')
      .reduce((sum, t) => sum + t.ingreso, 0);

    const income = previousMonthTransactions
      .filter(t => t.ingreso > 0 && getCategoryType(t.subcategoriaId) === 'Ingreso')
      .reduce((sum, t) => sum + t.ingreso, 0);

    const expenses = previousMonthTransactions
      .filter(t => t.gasto > 0)
      .reduce((sum, t) => sum + t.gasto, 0) - reembolsos;

    const netIncome = income - expenses;

    // Agrupar ingresos por categoría
    const incomeByCategory: { [key: string]: number } = {};
    const expensesByCategory: { [key: string]: number } = {};

    previousMonthTransactions.forEach(t => {
      const category = categories.find(c => c.id === t.subcategoriaId);
      const categoryName = category ? category.categoria : 'Sin categoría';
      const categoryType = category?.tipo;

      // Reembolso = ingreso en categoría de gasto -> resta del gasto de esa categoría
      if (t.ingreso > 0 && categoryType === 'Gastos') {
        // Es un reembolso - restar de la categoría de gasto correspondiente
        expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) - t.ingreso;
      } else if (t.ingreso > 0 && categoryType === 'Ingreso') {
        // Es un ingreso normal
        incomeByCategory[categoryName] = (incomeByCategory[categoryName] || 0) + t.ingreso;
      }
      
      if (t.gasto > 0) {
        expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + t.gasto;
      }
    });

    // Eliminar categorías con gasto negativo o cero después de reembolsos
    Object.keys(expensesByCategory).forEach(key => {
      if (expensesByCategory[key] <= 0) {
        delete expensesByCategory[key];
      }
    });

    return {
      income,
      expenses,
      netIncome,
      incomeByCategory: Object.entries(incomeByCategory)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount),
      expensesByCategory: Object.entries(expensesByCategory)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount),
      monthName: startOfPreviousMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    };
  }, [transactions, categories]);

  const profitMargin = previousMonthPL.income > 0 ? (previousMonthPL.netIncome / previousMonthPL.income) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Estado de Resultados (P&L)
          </CardTitle>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground capitalize">
              {previousMonthPL.monthName}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resumen Principal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${formatCurrency(previousMonthPL.income)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Gastos Totales</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${formatCurrency(previousMonthPL.expenses)}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <div className={`p-4 rounded-lg border ${
              previousMonthPL.netIncome >= 0 
                ? 'bg-blue-50 dark:bg-blue-950' 
                : 'bg-orange-50 dark:bg-orange-950'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Utilidad Neta</p>
                  <p className={`text-2xl font-bold ${
                    previousMonthPL.netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'
                  }`}>
                    ${formatCurrency(previousMonthPL.netIncome)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Margen: {profitMargin.toFixed(1)}%
                  </p>
                </div>
                <DollarSign className={`h-8 w-8 ${
                  previousMonthPL.netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`} />
              </div>
            </div>
          </div>

          {/* Desglose de Ingresos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-green-600">Ingresos por Categoría</h3>
              <div className="space-y-3">
                {previousMonthPL.incomeByCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay ingresos registrados</p>
                ) : (
                  previousMonthPL.incomeByCategory.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-green-50/50 dark:bg-green-950/50">
                      <span className="font-medium">{item.name}</span>
                      <div className="text-right">
                        <span className="font-semibold text-green-600">
                          ${formatCurrency(item.amount)}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {((item.amount / previousMonthPL.income) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Desglose de Gastos */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-red-600">Gastos por Categoría</h3>
              <div className="space-y-3">
                {previousMonthPL.expensesByCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay gastos registrados</p>
                ) : (
                  previousMonthPL.expensesByCategory.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-red-50/50 dark:bg-red-950/50">
                      <span className="font-medium">{item.name}</span>
                      <div className="text-right">
                        <span className="font-semibold text-red-600">
                          ${formatCurrency(item.amount)}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {((item.amount / previousMonthPL.expenses) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Indicadores Clave */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Indicadores Clave</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-muted-foreground">Ratio Ingresos/Gastos</p>
                <p className="font-semibold">
                  {previousMonthPL.expenses > 0 ? (previousMonthPL.income / previousMonthPL.expenses).toFixed(2) : '∞'}:1
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-muted-foreground">Margen de Ganancia</p>
                <p className="font-semibold">{profitMargin.toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-muted-foreground">Eficiencia de Gastos</p>
                <p className="font-semibold">
                  {previousMonthPL.income > 0 ? ((previousMonthPL.expenses / previousMonthPL.income) * 100).toFixed(1) : '0'}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};