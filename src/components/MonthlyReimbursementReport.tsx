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
  reimbursementAmount: number;
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
    
    // Debug: Contador de transacciones procesadas para agosto 2025
    let augustTransactions = 0;
    let augustProcessed = 0;
    let excludedTransactions = 0;
    let augustTotalIncome = 0;
    let augustTotalExpenses = 0;
    let augustReimbursements = 0;
    
  console.log(`🔍 INICIANDO ANÁLISIS AGOSTO 2025`);
  console.log(`Total transacciones a procesar: ${transactions.length}`);
  
  // Contar transacciones de agosto antes de procesarlas
  let augustCount = 0;
  let augustIncomeTotal = 0;
  transactions.forEach(t => {
    const date = new Date(t.fecha);
    if (date.getFullYear() === 2025 && date.getMonth() === 7) {
      augustCount++;
      if (t.ingreso > 0) augustIncomeTotal += t.ingreso;
    }
  });
  console.log(`📈 PRE-CONTEO: ${augustCount} transacciones en agosto 2025`);
  console.log(`💰 PRE-CONTEO: ${augustIncomeTotal} ingresos totales antes de filtros`);
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.fecha);
      const transactionMonth = date.getMonth();
      const transactionYear = date.getFullYear();
      
      // Debug para agosto 2025
      if (transactionYear === 2025 && transactionMonth === 7) { // agosto es mes 7
        augustTransactions++;
        console.log(`[${augustTransactions}] 📊 Procesando: ${transaction.comentario}, Ingreso: ${transaction.ingreso}, Gasto: ${transaction.gasto}, Fecha: ${transaction.fecha}`);
      }
      
      // Excluir el mes actual
      if (transactionYear === currentYear && transactionMonth === currentMonth) {
        if (transactionYear === 2025 && transactionMonth === 7) {
          console.log(`❌ EXCLUYENDO por ser mes actual: ${transaction.comentario}`);
        }
        return;
      }
      
      const monthKey = `${transactionYear}-${String(transactionMonth + 1).padStart(2, '0')}`;
      const monthName = `${date.toLocaleDateString('es-ES', { month: 'long' }).charAt(0).toUpperCase() + date.toLocaleDateString('es-ES', { month: 'long' }).slice(1)} ${transactionYear}`;
      
      // Buscar la categoría para verificar si es reembolso
      const category = categories.find(cat => cat.id === transaction.subcategoriaId);
      
      // Debug para agosto 2025 - mostrar categorías
      if (transactionYear === 2025 && transactionMonth === 7) {
        console.log(`Categoría: "${category?.categoria}", Subcategoría: "${category?.subcategoria}", ID: ${category?.id}`);
        console.log(`Subcategoría ID de transacción: ${transaction.subcategoriaId}`);
      }
      
      // Excluir solo las categorías de tipo "Inversiones" 
      const isInvestmentTransaction = category && category.categoria && 
        category.categoria.toLowerCase().trim() === 'inversiones';
      
      // Debug adicional para agosto 2025
      if (transactionYear === 2025 && transactionMonth === 7) {
        console.log(`¿Es inversión? ${isInvestmentTransaction} - Categoría: "${category?.categoria}"`);
      }
      
      // Si es una transacción de inversión, no la procesamos
      if (isInvestmentTransaction) {
        if (transactionYear === 2025 && transactionMonth === 7) {
          excludedTransactions++;
          console.log(`❌ EXCLUYENDO transacción de inversión: ${transaction.comentario}, Monto: ${transaction.ingreso || transaction.gasto}`);
        }
        return;
      }
      
      // Debug: transacción procesada para agosto
      if (transactionYear === 2025 && transactionMonth === 7) {
        augustProcessed++;
        console.log(`✅ PROCESANDO (${augustProcessed}): ${transaction.comentario}`);
      }
      
      // Identificar reembolsos: solo ingresos que contengan "reembolso" en su descripción
      const isReimbursement = (transaction.ingreso > 0) && (
        category?.subcategoria.toLowerCase().includes('reembolso') || 
        category?.categoria.toLowerCase().includes('reembolso') ||
        transaction.comentario.toLowerCase().includes('reembolso')
      );
      
      if (!dataByMonth[monthKey]) {
        dataByMonth[monthKey] = {
          month: monthName,
          year: transactionYear,
          totalIncome: 0,
          totalExpenses: 0,
          totalBalance: 0,
          reimbursementAmount: 0,
          adjustedIncome: 0,
          adjustedExpenses: 0,
          adjustedBalance: 0,
          currency: transaction.divisa
        };
      }
      
      const data = dataByMonth[monthKey];
      
      if (transaction.ingreso > 0) {
        data.totalIncome += transaction.ingreso;
        
        if (transactionYear === 2025 && transactionMonth === 7) {
          augustTotalIncome += transaction.ingreso;
          if (isReimbursement) {
            augustReimbursements += transaction.ingreso;
            console.log(`💰 REEMBOLSO encontrado: ${transaction.comentario}, Monto: ${transaction.ingreso}`);
          }
        }
        
        if (isReimbursement) {
          data.reimbursementAmount += transaction.ingreso;
        }
      }
      
      if (transaction.gasto > 0) {
        data.totalExpenses += transaction.gasto;
        
        if (transactionYear === 2025 && transactionMonth === 7) {
          augustTotalExpenses += transaction.gasto;
        }
      }
    });
    
    // Debug final para agosto
    console.log(`🏁 === RESUMEN AGOSTO 2025 ===`);
    console.log(`📊 Transacciones encontradas en agosto: ${augustTransactions}`);
    console.log(`✅ Transacciones procesadas: ${augustProcessed}`);
    console.log(`❌ Transacciones excluidas por inversión: ${excludedTransactions}`);
    console.log(`💵 Total ingresos agosto calculado: ${augustTotalIncome}`);
    console.log(`💸 Total gastos agosto calculado: ${augustTotalExpenses}`);
    console.log(`💰 Total reembolsos agosto: ${augustReimbursements}`);
    console.log(`🎯 Total esperado por usuario: 377052.48`);
    console.log(`❓ Diferencia: ${377052.48 - augustTotalIncome}`);
    
    // Calcular balances
    Object.values(dataByMonth).forEach(data => {
      data.totalBalance = data.totalIncome - data.totalExpenses;
      // Los ajustados descuentan los reembolsos tanto de ingresos como de gastos
      // (asumiendo que cada peso reembolsado corresponde a un peso gastado originalmente)
      data.adjustedIncome = data.totalIncome - data.reimbursementAmount;
      data.adjustedExpenses = data.totalExpenses - data.reimbursementAmount;
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

  // Calcular resumen de los últimos 12 meses
  const yearSummary = useMemo(() => {
    if (monthlyData.length === 0) return null;
    
    const summary = {
      totalIncome: 0,
      totalExpenses: 0,
      totalBalance: 0,
      reimbursementAmount: 0,
      adjustedIncome: 0,
      adjustedExpenses: 0,
      adjustedBalance: 0,
      currency: monthlyData[0]?.currency || 'MXN'
    };
    
    monthlyData.forEach(data => {
      summary.totalIncome += data.totalIncome;
      summary.totalExpenses += data.totalExpenses;
      summary.reimbursementAmount += data.reimbursementAmount;
    });
    
    summary.totalBalance = summary.totalIncome - summary.totalExpenses;
    summary.adjustedIncome = summary.totalIncome - summary.reimbursementAmount;
    summary.adjustedExpenses = summary.totalExpenses - summary.reimbursementAmount;
    summary.adjustedBalance = summary.adjustedIncome - summary.adjustedExpenses;
    
    return summary;
  }, [monthlyData]);
  
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
      
      {/* Resumen de los Últimos 12 Meses */}
      {yearSummary && (
        <Card className="overflow-hidden border-2 border-primary/20">
          <CardHeader className="pb-3 bg-primary/5">
            <CardTitle className="flex items-center justify-between">
              <span className="text-xl">Resumen Últimos 12 Meses</span>
              {(yearSummary.reimbursementAmount) > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" />
                  {formatCurrency(yearSummary.reimbursementAmount, yearSummary.currency)} total reembolsado
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Datos Totales Anuales */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Totales Anuales</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Ingresos</span>
                    </span>
                    <span className="font-bold text-lg text-green-700">
                      {formatCurrency(yearSummary.totalIncome, yearSummary.currency)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                    <span className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                      <span className="font-medium">Gastos</span>
                    </span>
                    <span className="font-bold text-lg text-red-700">
                      {formatCurrency(yearSummary.totalExpenses, yearSummary.currency)}
                    </span>
                  </div>
                  
                  <div className={`flex justify-between items-center p-4 rounded-lg border-2 ${
                    yearSummary.totalBalance > 0 ? 'bg-green-100 border-green-200' : 
                    yearSummary.totalBalance < 0 ? 'bg-red-100 border-red-200' : 'bg-gray-100 border-gray-200'
                  }`}>
                    <span className="flex items-center gap-2 font-medium">
                      {getBalanceIcon(yearSummary.totalBalance)}
                      <span className="font-semibold">Balance Total</span>
                    </span>
                    <span className={`font-bold text-xl ${getBalanceColor(yearSummary.totalBalance)}`}>
                      {formatCurrency(yearSummary.totalBalance, yearSummary.currency)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Datos Ajustados Anuales */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Ajustados Anuales (Sin Reembolsos)</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Ingresos Netos</span>
                    </span>
                    <span className="font-bold text-lg text-blue-700">
                      {formatCurrency(yearSummary.adjustedIncome, yearSummary.currency)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-orange-50 rounded-lg">
                    <span className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-orange-600" />
                      <span className="font-medium">Gastos Netos</span>
                    </span>
                    <span className="font-bold text-lg text-orange-700">
                      {formatCurrency(yearSummary.adjustedExpenses, yearSummary.currency)}
                    </span>
                  </div>
                  
                  <div className={`flex justify-between items-center p-4 rounded-lg border-2 ${
                    yearSummary.adjustedBalance > 0 ? 'bg-blue-100 border-blue-200' : 
                    yearSummary.adjustedBalance < 0 ? 'bg-orange-100 border-orange-200' : 'bg-gray-100 border-gray-200'
                  }`}>
                    <span className="flex items-center gap-2 font-medium">
                      {getBalanceIcon(yearSummary.adjustedBalance)}
                      <span className="font-semibold">Balance Ajustado</span>
                    </span>
                    <span className={`font-bold text-xl ${getBalanceColor(yearSummary.adjustedBalance)}`}>
                      {formatCurrency(yearSummary.adjustedBalance, yearSummary.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Análisis Mensual Detallado */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-center">Análisis Mensual Detallado</h3>
        {monthlyData.map((data, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="capitalize">{data.month}</span>
                {data.reimbursementAmount > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" />
                    {formatCurrency(data.reimbursementAmount, data.currency)} reembolsados
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};