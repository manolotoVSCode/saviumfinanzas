import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Transaction, Category } from '@/types/finance';
import { formatNumber } from '@/lib/formatters';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MonthlyIncomeComparisonProps {
  transactions: Transaction[];
  categories: Category[];
  formatCurrency: (amount: number) => string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export const MonthlyIncomeComparison = ({ transactions, categories, formatCurrency }: MonthlyIncomeComparisonProps) => {
  const [monthsToShow, setMonthsToShow] = useState<string>('6');

  // Get income category IDs (excluding "Compra Venta Inmuebles")
  const incomeCategoryIds = useMemo(() => {
    return categories
      .filter(c => c.tipo === 'Ingreso' && c.categoria !== 'Compra Venta Inmuebles')
      .map(c => c.id);
  }, [categories]);

  // Build category lookup
  const categoryLookup = useMemo(() => {
    const map: Record<string, { categoria: string; subcategoria: string }> = {};
    categories.forEach(c => {
      map[c.id] = { categoria: c.categoria, subcategoria: c.subcategoria };
    });
    return map;
  }, [categories]);

  // Group income by month
  const monthlyData = useMemo(() => {
    const now = new Date();
    const count = parseInt(monthsToShow);
    const months: { year: number; month: number; label: string; shortLabel: string }[] = [];

    for (let i = count; i >= 1; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
        shortLabel: `${MONTH_SHORT[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`
      });
    }

    // Filter income transactions
    const incomeTransactions = transactions.filter(t =>
      t.ingreso > 0 && incomeCategoryIds.includes(t.subcategoriaId)
    );

    // Group by month
    const byMonth = months.map(m => {
      const monthTransactions = incomeTransactions.filter(t => {
        const d = new Date(t.fecha);
        return d.getFullYear() === m.year && d.getMonth() === m.month;
      });

      const total = monthTransactions.reduce((sum, t) => sum + t.ingreso, 0);

      // Group by category
      const byCategory: Record<string, number> = {};
      monthTransactions.forEach(t => {
        const cat = categoryLookup[t.subcategoriaId]?.subcategoria || 'Sin categoría';
        byCategory[cat] = (byCategory[cat] || 0) + t.ingreso;
      });

      return {
        ...m,
        total,
        byCategory,
        transactionCount: monthTransactions.length
      };
    });

    return byMonth;
  }, [transactions, incomeCategoryIds, categoryLookup, monthsToShow]);

  // Get all unique categories across months
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    monthlyData.forEach(m => {
      Object.keys(m.byCategory).forEach(c => cats.add(c));
    });
    return Array.from(cats).sort();
  }, [monthlyData]);

  // Calculate averages and trends
  const summary = useMemo(() => {
    const totals = monthlyData.map(m => m.total);
    const avg = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
    const max = Math.max(...totals);
    const min = Math.min(...totals);
    const maxMonth = monthlyData.find(m => m.total === max);
    const minMonth = monthlyData.find(m => m.total === min);

    // Trend: compare last month vs previous
    const lastTwo = totals.slice(-2);
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendPercent = 0;
    if (lastTwo.length === 2 && lastTwo[0] > 0) {
      trendPercent = ((lastTwo[1] - lastTwo[0]) / lastTwo[0]) * 100;
      trend = trendPercent > 1 ? 'up' : trendPercent < -1 ? 'down' : 'stable';
    }

    return { avg, max, min, maxMonth, minMonth, trend, trendPercent };
  }, [monthlyData]);

  const chartConfig = {
    total: { label: 'Ingresos', color: 'hsl(var(--primary))' }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Comparativo de Ingresos Mensuales</h2>
        <Select value={monthsToShow} onValueChange={setMonthsToShow}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Promedio Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${formatCurrency(summary.avg)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mejor Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">${formatCurrency(summary.max)}</p>
            <p className="text-xs text-muted-foreground">{summary.maxMonth?.label}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tendencia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {summary.trend === 'up' && <TrendingUp className="h-5 w-5 text-primary" />}
              {summary.trend === 'down' && <TrendingDown className="h-5 w-5 text-destructive" />}
              {summary.trend === 'stable' && <Minus className="h-5 w-5 text-muted-foreground" />}
              <p className={`text-2xl font-bold ${summary.trend === 'up' ? 'text-primary' : summary.trend === 'down' ? 'text-destructive' : ''}`}>
                {summary.trendPercent > 0 ? '+' : ''}{formatNumber(summary.trendPercent, 1)}%
              </p>
            </div>
            <p className="text-xs text-muted-foreground">vs mes anterior</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolución de Ingresos</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="shortLabel" className="text-xs" />
              <YAxis tickFormatter={(v) => `$${formatNumber(v, 0)}`} className="text-xs" />
              <ChartTooltip
                content={<ChartTooltipContent />}
                formatter={(value: number) => [`$${formatCurrency(value)}`, 'Ingresos']}
              />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Desglose por Subcategoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Subcategoría</TableHead>
                  {monthlyData.map(m => (
                    <TableHead key={m.label} className="text-right min-w-[110px]">{m.shortLabel}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {allCategories.map(cat => (
                  <TableRow key={cat}>
                    <TableCell className="font-medium">{cat}</TableCell>
                    {monthlyData.map(m => (
                      <TableCell key={m.label} className="text-right">
                        {m.byCategory[cat] ? `$${formatCurrency(m.byCategory[cat])}` : '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2">
                  <TableCell>Total</TableCell>
                  {monthlyData.map(m => (
                    <TableCell key={m.label} className="text-right">
                      ${formatCurrency(m.total)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
