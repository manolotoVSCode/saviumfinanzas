import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Transaction, Category } from '@/types/finance';
import { formatNumber } from '@/lib/formatters';
import { useAppConfig } from '@/hooks/useAppConfig';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  categories: Category[];
  formatCurrency: (amount: number) => string;
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export const MonthlyExpenseComparison = ({ transactions, categories, formatCurrency }: Props) => {
  const { config } = useAppConfig();
  const [monthsToShow, setMonthsToShow] = useState<string>('6');
  const [selectedCurrency, setSelectedCurrency] = useState<string>(config.currency);
  const [currencyInitialized, setCurrencyInitialized] = useState(false);

  useEffect(() => {
    if (!currencyInitialized) {
      setSelectedCurrency(config.currency);
      setCurrencyInitialized(true);
    }
  }, [config.currency, currencyInitialized]);

  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>();
    transactions.forEach(t => {
      if (t.gasto > 0 && t.divisa) currencies.add(t.divisa);
    });
    return Array.from(currencies).sort();
  }, [transactions]);

  const expenseCategoryIds = useMemo(() => {
    return categories
      .filter(c => c.tipo === 'Gastos' && c.categoria !== 'Compra Venta Inmuebles')
      .map(c => c.id);
  }, [categories]);

  const categoryLookup = useMemo(() => {
    const map: Record<string, { categoria: string; subcategoria: string }> = {};
    categories.forEach(c => {
      map[c.id] = { categoria: c.categoria, subcategoria: c.subcategoria };
    });
    return map;
  }, [categories]);

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

    const expenseTx = transactions.filter(t =>
      t.gasto > 0 && expenseCategoryIds.includes(t.subcategoriaId) && t.divisa === selectedCurrency
    );

    return months.map(m => {
      const monthTx = expenseTx.filter(t => {
        const d = new Date(t.fecha);
        return d.getFullYear() === m.year && d.getMonth() === m.month;
      });
      const total = monthTx.reduce((sum, t) => sum + t.gasto, 0);
      const byCategory: Record<string, number> = {};
      monthTx.forEach(t => {
        const cat = categoryLookup[t.subcategoriaId]?.categoria || 'Sin categoría';
        byCategory[cat] = (byCategory[cat] || 0) + t.gasto;
      });
      return { ...m, total, byCategory, transactionCount: monthTx.length };
    });
  }, [transactions, expenseCategoryIds, categoryLookup, monthsToShow, selectedCurrency]);

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    monthlyData.forEach(m => Object.keys(m.byCategory).forEach(c => cats.add(c)));
    return Array.from(cats).sort();
  }, [monthlyData]);

  const summary = useMemo(() => {
    const totals = monthlyData.map(m => m.total);
    const avg = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
    const max = Math.max(...totals);
    const min = Math.min(...totals);
    const maxMonth = monthlyData.find(m => m.total === max);
    const minMonth = monthlyData.find(m => m.total === min);
    const lastTwo = totals.slice(-2);
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendPercent = 0;
    if (lastTwo.length === 2 && lastTwo[0] > 0) {
      trendPercent = ((lastTwo[1] - lastTwo[0]) / lastTwo[0]) * 100;
      trend = trendPercent > 1 ? 'up' : trendPercent < -1 ? 'down' : 'stable';
    }
    return { avg, max, min, maxMonth, minMonth, trend, trendPercent };
  }, [monthlyData]);

  // Para gastos, "up" es negativo (más gasto) y "down" es positivo (menos gasto)
  const chartConfig = { total: { label: 'Gastos', color: 'hsl(var(--destructive))' } };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">Comparativo de Gastos Mensuales</h2>
        <div className="flex items-center gap-2">
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Divisa" /></SelectTrigger>
            <SelectContent>
              {availableCurrencies.map(cur => (
                <SelectItem key={cur} value={cur}>{cur}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={monthsToShow} onValueChange={setMonthsToShow}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
            <CardTitle className="text-sm font-medium text-muted-foreground">Mes Más Caro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">${formatCurrency(summary.max)}</p>
            <p className="text-xs text-muted-foreground">{summary.maxMonth?.label}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tendencia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {summary.trend === 'up' && <TrendingUp className="h-5 w-5 text-destructive" />}
              {summary.trend === 'down' && <TrendingDown className="h-5 w-5 text-primary" />}
              {summary.trend === 'stable' && <Minus className="h-5 w-5 text-muted-foreground" />}
              <p className={`text-2xl font-bold ${summary.trend === 'up' ? 'text-destructive' : summary.trend === 'down' ? 'text-primary' : ''}`}>
                {summary.trendPercent > 0 ? '+' : ''}{formatNumber(summary.trendPercent, 1)}%
              </p>
            </div>
            <p className="text-xs text-muted-foreground">vs mes anterior</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Evolución de Gastos</CardTitle></CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="shortLabel" className="text-xs" />
              <YAxis tickFormatter={(v) => `$${formatNumber(v, 0)}`} className="text-xs" />
              <ChartTooltip
                content={<ChartTooltipContent />}
                formatter={(value: number) => [`$${formatCurrency(value)}`, 'Gastos']}
              />
              <Bar dataKey="total" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Desglose por Categoría</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Categoría</TableHead>
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
