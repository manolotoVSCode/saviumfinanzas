import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { DashboardMetrics } from '@/types/finance';
import { TrendingUp, TrendingDown, Info, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, ComposedChart, ReferenceLine } from 'recharts';
import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DashboardProps {
  metrics: DashboardMetrics;
  formatCurrency: (amount: number) => string;
  currencyCode?: string;
  transactions?: any[]; // Agregamos las transacciones para filtrar
  accounts?: any[]; // Agregamos las cuentas para filtrar
}

export const Dashboard = ({ metrics, formatCurrency, currencyCode = 'MXN', transactions = [], accounts = [] }: DashboardProps) => {
  const [selectedCurrency, setSelectedCurrency] = useState<'MXN' | 'USD' | 'EUR'>('MXN');
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});
  const { t } = useLanguage();
  
  // Estados para selectores de período
  const now = new Date();
  // En enero, por defecto mostrar el año anterior (que tiene datos completos)
  const defaultYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const defaultMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const defaultMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonth);
  const [selectedMonthYear, setSelectedMonthYear] = useState<number>(defaultMonthYear);
  const [selectedCategoryMonth, setSelectedCategoryMonth] = useState<number | null>(null); // null = todos los 12 meses

  // Años disponibles
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    transactions.forEach(t => {
      const year = new Date(t.fecha).getFullYear();
      years.add(year);
    });
    if (years.size === 0) {
      years.add(now.getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  const months = [
    { value: 0, label: 'Enero' },
    { value: 1, label: 'Febrero' },
    { value: 2, label: 'Marzo' },
    { value: 3, label: 'Abril' },
    { value: 4, label: 'Mayo' },
    { value: 5, label: 'Junio' },
    { value: 6, label: 'Julio' },
    { value: 7, label: 'Agosto' },
    { value: 8, label: 'Septiembre' },
    { value: 9, label: 'Octubre' },
    { value: 10, label: 'Noviembre' },
    { value: 11, label: 'Diciembre' },
  ];

  const toggleCollapsible = (key: string) => {
    setOpenCollapsibles(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Función para filtrar métricas por moneda - AHORA USA SELECTORES
  const getFilteredMetrics = (currency: 'MXN' | 'USD' | 'EUR') => {
    // Filtrar transacciones por moneda seleccionada
    const filteredTransactions = transactions.filter(t => t.divisa === currency);
    
    // USAR SELECTORES EN VEZ DE FECHAS FIJAS
    const targetMonth = selectedMonth;
    const targetMonthYear = selectedMonthYear;
    
    // Calcular mes anterior para comparativo
    const prevMonth = targetMonth === 0 ? 11 : targetMonth - 1;
    const prevMonthYear = targetMonth === 0 ? targetMonthYear - 1 : targetMonthYear;
    
    // USAR SELECTOR DE AÑO
    const targetYear = selectedYear;
    const compareYear = targetYear - 1;
    // AÑO ANTERIOR AL OBJETIVO (para comparativo)
    const startOfLastYear = new Date(compareYear, 0, 1);
    const endOfLastYear = new Date(compareYear, 11, 31);
    
    // Transacciones del mes seleccionado
    const lastMonthTransactions = filteredTransactions.filter(t => {
      const tDate = new Date(t.fecha);
      return tDate.getMonth() === targetMonth && tDate.getFullYear() === targetMonthYear;
    });
    
    // Transacciones del mes anterior al seleccionado (para comparativo)
    const twoMonthsAgoTransactions = filteredTransactions.filter(t => {
      const tDate = new Date(t.fecha);
      return tDate.getMonth() === prevMonth && tDate.getFullYear() === prevMonthYear;
    });
    
    // Transacciones del año objetivo
    const yearTransactions = filteredTransactions.filter(t => {
      const tDate = new Date(t.fecha);
      return tDate.getFullYear() === targetYear;
    });
    
    // Transacciones del año anterior al objetivo
    const lastYearTransactions = filteredTransactions.filter(t => {
      const tDate = new Date(t.fecha);
      return tDate.getFullYear() === compareYear;
    });
    
    // Calcular reembolsos del mes PRIMERO para ajustar ingresos y gastos
    const reembolsosMes = lastMonthTransactions
      .filter(t => 
        t.tipo === 'Reembolso' || 
        t.categoria?.toLowerCase().includes('reembolso') ||
        t.subcategoria?.toLowerCase().includes('reembolso') ||
        t.comentario?.toLowerCase().includes('reembolso')
      )
      .reduce((sum, t) => sum + (t.ingreso || 0), 0);
    
    // Cálculos del mes (excluyendo aportaciones, retiros, "Compra Venta Inmuebles" y REEMBOLSOS de ingresos)
    const ingresosMes = lastMonthTransactions
      .filter(t => t.tipo === 'Ingreso' && 
        t.categoria !== 'Compra Venta Inmuebles' &&
        !t.categoria?.toLowerCase().includes('reembolso') &&
        !t.subcategoria?.toLowerCase().includes('reembolso') &&
        !t.comentario?.toLowerCase().includes('reembolso')
      )
      .reduce((sum, t) => sum + t.ingreso, 0);
    const gastosMes = lastMonthTransactions
      .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + t.gasto, 0);
    
    // Los reembolsos SOLO se restan de gastos (no de ingresos, ya que no están incluidos en ingresos)
    const gastosAjustadosMes = gastosMes - reembolsosMes;
    
    // Calcular reembolsos del mes anterior (para comparativo)
    const reembolsosMesAnterior = twoMonthsAgoTransactions
      .filter(t => 
        t.tipo === 'Reembolso' || 
        t.categoria?.toLowerCase().includes('reembolso') ||
        t.subcategoria?.toLowerCase().includes('reembolso') ||
        t.comentario?.toLowerCase().includes('reembolso')
      )
      .reduce((sum, t) => sum + (t.ingreso || 0), 0);
    
    // Cálculos de dos meses atrás (para comparativo)
    const ingresosMesAnterior = twoMonthsAgoTransactions
      .filter(t => t.tipo === 'Ingreso' && 
        t.categoria !== 'Compra Venta Inmuebles' &&
        !t.categoria?.toLowerCase().includes('reembolso') &&
        !t.subcategoria?.toLowerCase().includes('reembolso') &&
        !t.comentario?.toLowerCase().includes('reembolso')
      )
      .reduce((sum, t) => sum + t.ingreso, 0);
    const gastosMesAnterior = twoMonthsAgoTransactions
      .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + t.gasto, 0);
    
    const gastosAjustadosMesAnterior = gastosMesAnterior - reembolsosMesAnterior;
    
    // Calcular reembolsos del año
    const reembolsosAnio = yearTransactions
      .filter(t => 
        t.tipo === 'Reembolso' || 
        t.categoria?.toLowerCase().includes('reembolso') ||
        t.subcategoria?.toLowerCase().includes('reembolso') ||
        t.comentario?.toLowerCase().includes('reembolso')
      )
      .reduce((sum, t) => sum + (t.ingreso || 0), 0);
    
    // Cálculos del año (excluyendo reembolsos de ingresos)
    const ingresosAnio = yearTransactions
      .filter(t => t.tipo === 'Ingreso' && 
        t.categoria !== 'Compra Venta Inmuebles' &&
        !t.categoria?.toLowerCase().includes('reembolso') &&
        !t.subcategoria?.toLowerCase().includes('reembolso') &&
        !t.comentario?.toLowerCase().includes('reembolso')
      )
      .reduce((sum, t) => sum + t.ingreso, 0);
    const gastosAnio = yearTransactions
      .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + t.gasto, 0);
    
    const gastosAjustadosAnio = gastosAnio - reembolsosAnio;
    
    // Calcular reembolsos del año anterior
    const reembolsosAnioAnterior = lastYearTransactions
      .filter(t => 
        t.tipo === 'Reembolso' || 
        t.categoria?.toLowerCase().includes('reembolso') ||
        t.subcategoria?.toLowerCase().includes('reembolso') ||
        t.comentario?.toLowerCase().includes('reembolso')
      )
      .reduce((sum, t) => sum + (t.ingreso || 0), 0);
    
    // Cálculos del año anterior (para comparativo)
    const ingresosAnioAnterior = lastYearTransactions
      .filter(t => t.tipo === 'Ingreso' && 
        t.categoria !== 'Compra Venta Inmuebles' &&
        !t.categoria?.toLowerCase().includes('reembolso') &&
        !t.subcategoria?.toLowerCase().includes('reembolso') &&
        !t.comentario?.toLowerCase().includes('reembolso')
      )
      .reduce((sum, t) => sum + t.ingreso, 0);
    const gastosAnioAnterior = lastYearTransactions
      .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
      .reduce((sum, t) => sum + t.gasto, 0);
    
    const gastosAjustadosAnioAnterior = gastosAnioAnterior - reembolsosAnioAnterior;
    
    // Generar datos de tendencia mensual para la moneda seleccionada (últimos 12 meses excluyendo mes actual)
    const tendenciaMensual = [];
    for (let i = 12; i >= 1; i--) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() - i;
      
      // Crear fecha correcta manejando cambios de año
      const targetDate = new Date(year, month, 1);
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      
      const monthTrans = filteredTransactions.filter(t => {
        const tDate = new Date(t.fecha);
        return tDate.getMonth() === targetDate.getMonth() && tDate.getFullYear() === targetDate.getFullYear();
      });
      
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const mesLabel = `${monthNames[targetDate.getMonth()]} ${targetDate.getFullYear().toString().slice(-2)}`;
      
      // Calcular reembolsos primero
      const reembolsos = monthTrans
        .filter(t => 
          t.tipo === 'Reembolso' || 
          t.categoria?.toLowerCase().includes('reembolso') ||
          t.subcategoria?.toLowerCase().includes('reembolso') ||
          t.comentario?.toLowerCase().includes('reembolso')
        )
        .reduce((sum, t) => sum + (t.ingreso || 0), 0);
      
      // Ingresos (excluyendo reembolsos)
      const ingresos = monthTrans
        .filter(t => t.tipo === 'Ingreso' && 
          t.categoria !== 'Compra Venta Inmuebles' &&
          !t.categoria?.toLowerCase().includes('reembolso') &&
          !t.subcategoria?.toLowerCase().includes('reembolso') &&
          !t.comentario?.toLowerCase().includes('reembolso')
        )
        .reduce((sum, t) => sum + t.ingreso, 0);
      
      // Gastos (solo se restan reembolsos de los gastos)
      const gastosBrutos = Math.abs(monthTrans
        .filter(t => t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles')
        .reduce((sum, t) => sum + t.gasto, 0));
      
      const gastosAjustados = gastosBrutos - reembolsos;
      
      tendenciaMensual.push({
        mes: mesLabel,
        ingresos: ingresos,
        gastos: gastosAjustados,
        balance: ingresos - gastosAjustados
      });
    }
    
    // Calcular medias
    const avgIngresos = tendenciaMensual.length > 0 
      ? tendenciaMensual.reduce((sum, m) => sum + m.ingresos, 0) / tendenciaMensual.length 
      : 0;
    const avgGastos = tendenciaMensual.length > 0 
      ? tendenciaMensual.reduce((sum, m) => sum + m.gastos, 0) / tendenciaMensual.length 
      : 0;
    
    return {
      // Datos del mes (ingresos sin ajustar porque ya excluyen reembolsos, gastos ajustados)
      ingresosMes: ingresosMes,
      gastosMes: gastosAjustadosMes,
      balanceMes: ingresosMes - gastosAjustadosMes,
      
      // Datos del año (ingresos sin ajustar, gastos ajustados)
      ingresosAnio: ingresosAnio,
      gastosAnio: gastosAjustadosAnio,
      balanceAnio: ingresosAnio - gastosAjustadosAnio,
      
      // Comparativos
      cambioIngresosMes: ingresosMesAnterior > 0 ? ((ingresosMes - ingresosMesAnterior) / ingresosMesAnterior) * 100 : 0,
      cambioGastosMes: gastosAjustadosMesAnterior > 0 ? ((gastosAjustadosMes - gastosAjustadosMesAnterior) / gastosAjustadosMesAnterior) * 100 : 0,
      cambioIngresosAnio: ingresosAnioAnterior > 0 ? ((ingresosAnio - ingresosAnioAnterior) / ingresosAnioAnterior) * 100 : 0,
      cambioGastosAnio: gastosAjustadosAnioAnterior > 0 ? ((gastosAjustadosAnio - gastosAjustadosAnioAnterior) / gastosAjustadosAnioAnterior) * 100 : 0,
      
      // Comparativos de balance
      balanceMesAnterior: ingresosMesAnterior - gastosAjustadosMesAnterior,
      balanceAnioAnterior: ingresosAnioAnterior - gastosAjustadosAnioAnterior,
      
      tendenciaMensual,
      avgIngresos,
      avgGastos
    };
  };

  const filteredMetrics = getFilteredMetrics(selectedCurrency);

  const getBalanceColor = (amount: number) => {
    if (amount > 0) return 'text-success';
    if (amount < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const COLORS = [
    '#3B82F6', // Azul brillante
    '#10B981', // Verde esmeralda
    '#F59E0B', // Ámbar/Dorado
    '#EF4444', // Rojo vibrante
    '#8B5CF6', // Púrpura
    '#06B6D4', // Cyan
    '#84CC16', // Lima
    '#F97316', // Naranja
    '#EC4899', // Rosa
    '#6366F1', // Índigo
  ];

  // Función para obtener distribución por categorías filtrada por moneda - USA SELECTORES
  const getFilteredDistribution = (currency: 'MXN' | 'USD' | 'EUR', type: 'Ingreso' | 'Gastos', period: 'month' | 'year') => {
    // Filtrar transacciones por divisa y tipo
    const transactionsByType = transactions.filter(t => 
      t.divisa === currency && t.tipo === type
    );
    
    let filteredByPeriod;
    
    if (period === 'month') {
      // Usar mes seleccionado
      filteredByPeriod = transactionsByType.filter(t => {
        const tDate = new Date(t.fecha);
        return tDate.getMonth() === selectedMonth && tDate.getFullYear() === selectedMonthYear;
      });
    } else {
      // Usar año seleccionado
      filteredByPeriod = transactionsByType.filter(t => {
        const tDate = new Date(t.fecha);
        return tDate.getFullYear() === selectedYear;
      });
    }
    
    // Agrupar por categoría
    const categoryTotals: Record<string, number> = {};
    filteredByPeriod.forEach(t => {
      const categoria = t.categoria || 'Sin categoría';
      const amount = type === 'Ingreso' ? t.ingreso : t.gasto;
      categoryTotals[categoria] = (categoryTotals[categoria] || 0) + Math.abs(amount);
    });

    // Convertir a array y ordenar
    return Object.entries(categoryTotals)
      .map(([categoria, monto], index) => ({
        name: categoria,
        value: monto,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  };

  // Función para obtener Top 10 categorías con subcategorías de los últimos 12 meses
  const getTop10CategoriesWithSubcategories = (currency: 'MXN' | 'USD' | 'EUR') => {
    const now = new Date();
    
    // Generar array de últimos 12 meses (excluyendo mes actual)
    const last12Months: Array<{ month: number; year: number; label: string }> = [];
    for (let i = 12; i >= 1; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      last12Months.push({
        month: targetDate.getMonth(),
        year: targetDate.getFullYear(),
        label: `${monthNames[targetDate.getMonth()]} ${targetDate.getFullYear().toString().slice(-2)}`
      });
    }
    
    // Filtrar transacciones por divisa y tipo Gastos
    let filteredTrans = transactions.filter(t => 
      t.divisa === currency && t.tipo === 'Gastos' && t.categoria !== 'Compra Venta Inmuebles'
    );
    
    // Si hay mes seleccionado, filtrar por ese mes específico
    if (selectedCategoryMonth !== null) {
      const targetMonthData = last12Months[selectedCategoryMonth];
      filteredTrans = filteredTrans.filter(t => {
        const tDate = new Date(t.fecha);
        return tDate.getMonth() === targetMonthData.month && tDate.getFullYear() === targetMonthData.year;
      });
    } else {
      // Filtrar por últimos 12 meses
      filteredTrans = filteredTrans.filter(t => {
        const tDate = new Date(t.fecha);
        return last12Months.some(m => m.month === tDate.getMonth() && m.year === tDate.getFullYear());
      });
    }
    
    // Agrupar por categoría y subcategoría
    const categoryData: Record<string, { total: number; subcategories: Record<string, number> }> = {};
    
    filteredTrans.forEach(t => {
      const categoria = t.categoria || 'Sin categoría';
      const subcategoria = t.subcategoria || 'Sin subcategoría';
      const amount = Math.abs(t.gasto);
      
      if (!categoryData[categoria]) {
        categoryData[categoria] = { total: 0, subcategories: {} };
      }
      categoryData[categoria].total += amount;
      categoryData[categoria].subcategories[subcategoria] = (categoryData[categoria].subcategories[subcategoria] || 0) + amount;
    });
    
    // Convertir a array, ordenar y tomar top 10
    const sortedCategories = Object.entries(categoryData)
      .map(([name, data], index) => ({
        name,
        total: data.total,
        subcategories: Object.entries(data.subcategories)
          .map(([subName, subTotal]) => ({ name: subName, total: subTotal }))
          .sort((a, b) => b.total - a.total),
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    
    return { categories: sortedCategories, months: last12Months };
  };

  const top10Data = getTop10CategoriesWithSubcategories(selectedCurrency);

  // Preparar datos para gráficos filtrados por moneda seleccionada
  const pieDataGastosMesAnterior = getFilteredDistribution(selectedCurrency, 'Gastos', 'month');
  const pieDataGastosAnual = getFilteredDistribution(selectedCurrency, 'Gastos', 'year');
  const pieDataIngresosMesAnterior = getFilteredDistribution(selectedCurrency, 'Ingreso', 'month');
  const pieDataIngresosAnual = getFilteredDistribution(selectedCurrency, 'Ingreso', 'year');

  // Función para mostrar tendencia
  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-success" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return null;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-success';
    if (change < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  // Función para formatear moneda consistentemente
  const formatCurrencyConsistent = (amount: number, currency: string) => {
    return `${new Intl.NumberFormat('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(amount)} ${currency}`;
  };

  // Función para formatear totales sin decimales
  const formatCurrencyTotals = (amount: number, currency: string) => {
    return `${new Intl.NumberFormat('es-ES', {minimumFractionDigits: 0, maximumFractionDigits: 0}).format(amount)} ${currency}`;
  };

  // Calcular cambios en balance
  const cambioBalanceMes = filteredMetrics.balanceMesAnterior !== 0 ? 
    ((filteredMetrics.balanceMes - filteredMetrics.balanceMesAnterior) / Math.abs(filteredMetrics.balanceMesAnterior)) * 100 : 0;
  
  const cambioBalanceAnio = filteredMetrics.balanceAnioAnterior !== 0 ? 
    ((filteredMetrics.balanceAnio - filteredMetrics.balanceAnioAnterior) / Math.abs(filteredMetrics.balanceAnioAnterior)) * 100 : 0;


  const getSaludColor = (nivel: string) => {
    switch (nivel) {
      case 'Excelente': return 'text-success';
      case 'Buena': return 'text-primary';
      case 'Regular': return 'text-warning';
      case 'Mejorable': return 'text-destructive';
      case 'Crítica': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getFinancialAdvice = (nivel: string, score: number) => {
    switch (nivel) {
      case 'Excelente':
        return t('dashboard.advice.excellent');
      case 'Buena':
        return t('dashboard.advice.good');
      case 'Regular':
        return t('dashboard.advice.regular');
      case 'Mejorable':
        return t('dashboard.advice.improvable');
      case 'Crítica':
        return t('dashboard.advice.critical');
      default:
        return t('dashboard.advice.default');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* SELECTOR DE MONEDA */}
      <div className="flex justify-center">
        <div className="flex rounded-lg bg-muted p-1">
          {(['MXN', 'USD', 'EUR'] as const).map((currency) => (
            <Button
              key={currency}
              variant={selectedCurrency === currency ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedCurrency(currency)}
              className="px-4 py-2"
            >
              {currency}
            </Button>
          ))}
        </div>
      </div>

      {/* 1. GRÁFICA DE INGRESOS VS GASTOS - ÚLTIMOS 12 MESES CON MEDIAS */}
      <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-center">{t('dashboard.income_vs_expenses')} - Últimos 12 Meses <strong>{selectedCurrency}</strong></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={filteredMetrics.tendenciaMensual}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={false}
                  className="text-muted-foreground"
                  width={0}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    formatCurrencyConsistent(Number(value), selectedCurrency), 
                    name === 'ingresos' ? t('transactions.income') : name === 'gastos' ? t('transactions.expense') : 'Balance'
                  ]}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar 
                  dataKey="ingresos" 
                  fill="hsl(var(--success))" 
                  radius={[2, 2, 0, 0]}
                  name="ingresos"
                />
                <Bar 
                  dataKey="gastos" 
                  fill="hsl(var(--destructive))" 
                  radius={[2, 2, 0, 0]}
                  name="gastos"
                />
                <Line 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  name="Balance"
                />
                {/* Líneas de media */}
                <ReferenceLine 
                  y={filteredMetrics.avgIngresos} 
                  stroke="hsl(var(--success))" 
                  strokeDasharray="5 5" 
                  strokeWidth={2}
                  label={{ value: `Media: ${formatCurrencyTotals(filteredMetrics.avgIngresos, selectedCurrency)}`, position: 'insideTopRight', fill: 'hsl(var(--success))', fontSize: 11 }}
                />
                <ReferenceLine 
                  y={filteredMetrics.avgGastos} 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="5 5" 
                  strokeWidth={2}
                  label={{ value: `Media: ${formatCurrencyTotals(filteredMetrics.avgGastos, selectedCurrency)}`, position: 'insideBottomRight', fill: 'hsl(var(--destructive))', fontSize: 11 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--success))' }}></div>
              <span>{t('transactions.income')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--destructive))' }}></div>
              <span>{t('transactions.expense')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 rounded" style={{ backgroundColor: 'hsl(var(--success))', opacity: 0.7 }}></div>
              <span className="text-xs">Media Ingresos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 rounded" style={{ backgroundColor: 'hsl(var(--destructive))', opacity: 0.7 }}></div>
              <span className="text-xs">Media Gastos</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. TOP 10 CATEGORÍAS - ÚLTIMOS 12 MESES */}
      <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <CardTitle className="text-center">Top 10 Categorías de Gastos</CardTitle>
            {/* Selector visual de meses */}
            <div className="flex flex-wrap justify-center items-center gap-2">
              <Button
                variant={selectedCategoryMonth === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategoryMonth(null)}
                className="text-xs"
              >
                Todos (12 meses)
              </Button>
              {top10Data.months.map((month, index) => (
                <Button
                  key={`${month.year}-${month.month}`}
                  variant={selectedCategoryMonth === index ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategoryMonth(index)}
                  className="text-xs px-2"
                >
                  {month.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {top10Data.categories.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No hay gastos en el período seleccionado
            </div>
          ) : (
            <div className="space-y-2">
              {top10Data.categories.map((category, index) => (
                <Collapsible 
                  key={category.name}
                  open={openCollapsibles[`cat-${category.name}`]}
                  onOpenChange={() => toggleCollapsible(`cat-${category.name}`)}
                >
                  <div className="rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-3 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="font-medium text-sm">{category.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {category.subcategories.length} subcategorías
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-destructive">
                            {formatCurrencyConsistent(category.total, selectedCurrency)}
                          </span>
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-1">
                        <div className="pl-6 space-y-1 border-l-2 border-muted">
                          {category.subcategories.map((sub) => (
                            <div key={sub.name} className="flex justify-between items-center text-sm py-1">
                              <span className="text-muted-foreground">• {sub.name}</span>
                              <span className="font-medium">{formatCurrencyConsistent(sub.total, selectedCurrency)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. SALUD FINANCIERA */}
      <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              💪 {t('dashboard.financial_health')}
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className={`text-3xl font-bold ${getSaludColor(metrics.saludFinanciera.nivel)}`}>
                {metrics.saludFinanciera.score}
              </span>
              <Badge variant={metrics.saludFinanciera.nivel === 'Excelente' ? 'default' : 
                            metrics.saludFinanciera.nivel === 'Buena' ? 'secondary' : 'destructive'}>
                {metrics.saludFinanciera.nivel}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="financial-health-details" className="border-none">
              <AccordionTrigger className="hover:no-underline py-2">
                <span className="text-sm text-muted-foreground">Ver análisis detallado</span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">{metrics.saludFinanciera.descripcion}</p>
                
                {/* Desglose de factores */}
                {metrics.saludFinanciera.detalles && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Factores Ponderados
                    </h4>
                    
                    {/* Liquidez */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">💧 Liquidez ({metrics.saludFinanciera.detalles.liquidez.mesesCobertura} meses de gastos)</span>
                        <span className="font-medium">{metrics.saludFinanciera.detalles.liquidez.puntos}/{metrics.saludFinanciera.detalles.liquidez.maxPuntos}</span>
                      </div>
                      <Progress value={(metrics.saludFinanciera.detalles.liquidez.puntos / metrics.saludFinanciera.detalles.liquidez.maxPuntos) * 100} />
                    </div>

                    {/* Ahorro */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">💰 Ahorro ({metrics.saludFinanciera.detalles.ahorro.porcentaje}% del objetivo)</span>
                        <span className="font-medium">{metrics.saludFinanciera.detalles.ahorro.puntos}/{metrics.saludFinanciera.detalles.ahorro.maxPuntos}</span>
                      </div>
                      <Progress value={(metrics.saludFinanciera.detalles.ahorro.puntos / metrics.saludFinanciera.detalles.ahorro.maxPuntos) * 100} className="[&>div]:bg-success" />
                    </div>

                    {/* Endeudamiento */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">📊 Endeudamiento ({metrics.saludFinanciera.detalles.endeudamiento.porcentaje}% deuda)</span>
                        <span className="font-medium">{metrics.saludFinanciera.detalles.endeudamiento.puntos}/{metrics.saludFinanciera.detalles.endeudamiento.maxPuntos}</span>
                      </div>
                      <Progress value={(metrics.saludFinanciera.detalles.endeudamiento.puntos / metrics.saludFinanciera.detalles.endeudamiento.maxPuntos) * 100} className="[&>div]:bg-warning" />
                    </div>

                    {/* Rendimiento Inversiones */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">📈 Rendimiento ({metrics.saludFinanciera.detalles.rendimientoInversiones.porcentaje}% anual)</span>
                        <span className="font-medium">{metrics.saludFinanciera.detalles.rendimientoInversiones.puntos}/{metrics.saludFinanciera.detalles.rendimientoInversiones.maxPuntos}</span>
                      </div>
                      <Progress value={(metrics.saludFinanciera.detalles.rendimientoInversiones.puntos / metrics.saludFinanciera.detalles.rendimientoInversiones.maxPuntos) * 100} className="[&>div]:bg-accent" />
                    </div>

                    {/* Diversificación */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">🎯 Diversificación ({metrics.saludFinanciera.detalles.diversificacion.tiposActivos.length} tipos)</span>
                        <span className="font-medium">{metrics.saludFinanciera.detalles.diversificacion.puntos}/{metrics.saludFinanciera.detalles.diversificacion.maxPuntos}</span>
                      </div>
                      <Progress value={(metrics.saludFinanciera.detalles.diversificacion.puntos / metrics.saludFinanciera.detalles.diversificacion.maxPuntos) * 100} className="[&>div]:bg-secondary" />
                    </div>
                  </div>
                )}
                
                {/* Comparativa con promedios de referencia */}
                <div className="p-3 bg-muted/30 border border-muted rounded-lg">
                  <h4 className="text-sm font-semibold text-foreground mb-2">📊 Referencias Recomendadas</h4>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>• <strong>Liquidez:</strong> 3-6 meses de gastos (ideal)</p>
                    <p>• <strong>Ahorro:</strong> 20-30% de ingresos mensuales</p>
                    <p>• <strong>Endeudamiento:</strong> Máximo 30% de activos</p>
                    <p>• <strong>Rendimiento:</strong> 7-10% anual (largo plazo)</p>
                    <p>• <strong>Diversificación:</strong> Mínimo 3 tipos de activos</p>
                  </div>
                </div>
                
                {/* Consejo financiero */}
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <h4 className="text-sm font-semibold text-primary mb-2">💡 {t('dashboard.advice_title')}</h4>
                  <p className="text-xs text-muted-foreground">
                    {getFinancialAdvice(metrics.saludFinanciera.nivel, metrics.saludFinanciera.score)}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* 4. ACTIVOS */}
      <Card className="border-success/20 hover:border-success/40 transition-all duration-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-success">
              {t('dashboard.assets')}
            </CardTitle>
            <span className="text-2xl font-bold text-success">{formatCurrencyTotals(metrics.activos.total, 'MXN')}</span>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="assets-detail" className="border-success/20">
              <AccordionTrigger className="text-sm text-success hover:text-success/80 hover:no-underline">
                Ver desglose de activos
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {/* Total líquido */}
                  <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Líquido (excl. Bienes Raíces y Empresas)</span>
                      <span className="text-lg font-bold text-success">
                        {formatCurrencyTotals(metrics.activos.efectivoBancos + metrics.activos.inversiones, 'MXN')}
                      </span>
                    </div>
                  </div>
                  
                  {/* Mostrar categorías por moneda con cuentas individuales */}
                  {Object.entries(metrics.activosPorMoneda).map(([moneda, activos]) => {
                    const formatNumberOnly = (amount: number) => {
                      return new Intl.NumberFormat('es-MX', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(amount);
                    };

                    const hasAssets = activos.efectivoBancos > 0 || activos.inversiones > 0 || activos.bienRaiz > 0 || activos.empresasPrivadas > 0;
                    
                    if (!hasAssets) return null;

                    const cuentasEfectivo = accounts.filter(cuenta => 
                      ['Efectivo', 'Banco', 'Ahorros', 'Líquido'].includes(cuenta.tipo) && 
                      cuenta.divisa === moneda && 
                      cuenta.vendida !== true &&
                      cuenta.saldoActual > 0
                    );

                    const cuentasInversion = accounts.filter(cuenta => 
                      cuenta.tipo === 'Inversiones' && 
                      cuenta.divisa === moneda && 
                      cuenta.vendida !== true &&
                      cuenta.saldoActual > 0
                    );

                    const cuentasEmpresas = accounts.filter(cuenta => 
                      cuenta.tipo === 'Empresa Propia' && 
                      cuenta.divisa === moneda && 
                      cuenta.vendida !== true &&
                      cuenta.saldoActual > 0
                    );

                    const cuentasBienRaiz = accounts.filter(cuenta => 
                      cuenta.tipo === 'Bien Raíz' && 
                      cuenta.divisa === moneda && 
                      cuenta.vendida !== true &&
                      cuenta.saldoActual > 0
                    );

                    return (
                      <div key={moneda} className="space-y-3">
                        {/* Efectivo/Bancos */}
                        {activos.efectivoBancos > 0 && (
                          <Collapsible 
                            className="rounded-lg bg-success/5 border border-success/20"
                            open={openCollapsibles[`efectivo-${moneda}`]}
                            onOpenChange={() => toggleCollapsible(`efectivo-${moneda}`)}
                          >
                            <div className="p-4">
                              <CollapsibleTrigger className="w-full group">
                                <div className="flex justify-between items-center cursor-pointer">
                                  <div className="flex items-center gap-2">
                                    <ChevronDown className="h-4 w-4 text-success transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                    <span className="text-sm font-semibold text-muted-foreground">{t('dashboard.cash_banks')}</span>
                                  </div>
                                  <span className="font-bold text-success">{formatNumberOnly(activos.efectivoBancos)} {moneda}</span>
                                </div>
                              </CollapsibleTrigger>
                              {cuentasEfectivo.length > 0 && (
                                <CollapsibleContent className="mt-3">
                                  <div className="space-y-2 pl-3 border-l-2 border-success/30">
                                    {cuentasEfectivo.map(cuenta => (
                                      <div key={cuenta.id} className="flex justify-between items-center text-xs py-1">
                                        <span className="text-muted-foreground">• {cuenta.nombre}</span>
                                        <span className="font-medium text-success">{formatNumberOnly(cuenta.saldoActual)} {moneda}</span>
                                      </div>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              )}
                            </div>
                          </Collapsible>
                        )}
                        
                        {/* Inversiones */}
                        {activos.inversiones > 0 && (
                          <Collapsible 
                            className="rounded-lg bg-primary/5 border border-primary/20"
                            open={openCollapsibles[`inversiones-${moneda}`]}
                            onOpenChange={() => toggleCollapsible(`inversiones-${moneda}`)}
                          >
                            <div className="p-4">
                              <CollapsibleTrigger className="w-full group">
                                <div className="flex justify-between items-center cursor-pointer">
                                  <div className="flex items-center gap-2">
                                    <ChevronDown className="h-4 w-4 text-primary transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                    <span className="text-sm font-semibold text-muted-foreground">{t('dashboard.investments_label')}</span>
                                  </div>
                                  <span className="font-bold text-primary">{formatNumberOnly(activos.inversiones)} {moneda}</span>
                                </div>
                              </CollapsibleTrigger>
                              {cuentasInversion.length > 0 && (
                                <CollapsibleContent className="mt-3">
                                  <div className="space-y-2 pl-3 border-l-2 border-primary/30">
                                    {cuentasInversion.map(cuenta => (
                                      <div key={cuenta.id} className="flex justify-between items-center text-xs py-1">
                                        <span className="text-muted-foreground">• {cuenta.nombre}</span>
                                        <span className="font-medium text-primary">{formatNumberOnly(cuenta.saldoActual)} {moneda}</span>
                                      </div>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              )}
                            </div>
                          </Collapsible>
                        )}

                        {/* Empresas Privadas */}
                        {activos.empresasPrivadas > 0 && (
                          <Collapsible 
                            className="rounded-lg bg-accent/5 border border-accent/20"
                            open={openCollapsibles[`empresas-${moneda}`]}
                            onOpenChange={() => toggleCollapsible(`empresas-${moneda}`)}
                          >
                            <div className="p-4">
                              <CollapsibleTrigger className="w-full group">
                                <div className="flex justify-between items-center cursor-pointer">
                                  <div className="flex items-center gap-2">
                                    <ChevronDown className="h-4 w-4 text-primary transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                    <span className="text-sm font-semibold text-muted-foreground">Empresas Privadas</span>
                                  </div>
                                  <span className="font-bold text-primary">{formatNumberOnly(activos.empresasPrivadas)} {moneda}</span>
                                </div>
                              </CollapsibleTrigger>
                              {cuentasEmpresas.length > 0 && (
                                <CollapsibleContent className="mt-3">
                                  <div className="space-y-2 pl-3 border-l-2 border-accent/30">
                                    {cuentasEmpresas.map(cuenta => (
                                      <div key={cuenta.id} className="flex justify-between items-center text-xs py-1">
                                        <span className="text-muted-foreground">• {cuenta.nombre}</span>
                                        <span className="font-medium text-primary">{formatNumberOnly(cuenta.saldoActual)} {moneda}</span>
                                      </div>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              )}
                            </div>
                          </Collapsible>
                        )}
                        
                        {/* Bienes Raíces */}
                        {activos.bienRaiz > 0 && (
                          <Collapsible 
                            className="rounded-lg bg-warning/5 border border-warning/20"
                            open={openCollapsibles[`bienraiz-${moneda}`]}
                            onOpenChange={() => toggleCollapsible(`bienraiz-${moneda}`)}
                          >
                            <div className="p-4">
                              <CollapsibleTrigger className="w-full group">
                                <div className="flex justify-between items-center cursor-pointer">
                                  <div className="flex items-center gap-2">
                                    <ChevronDown className="h-4 w-4 text-warning transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                    <span className="text-sm font-semibold text-muted-foreground">Bienes Raíces</span>
                                  </div>
                                  <span className="font-bold text-warning">{formatNumberOnly(activos.bienRaiz)} {moneda}</span>
                                </div>
                              </CollapsibleTrigger>
                              {cuentasBienRaiz.length > 0 && (
                                <CollapsibleContent className="mt-3">
                                  <div className="space-y-2 pl-3 border-l-2 border-warning/30">
                                    {cuentasBienRaiz.map(cuenta => (
                                      <div key={cuenta.id} className="flex justify-between items-center text-xs py-1">
                                        <span className="text-muted-foreground">• {cuenta.nombre}</span>
                                        <span className="font-medium text-warning">{formatNumberOnly(cuenta.saldoActual)} {moneda}</span>
                                      </div>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              )}
                            </div>
                          </Collapsible>
                        )}
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* 5. PASIVOS */}
      <Card className="border-destructive/20 hover:border-destructive/40 transition-all duration-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-destructive">
              {t('dashboard.liabilities')}
            </CardTitle>
            <span className="text-2xl font-bold text-destructive">{formatCurrencyTotals(metrics.pasivos.total, 'MXN')}</span>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="liabilities-detail" className="border-destructive/20">
              <AccordionTrigger className="text-sm text-destructive hover:text-destructive/80 hover:no-underline">
                Ver desglose de pasivos
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {/* Patrimonio neto */}
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-muted-foreground">Patrimonio Neto</span>
                      <span className={`text-lg font-bold ${getBalanceColor(metrics.activos.total - metrics.pasivos.total)}`}>
                        {formatCurrencyTotals(metrics.activos.total - metrics.pasivos.total, 'MXN')}
                      </span>
                    </div>
                  </div>

                  {/* Mostrar pasivos por moneda */}
                  {Object.entries(metrics.pasivosPorMoneda).map(([moneda, pasivos]) => {
                    const formatNumberOnly = (amount: number) => {
                      return new Intl.NumberFormat('es-MX', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(Math.abs(amount));
                    };

                    const hasLiabilities = pasivos.tarjetasCredito > 0 || pasivos.hipoteca > 0;
                    
                    if (!hasLiabilities) return null;

                    const cuentasTarjetas = accounts.filter(cuenta => 
                      cuenta.tipo === 'Tarjeta de Crédito' && 
                      cuenta.divisa === moneda && 
                      cuenta.saldoActual < 0
                    );

                    const cuentasHipoteca = accounts.filter(cuenta => 
                      cuenta.tipo === 'Hipoteca' && 
                      cuenta.divisa === moneda && 
                      cuenta.saldoActual < 0
                    );

                    return (
                      <div key={moneda} className="space-y-3">
                        {/* Tarjetas de Crédito */}
                        {pasivos.tarjetasCredito > 0 && (
                          <Collapsible 
                            className="rounded-lg bg-destructive/5 border border-destructive/20"
                            open={openCollapsibles[`tarjetas-${moneda}`]}
                            onOpenChange={() => toggleCollapsible(`tarjetas-${moneda}`)}
                          >
                            <div className="p-4">
                              <CollapsibleTrigger className="w-full group">
                                <div className="flex justify-between items-center cursor-pointer">
                                  <div className="flex items-center gap-2">
                                    <ChevronDown className="h-4 w-4 text-destructive transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                    <span className="text-sm font-semibold text-muted-foreground">{t('dashboard.credit_cards')}</span>
                                  </div>
                                  <span className="font-bold text-destructive">{formatNumberOnly(pasivos.tarjetasCredito)} {moneda}</span>
                                </div>
                              </CollapsibleTrigger>
                              {cuentasTarjetas.length > 0 && (
                                <CollapsibleContent className="mt-3">
                                  <div className="space-y-2 pl-3 border-l-2 border-destructive/30">
                                    {cuentasTarjetas.map(cuenta => (
                                      <div key={cuenta.id} className="flex justify-between items-center text-xs py-1">
                                        <span className="text-muted-foreground">• {cuenta.nombre}</span>
                                        <span className="font-medium text-destructive">{formatNumberOnly(cuenta.saldoActual)} {moneda}</span>
                                      </div>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              )}
                            </div>
                          </Collapsible>
                        )}
                        
                        {/* Hipotecas */}
                        {pasivos.hipoteca > 0 && (
                          <Collapsible 
                            className="rounded-lg bg-warning/5 border border-warning/20"
                            open={openCollapsibles[`hipoteca-${moneda}`]}
                            onOpenChange={() => toggleCollapsible(`hipoteca-${moneda}`)}
                          >
                            <div className="p-4">
                              <CollapsibleTrigger className="w-full group">
                                <div className="flex justify-between items-center cursor-pointer">
                                  <div className="flex items-center gap-2">
                                    <ChevronDown className="h-4 w-4 text-warning transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                    <span className="text-sm font-semibold text-muted-foreground">{t('dashboard.mortgage')}</span>
                                  </div>
                                  <span className="font-bold text-warning">{formatNumberOnly(pasivos.hipoteca)} {moneda}</span>
                                </div>
                              </CollapsibleTrigger>
                              {cuentasHipoteca.length > 0 && (
                                <CollapsibleContent className="mt-3">
                                  <div className="space-y-2 pl-3 border-l-2 border-warning/30">
                                    {cuentasHipoteca.map(cuenta => (
                                      <div key={cuenta.id} className="flex justify-between items-center text-xs py-1">
                                        <span className="text-muted-foreground">• {cuenta.nombre}</span>
                                        <span className="font-medium text-warning">{formatNumberOnly(cuenta.saldoActual)} {moneda}</span>
                                      </div>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              )}
                            </div>
                          </Collapsible>
                        )}
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

    </div>
  );
};