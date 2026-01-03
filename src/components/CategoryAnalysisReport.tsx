import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, ArrowRightLeft, ArrowDownCircle, Calendar, Filter } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

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
type PeriodType = 'month' | 'year' | 'range';

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1',
];

export const CategoryAnalysisReport = ({ transactions, categories, formatCurrency }: CategoryAnalysisReportProps) => {
  const now = new Date();
  
  // Estados para filtros
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(now.getMonth());
  const [selectedType, setSelectedType] = useState<TransactionTypeFilter>('Gastos');
  const [selectedCurrency, setSelectedCurrency] = useState<'MXN' | 'USD' | 'EUR'>('MXN');

  // Obtener años disponibles
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    transactions.forEach(t => {
      const year = new Date(t.fecha).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Meses
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

  // Datos para gráfica de barras mensual
  const monthlyData = useMemo(() => {
    if (selectedMonth !== 'all') return [];

    const monthTotals: Record<number, number> = {};
    
    filteredTransactions.forEach(t => {
      const month = new Date(t.fecha).getMonth();
      const amount = selectedType === 'Gastos' || selectedType === 'Retiro' ? t.gasto : t.ingreso;
      monthTotals[month] = (monthTotals[month] || 0) + amount;
    });

    return months.map(m => ({
      mes: m.label.slice(0, 3),
      total: monthTotals[m.value] || 0
    }));
  }, [filteredTransactions, selectedMonth, selectedType]);

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
          {/* Selectores de período */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Año</label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Mes</label>
              <Select 
                value={selectedMonth === 'all' ? 'all' : selectedMonth.toString()} 
                onValueChange={(v) => setSelectedMonth(v === 'all' ? 'all' : parseInt(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los meses</SelectItem>
                  {months.map(m => (
                    <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                  ))}
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

      {/* Contenido principal */}
      {categoryData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No hay transacciones para el período seleccionado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfica de pastel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribución por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [formatCurrencyValue(Number(value)), 'Monto']}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfica de barras (solo si es año completo) */}
          {selectedMonth === 'all' && monthlyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evolución Mensual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={false} width={0} />
                      <Tooltip 
                        formatter={(value: any) => [formatCurrencyValue(Number(value)), 'Total']}
                      />
                      <Bar 
                        dataKey="total" 
                        fill={selectedType === 'Gastos' ? 'hsl(var(--destructive))' : 
                              selectedType === 'Ingreso' ? 'hsl(var(--success))' :
                              selectedType === 'Aportación' ? 'hsl(var(--primary))' : 
                              'hsl(var(--warning))'}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista si solo hay un mes seleccionado */}
          {selectedMonth !== 'all' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Categorías</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryData.slice(0, 8).map((cat, index) => {
                    const percentage = totals.amount > 0 ? (cat.value / totals.amount) * 100 : 0;
                    return (
                      <div key={cat.name} className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: cat.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{cat.name}</p>
                          <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                            <div 
                              className="h-1.5 rounded-full" 
                              style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                            />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-medium">{formatCurrencyValue(cat.value)}</p>
                          <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Desglose detallado por categoría */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desglose por Categoría y Subcategoría</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {categoryData.map((cat, index) => {
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
                        {cat.subcategories.map((sub, subIndex) => {
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
