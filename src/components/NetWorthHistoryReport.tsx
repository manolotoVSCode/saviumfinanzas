import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Account, Transaction } from '@/types/finance';
import { formatNumber } from '@/lib/formatters';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { computeNetWorthHistory } from '@/lib/finance/netWorthHistory';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface NetWorthHistoryReportProps {
  accounts: Account[];
  transactions: Transaction[];
  formatCurrency: (amount: number) => string;
}

const RANGE_OPTIONS = [
  { value: '12', label: 'Últimos 12 meses' },
  { value: '24', label: 'Últimos 24 meses' },
  { value: '36', label: 'Últimos 36 meses' },
  { value: 'all', label: 'Todo el histórico' },
];

const chartConfig = {
  patrimonio: { label: 'Patrimonio neto', color: 'hsl(var(--primary))' },
  activos: { label: 'Activos', color: 'hsl(var(--success))' },
  pasivos: { label: 'Pasivos', color: 'hsl(var(--destructive))' },
};

const Variation = ({ value, percent }: { value: number; percent: number | null }) => {
  const trend = Math.abs(value) < 0.005 ? 'flat' : value > 0 ? 'up' : 'down';
  const color = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1 ${color}`}>
      <span className="inline-flex items-center gap-1 tabular-nums">
        {trend === 'up' && <TrendingUp className="h-4 w-4 shrink-0" />}
        {trend === 'down' && <TrendingDown className="h-4 w-4 shrink-0" />}
        {trend === 'flat' && <Minus className="h-4 w-4 shrink-0" />}
        {value > 0 ? '+' : ''}{formatNumber(value, 0)}
      </span>
      {percent !== null && <span className="text-xs font-normal">{percent > 0 ? '+' : ''}{formatNumber(percent, 1)}%</span>}
    </span>
  );
};

export const NetWorthHistoryReport = ({ accounts, transactions, formatCurrency }: NetWorthHistoryReportProps) => {
  const { config } = useAppConfig();
  const { convertCurrency } = useExchangeRates();
  const [range, setRange] = useState<string>('24');

  const points = useMemo(
    () => computeNetWorthHistory(accounts, transactions, convertCurrency, config.currency, new Date(), range === 'all' ? undefined : Number(range)),
    [accounts, transactions, convertCurrency, config.currency, range]
  );

  const summary = useMemo(() => {
    if (points.length === 0) return null;
    const last = points[points.length - 1];
    const first = points[0];
    const prev = points.length > 1 ? points[points.length - 2] : null;
    const twelveAgo = points.length > 12 ? points[points.length - 13] : null;
    const pct = (from: number, to: number) => (Math.abs(from) > 0.005 ? ((to - from) / Math.abs(from)) * 100 : null);
    const best = points.reduce((m, p) => (p.patrimonio > m.patrimonio ? p : m), points[0]);
    return {
      actual: last,
      vsMesAnterior: prev ? { value: last.patrimonio - prev.patrimonio, percent: pct(prev.patrimonio, last.patrimonio) } : null,
      vs12Meses: twelveAgo ? { value: last.patrimonio - twelveAgo.patrimonio, percent: pct(twelveAgo.patrimonio, last.patrimonio) } : null,
      periodo: { value: last.patrimonio - first.patrimonio, percent: pct(first.patrimonio, last.patrimonio), desde: first.label },
      best,
    };
  }, [points]);

  // Tabla de más reciente a más antiguo, con variación mensual
  const rows = useMemo(
    () => points.map((p, i) => ({ ...p, delta: i > 0 ? p.patrimonio - points[i - 1].patrimonio : null })).reverse(),
    [points]
  );

  if (!summary) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No hay cuentas ni movimientos con los que reconstruir el patrimonio.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Patrimonio al cierre de cada mes en {config.currency}, reconstruido desde tus movimientos con las tasas de cambio actuales.
        </p>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Patrimonio neto actual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold tabular-nums whitespace-nowrap">${formatCurrency(summary.actual.patrimonio)}</p>
            <p className="text-xs text-muted-foreground">{summary.actual.label}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">vs mes anterior</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {summary.vsMesAnterior ? <Variation {...summary.vsMesAnterior} /> : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">vs hace 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {summary.vs12Meses ? <Variation {...summary.vs12Meses} /> : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mejor mes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-primary tabular-nums whitespace-nowrap">${formatCurrency(summary.best.patrimonio)}</p>
            <p className="text-xs text-muted-foreground">{summary.best.label}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolución del patrimonio neto</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[340px] w-full">
            <ComposedChart data={points} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="patrimonioFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" className="text-xs" tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tickFormatter={(v) => `$${formatNumber(v, 0)}`} className="text-xs" tickLine={false} axisLine={false} width={90} />
              <ChartTooltip
                content={<ChartTooltipContent indicator="line" />}
                formatter={(value: number, name: string) => [`$${formatCurrency(value)}`, chartConfig[name as keyof typeof chartConfig]?.label ?? name]}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area type="monotone" dataKey="patrimonio" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#patrimonioFill)" dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="activos" stroke="hsl(var(--success))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="pasivos" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[110px]">Mes</TableHead>
                  <TableHead className="text-right min-w-[130px]">Activos</TableHead>
                  <TableHead className="text-right min-w-[130px]">Pasivos</TableHead>
                  <TableHead className="text-right min-w-[140px]">Patrimonio neto</TableHead>
                  <TableHead className="text-right min-w-[140px]">Variación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.label}>
                    <TableCell className="font-medium">{r.label}</TableCell>
                    <TableCell className="text-right">${formatCurrency(r.activos)}</TableCell>
                    <TableCell className="text-right">${formatCurrency(r.pasivos)}</TableCell>
                    <TableCell className="text-right font-semibold">${formatCurrency(r.patrimonio)}</TableCell>
                    <TableCell className="text-right">
                      {r.delta === null ? '—' : <Variation value={r.delta} percent={null} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
