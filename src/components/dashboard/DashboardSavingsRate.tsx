import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SavingsRateProps {
  tendenciaMensual: Array<{
    mes: string;
    ingresos: number;
    gastos: number;
    balance: number;
  }>;
  selectedCurrency: string;
  formatCurrency: (amount: number, currency: string) => string;
}

export const DashboardSavingsRate = ({
  tendenciaMensual,
  selectedCurrency,
  formatCurrency,
}: SavingsRateProps) => {
  const data = tendenciaMensual.map(m => ({
    mes: m.mes,
    tasaAhorro: m.ingresos > 0 ? ((m.ingresos - m.gastos) / m.ingresos) * 100 : 0,
    ingresos: m.ingresos,
    gastos: m.gastos,
    ahorro: m.ingresos - m.gastos,
  }));

  const avgRate = data.length > 0
    ? data.reduce((sum, d) => sum + d.tasaAhorro, 0) / data.length
    : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg text-sm">
        <p className="font-medium mb-1">{label}</p>
        <p className="text-success">Ingresos: {formatCurrency(d.ingresos, selectedCurrency)}</p>
        <p className="text-destructive">Gastos: {formatCurrency(d.gastos, selectedCurrency)}</p>
        <p className={d.ahorro >= 0 ? 'text-success font-medium' : 'text-destructive font-medium'}>
          Ahorro: {formatCurrency(d.ahorro, selectedCurrency)}
        </p>
        <p className={`font-bold ${d.tasaAhorro >= 20 ? 'text-success' : d.tasaAhorro >= 0 ? 'text-warning' : 'text-destructive'}`}>
          Tasa: {d.tasaAhorro.toFixed(1)}%
        </p>
      </div>
    );
  };

  return (
    <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Tasa de Ahorro Mensual
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[250px]">
                  <p className="text-xs">% de ingresos que se convierten en ahorro. La línea punteada marca el 20% recomendado.</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </CardTitle>
          <span className={`text-sm font-bold ${avgRate >= 20 ? 'text-success' : avgRate >= 0 ? 'text-warning' : 'text-destructive'}`}>
            Ø {avgRate.toFixed(1)}%
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                width={40}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={20}
                stroke="hsl(var(--success))"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{ value: '20%', position: 'right', fill: 'hsl(var(--success))', fontSize: 11 }}
              />
              <ReferenceLine
                y={0}
                stroke="hsl(var(--destructive))"
                strokeWidth={1}
                strokeOpacity={0.5}
              />
              <Line
                type="monotone"
                dataKey="tasaAhorro"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-primary rounded" />
            <span>Tu tasa de ahorro</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 border-t-2 border-dashed border-success" />
            <span>Meta 20%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
