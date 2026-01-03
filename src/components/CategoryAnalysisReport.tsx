import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TrendingUp, TrendingDown, ArrowRightLeft, ArrowDownCircle, Calendar, Filter, Sun, LayoutGrid, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { Treemap, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';

interface Transaction {
  id: string;
  fecha: Date;
  ingreso: number;
  gasto: number;
  tipo: string;
  categoria?: string;
  subcategoria?: string;
  comentario: string;
  divisa: string;
}

interface Category {
  id: string;
  categoria: string;
  subcategoria: string;
  tipo?: string;
}

interface CategoryAnalysisReportProps {
  transactions: Transaction[];
  categories: Category[];
  formatCurrency: (amount: number) => string;
}

type TransactionTypeFilter = 'Gastos' | 'Ingreso' | 'Aportación' | 'Retiro' | 'all';
type ChartType = 'sunburst' | 'treemap' | 'stacked';

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1',
  '#14B8A6', '#A855F7', '#F43F5E', '#22C55E', '#0EA5E9',
];

export const CategoryAnalysisReport = ({ transactions, categories, formatCurrency }: CategoryAnalysisReportProps) => {
  const now = new Date();
  
  // Estados para filtros
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(now.getMonth());
  const [selectedType, setSelectedType] = useState<TransactionTypeFilter>('Gastos');
  const [selectedCurrency, setSelectedCurrency] = useState<'MXN' | 'USD' | 'EUR'>('MXN');
  const [chartType, setChartType] = useState<ChartType>('sunburst');

  // Obtener años disponibles
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    transactions.forEach(t => {
      const year = new Date(t.fecha).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Meses con abreviaturas
  const months = [
    { value: 0, label: 'Enero', short: 'Ene' },
    { value: 1, label: 'Febrero', short: 'Feb' },
    { value: 2, label: 'Marzo', short: 'Mar' },
    { value: 3, label: 'Abril', short: 'Abr' },
    { value: 4, label: 'Mayo', short: 'May' },
    { value: 5, label: 'Junio', short: 'Jun' },
    { value: 6, label: 'Julio', short: 'Jul' },
    { value: 7, label: 'Agosto', short: 'Ago' },
    { value: 8, label: 'Septiembre', short: 'Sep' },
    { value: 9, label: 'Octubre', short: 'Oct' },
    { value: 10, label: 'Noviembre', short: 'Nov' },
    { value: 11, label: 'Diciembre', short: 'Dic' },
  ];

  // Navegación de año
  const handlePrevYear = useCallback(() => {
    const idx = availableYears.indexOf(selectedYear);
    if (idx < availableYears.length - 1) {
      setSelectedYear(availableYears[idx + 1]);
    }
  }, [availableYears, selectedYear]);

  const handleNextYear = useCallback(() => {
    const idx = availableYears.indexOf(selectedYear);
    if (idx > 0) {
      setSelectedYear(availableYears[idx - 1]);
    }
  }, [availableYears, selectedYear]);

  // Verificar qué meses tienen datos
  const monthsWithData = useMemo(() => {
    const monthSet = new Set<number>();
    transactions.forEach(t => {
      const tDate = new Date(t.fecha);
      if (tDate.getFullYear() === selectedYear && t.divisa === selectedCurrency) {
        monthSet.add(tDate.getMonth());
      }
    });
    return monthSet;
  }, [transactions, selectedYear, selectedCurrency]);

  // Filtrar transacciones según selección
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.fecha);
      const matchesYear = tDate.getFullYear() === selectedYear;
      const matchesMonth = selectedMonth === 'all' || tDate.getMonth() === selectedMonth;
      const matchesCurrency = t.divisa === selectedCurrency;
      
      let matchesType = true;
      if (selectedType !== 'all') {
        matchesType = t.tipo === selectedType;
      }
      
      return matchesYear && matchesMonth && matchesCurrency && matchesType;
    });
  }, [transactions, selectedYear, selectedMonth, selectedCurrency, selectedType]);

  // Agrupar por categoría
  const categoryData = useMemo(() => {
    const byCategory: Record<string, { 
      total: number; 
      subcategories: Record<string, number>;
      count: number;
    }> = {};

    filteredTransactions.forEach(t => {
      const categoria = t.categoria || 'Sin categoría';
      const subcategoria = t.subcategoria || 'Sin subcategoría';
      const amount = selectedType === 'Gastos' || selectedType === 'Retiro' ? t.gasto : t.ingreso;

      if (!byCategory[categoria]) {
        byCategory[categoria] = { total: 0, subcategories: {}, count: 0 };
      }
      
      byCategory[categoria].total += amount;
      byCategory[categoria].count += 1;
      
      if (!byCategory[categoria].subcategories[subcategoria]) {
        byCategory[categoria].subcategories[subcategoria] = 0;
      }
      byCategory[categoria].subcategories[subcategoria] += amount;
    });

    return Object.entries(byCategory)
      .map(([name, data], index) => ({
        name,
        value: data.total,
        count: data.count,
        color: COLORS[index % COLORS.length],
        subcategories: Object.entries(data.subcategories)
          .map(([subName, subValue]) => ({ name: subName, value: subValue }))
          .sort((a, b) => b.value - a.value)
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions, selectedType]);

  // Totales
  const totals = useMemo(() => {
    return {
      amount: categoryData.reduce((sum, cat) => sum + cat.value, 0),
      count: categoryData.reduce((sum, cat) => sum + cat.count, 0),
    };
  }, [categoryData]);

  // Datos para gráfica de barras apiladas por mes
  const stackedBarData = useMemo(() => {
    const monthCategoryTotals: Record<number, Record<string, number>> = {};
    
    filteredTransactions.forEach(t => {
      const month = new Date(t.fecha).getMonth();
      const categoria = t.categoria || 'Sin categoría';
      const amount = selectedType === 'Gastos' || selectedType === 'Retiro' ? t.gasto : t.ingreso;
      
      if (!monthCategoryTotals[month]) monthCategoryTotals[month] = {};
      monthCategoryTotals[month][categoria] = (monthCategoryTotals[month][categoria] || 0) + amount;
    });

    return months.map(m => {
      const monthData: Record<string, any> = { mes: m.short };
      categoryData.forEach(cat => {
        monthData[cat.name] = monthCategoryTotals[m.value]?.[cat.name] || 0;
      });
      return monthData;
    });
  }, [filteredTransactions, categoryData, selectedType]);

  // Datos para Treemap (formato plano para evitar problemas con children)
  const treemapData = useMemo(() => {
    const data: { name: string; size: number; fill: string }[] = [];
    categoryData.forEach((cat, idx) => {
      cat.subcategories.forEach((sub, subIdx) => {
        data.push({
          name: `${cat.name} - ${sub.name}`,
          size: sub.value,
          fill: COLORS[(idx * 2 + subIdx) % COLORS.length],
        });
      });
    });
    return data;
  }, [categoryData]);

  // Datos para Sunburst (usamos Pie anidado)
  const sunburstInnerData = useMemo(() => categoryData, [categoryData]);
  const sunburstOuterData = useMemo(() => {
    const outer: { name: string; value: number; color: string; category: string }[] = [];
    categoryData.forEach((cat, idx) => {
      cat.subcategories.forEach((sub, subIdx) => {
        outer.push({
          name: sub.name,
          value: sub.value,
          color: COLORS[(idx * 3 + subIdx + 5) % COLORS.length],
          category: cat.name,
        });
      });
    });
    return outer;
  }, [categoryData]);

  const getTypeIcon = (type: TransactionTypeFilter) => {
    switch (type) {
      case 'Gastos': return <TrendingDown className="h-4 w-4" />;
      case 'Ingreso': return <TrendingUp className="h-4 w-4" />;
      case 'Aportación': return <ArrowDownCircle className="h-4 w-4" />;
      case 'Retiro': return <ArrowRightLeft className="h-4 w-4" />;
      default: return <Filter className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: TransactionTypeFilter) => {
    switch (type) {
      case 'Gastos': return 'text-destructive';
      case 'Ingreso': return 'text-success';
      case 'Aportación': return 'text-primary';
      case 'Retiro': return 'text-warning';
      default: return 'text-foreground';
    }
  };

  const formatCurrencyValue = (amount: number) => {
    return `${new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)} ${selectedCurrency}`;
  };

  const getPeriodLabel = () => {
    if (selectedMonth === 'all') {
      return `Año ${selectedYear}`;
    }
    return `${months[selectedMonth as number].label} ${selectedYear}`;
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Análisis por Categorías
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector visual de año */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">Año</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 flex-shrink-0"
                onClick={handlePrevYear}
                disabled={availableYears.indexOf(selectedYear) >= availableYears.length - 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex gap-1 flex-wrap justify-center flex-1">
                {availableYears.slice(0, 5).map(year => (
                  <Button
                    key={year}
                    variant={selectedYear === year ? 'default' : 'outline'}
                    size="sm"
                    className="min-w-[60px]"
                    onClick={() => setSelectedYear(year)}
                  >
                    {year}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 flex-shrink-0"
                onClick={handleNextYear}
                disabled={availableYears.indexOf(selectedYear) <= 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Selector visual de mes */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">Mes</label>
            <div className="flex flex-wrap gap-1 justify-center">
              <Button
                variant={selectedMonth === 'all' ? 'default' : 'outline'}
                size="sm"
                className="min-w-[50px]"
                onClick={() => setSelectedMonth('all')}
              >
                Año
              </Button>
              {months.map(m => {
                const hasData = monthsWithData.has(m.value);
                return (
                  <Button
                    key={m.value}
                    variant={selectedMonth === m.value ? 'default' : 'outline'}
                    size="sm"
                    className={`min-w-[44px] ${!hasData ? 'opacity-40' : ''}`}
                    onClick={() => setSelectedMonth(m.value)}
                  >
                    {m.short}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Tipo y Moneda en una fila */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tipo</label>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as TransactionTypeFilter)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gastos">Gastos</SelectItem>
                  <SelectItem value="Ingreso">Ingresos</SelectItem>
                  <SelectItem value="Aportación">Aportaciones</SelectItem>
                  <SelectItem value="Retiro">Retiros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Moneda</label>
              <Select value={selectedCurrency} onValueChange={(v) => setSelectedCurrency(v as 'MXN' | 'USD' | 'EUR')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MXN">MXN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Resumen del período */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className={getTypeColor(selectedType)}>
                {getTypeIcon(selectedType)}
              </div>
              <div>
                <p className="text-sm font-medium">{getPeriodLabel()}</p>
                <p className="text-xs text-muted-foreground">{totals.count} transacciones</p>
              </div>
            </div>
            <div className={`text-2xl font-bold ${getTypeColor(selectedType)}`}>
              {formatCurrencyValue(totals.amount)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selector de tipo de gráfico */}
      {categoryData.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <span className="text-sm text-muted-foreground">Visualización:</span>
              <ToggleGroup type="single" value={chartType} onValueChange={(v) => v && setChartType(v as ChartType)}>
                <ToggleGroupItem value="sunburst" className="flex items-center gap-2 px-4">
                  <Sun className="h-4 w-4" />
                  <span className="hidden sm:inline">Gráfico de Sol</span>
                  <span className="sm:hidden">Sol</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="treemap" className="flex items-center gap-2 px-4">
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Mapa de Árbol</span>
                  <span className="sm:hidden">Árbol</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="stacked" className="flex items-center gap-2 px-4">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Barras Apiladas</span>
                  <span className="sm:hidden">Barras</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contenido principal - Gráficos */}
      {categoryData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No hay transacciones para el período seleccionado</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {chartType === 'sunburst' && 'Gráfico de Sol - Categorías y Subcategorías'}
              {chartType === 'treemap' && 'Mapa de Árbol - Distribución por Categoría'}
              {chartType === 'stacked' && 'Barras Apiladas - Evolución Mensual'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'sunburst' ? (
                  <RechartsPieChart>
                    {/* Círculo interior - Categorías */}
                    <Pie
                      data={sunburstInnerData}
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={70}
                      paddingAngle={1}
                      dataKey="value"
                    >
                      {sunburstInnerData.map((entry, index) => (
                        <Cell key={`inner-${index}`} fill={entry.color} stroke="hsl(var(--background))" strokeWidth={2} />
                      ))}
                    </Pie>
                    {/* Círculo exterior - Subcategorías */}
                    <Pie
                      data={sunburstOuterData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={130}
                      paddingAngle={0.5}
                      dataKey="value"
                    >
                      {sunburstOuterData.map((entry, index) => (
                        <Cell key={`outer-${index}`} fill={entry.color} stroke="hsl(var(--background))" strokeWidth={1} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any, name: any) => [formatCurrencyValue(Number(value)), name]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend 
                      formatter={(value) => <span className="text-xs">{value}</span>}
                      wrapperStyle={{ fontSize: '11px' }}
                    />
                  </RechartsPieChart>
                ) : chartType === 'treemap' ? (
                  <Treemap
                    data={treemapData}
                    dataKey="size"
                    aspectRatio={4/3}
                    stroke="hsl(var(--background))"
                    isAnimationActive={false}
                  >
                    {treemapData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                    <Tooltip 
                      formatter={(value: any, name: any) => [formatCurrencyValue(Number(value)), name]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </Treemap>
                ) : (
                  <BarChart data={stackedBarData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip 
                      formatter={(value: any, name: any) => [formatCurrencyValue(Number(value)), name]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend 
                      formatter={(value) => <span className="text-xs">{value}</span>}
                      wrapperStyle={{ fontSize: '10px' }}
                    />
                    {categoryData.slice(0, 8).map((cat, index) => (
                      <Bar 
                        key={cat.name}
                        dataKey={cat.name} 
                        stackId="a"
                        fill={cat.color}
                        radius={index === categoryData.slice(0, 8).length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leyenda de categorías */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryData.slice(0, 9).map((cat) => {
                const percentage = totals.amount > 0 ? (cat.value / totals.amount) * 100 : 0;
                return (
                  <div key={cat.name} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <div 
                      className="w-4 h-4 rounded flex-shrink-0" 
                      style={{ backgroundColor: cat.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                    </div>
                    <p className="text-sm font-bold">{formatCurrencyValue(cat.value)}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desglose detallado por categoría */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desglose por Categoría y Subcategoría</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {categoryData.map((cat) => {
                const percentage = totals.amount > 0 ? (cat.value / totals.amount) * 100 : 0;
                return (
                  <AccordionItem key={cat.name} value={cat.name}>
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 flex-1 mr-4">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-medium text-left flex-1">{cat.name}</span>
                        <Badge variant="outline" className="ml-2">{cat.count}</Badge>
                        <span className="font-bold">{formatCurrencyValue(cat.value)}</span>
                        <span className="text-xs text-muted-foreground w-12 text-right">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-6 space-y-2 pt-2">
                        {cat.subcategories.map((sub) => {
                          const subPercentage = cat.value > 0 ? (sub.value / cat.value) * 100 : 0;
                          return (
                            <div key={sub.name} className="flex items-center justify-between py-1 border-l-2 pl-3" style={{ borderColor: cat.color }}>
                              <span className="text-sm text-muted-foreground">{sub.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{formatCurrencyValue(sub.value)}</span>
                                <span className="text-xs text-muted-foreground w-10 text-right">
                                  {subPercentage.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
};