import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Transaction, Category } from '@/types/finance';
import { TrendingUp, TrendingDown, DollarSign, RotateCcw } from 'lucide-react';

interface MonthlyReimbursementReportProps {
  transactions: Transaction[];
  categories: Category[];
  formatCurrency: (amount: number, currency?: string) => string;
}

interface MonthlyData {
  month: string;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  totalBalance: number;
  reimbursements: number;
  adjustedIncome: number;
  adjustedExpenses: number;
  adjustedBalance: number;
  currency: string;
}

export const MonthlyReimbursementReport = ({ 
  transactions, 
  categories, 
  formatCurrency 
}: MonthlyReimbursementReportProps) => {
  
  const monthlyData = useMemo(() => {
    const dataByMonth: Record<string, MonthlyData> = {};
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.fecha);
      const transactionMonth = date.getMonth();
      const transactionYear = date.getFullYear();
      
      // Excluir el mes actual
      if (transactionYear === currentYear && transactionMonth === currentMonth) {
        return;
      }
      
      const monthKey = `${transactionYear}-${String(transactionMonth + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      
      // Buscar la categoría para verificar si es reembolso
      const category = categories.find(cat => cat.id === transaction.subcategoriaId);
      const isReimbursement = category?.subcategoria.toLowerCase().includes('reembolso') || 
                             category?.categoria.toLowerCase().includes('reembolso') ||
                             transaction.comentario.toLowerCase().includes('reembolso');
      
      if (!dataByMonth[monthKey]) {
        dataByMonth[monthKey] = {
          month: monthName,
          year: transactionYear,
          totalIncome: 0,
          totalExpenses: 0,
          totalBalance: 0,
          reimbursements: 0,
          adjustedIncome: 0,
          adjustedExpenses: 0,
          adjustedBalance: 0,
          currency: transaction.divisa
        };
      }
      
      const data = dataByMonth[monthKey];
      
      if (transaction.ingreso > 0) {
        data.totalIncome += transaction.ingreso;
        
        if (isReimbursement) {
          data.reimbursements += transaction.ingreso;
        } else {
          data.adjustedIncome += transaction.ingreso;
        }
      }
      
      if (transaction.gasto > 0) {
        data.totalExpenses += transaction.gasto;
        
        // Si no es un gasto reembolsado, se cuenta en gastos ajustados
        if (!isReimbursement) {
          data.adjustedExpenses += transaction.gasto;
        }
      }
    });
    
    // Calcular balances
    Object.values(dataByMonth).forEach(data => {
      data.totalBalance = data.totalIncome - data.totalExpenses;
      data.adjustedBalance = data.adjustedIncome - data.adjustedExpenses;
    });
    
    // Ordenar por año y mes descendente (más reciente primero), excluyendo mes actual
    return Object.entries(dataByMonth)
      .map(([key, data]) => {
        const [year, month] = key.split('-');
        return {
          ...data,
          sortKey: parseInt(year) * 12 + parseInt(month)
        };
      })
      .sort((a, b) => b.sortKey - a.sortKey)
      .slice(0, 12); // Últimos 12 meses (excluyendo el actual)
  }, [transactions, categories]);
  
  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-green-600';
    if (balance < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };
  
  const getBalanceIcon = (balance: number) => {
    if (balance > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (balance < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <DollarSign className="h-4 w-4 text-muted-foreground" />;
  };

  if (monthlyData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            No hay datos suficientes para generar el informe mensual de reembolsos.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Informe Mensual con Análisis de Reembolsos</h2>
        <p className="text-muted-foreground">
          Comparación de ingresos y gastos totales vs. ajustados (descontando reembolsos)
        </p>
      </div>
      
      <div className="grid gap-4">
        {monthlyData.map((data, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="capitalize">{data.month}</span>
                {data.reimbursements > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" />
                    {formatCurrency(data.reimbursements, data.currency)} reembolsados
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Datos Totales */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Datos Totales</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        Ingresos
                      </span>
                      <span className="font-semibold text-green-700">
                        {formatCurrency(data.totalIncome, data.currency)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        Gastos
                      </span>
                      <span className="font-semibold text-red-700">
                        {formatCurrency(data.totalExpenses, data.currency)}
                      </span>
                    </div>
                    
                    <div className={`flex justify-between items-center p-3 rounded-lg border-2 ${
                      data.totalBalance > 0 ? 'bg-green-100 border-green-200' : 
                      data.totalBalance < 0 ? 'bg-red-100 border-red-200' : 'bg-gray-100 border-gray-200'
                    }`}>
                      <span className="flex items-center gap-2 font-medium">
                        {getBalanceIcon(data.totalBalance)}
                        Balance Total
                      </span>
                      <span className={`font-bold text-lg ${getBalanceColor(data.totalBalance)}`}>
                        {formatCurrency(data.totalBalance, data.currency)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Datos Ajustados */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Datos Ajustados (Sin Reembolsos)</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        Ingresos Netos
                      </span>
                      <span className="font-semibold text-blue-700">
                        {formatCurrency(data.adjustedIncome, data.currency)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                      <span className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-orange-600" />
                        Gastos Netos
                      </span>
                      <span className="font-semibold text-orange-700">
                        {formatCurrency(data.adjustedExpenses, data.currency)}
                      </span>
                    </div>
                    
                    <div className={`flex justify-between items-center p-3 rounded-lg border-2 ${
                      data.adjustedBalance > 0 ? 'bg-blue-100 border-blue-200' : 
                      data.adjustedBalance < 0 ? 'bg-orange-100 border-orange-200' : 'bg-gray-100 border-gray-200'
                    }`}>
                      <span className="flex items-center gap-2 font-medium">
                        {getBalanceIcon(data.adjustedBalance)}
                        Balance Ajustado
                      </span>
                      <span className={`font-bold text-lg ${getBalanceColor(data.adjustedBalance)}`}>
                        {formatCurrency(data.adjustedBalance, data.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Diferencia */}
              {data.reimbursements > 0 && (
                <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex justify-between items-center">
                    <span className="text-purple-700 font-medium">Impacto de Reembolsos:</span>
                    <span className="text-purple-800 font-semibold">
                      {formatCurrency(Math.abs(data.totalBalance - data.adjustedBalance), data.currency)} diferencia
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};