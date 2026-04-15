import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';

interface DonutData {
  name: string;
  value: number;
  color: string;
}

interface DashboardDonutChartProps {
  pieDataGastosMes: DonutData[];
  pieDataIngresosMes: DonutData[];
  selectedCurrency: string;
  selectedMonth: number;
  selectedMonthYear: number;
  formatCurrency: (amount: number, currency: string) => string;
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const DashboardDonutChart = ({
  pieDataGastosMes,
  pieDataIngresosMes,
  selectedCurrency,
  selectedMonth,
  selectedMonthYear,
  formatCurrency,
}: DashboardDonutChartProps) => {
  const navigate = useNavigate();
  const [viewType, setViewType] = useState<'Gastos' | 'Ingreso'>('Gastos');

  const data = viewType === 'Gastos' ? pieDataGastosMes : pieDataIngresosMes;
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const handleClick = (entry: DonutData) => {
    const params = new URLSearchParams({
      categoria: entry.name,
      divisa: selectedCurrency,
      periodo: `${MONTHS[selectedMonth]} ${selectedMonthYear}`,
      monthNum: selectedMonth.toString(),
      yearNum: selectedMonthYear.toString(),
      tipo: viewType,
    });
    navigate(`/transacciones-categoria?${params.toString()}`);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const { name, value } = payload[0].payload;
    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-sm">{name}</p>
        <p className="text-sm text-muted-foreground">{formatCurrency(value, selectedCurrency)}</p>
        <p className="text-xs text-muted-foreground">{pct}% del total</p>
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-center text-base">
            Distribución {MONTHS[selectedMonth]} {selectedMonthYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No hay {viewType === 'Gastos' ? 'gastos' : 'ingresos'} en este período
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 hover:border-primary/40 transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-center sm:text-left text-base">
            Distribución {MONTHS[selectedMonth]} {selectedMonthYear}
          </CardTitle>
          <div className="flex rounded-lg bg-muted p-1 self-center sm:self-auto">
            <Button
              variant={viewType === 'Gastos' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('Gastos')}
              className="text-xs px-3 h-7"
            >
              Gastos
            </Button>
            <Button
              variant={viewType === 'Ingreso' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('Ingreso')}
              className="text-xs px-3 h-7"
            >
              Ingresos
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                cursor="pointer"
                onClick={(_, index) => handleClick(data[index])}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
        {/* Legend below chart */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
          {data.map((entry) => {
            const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
            return (
              <button
                key={entry.name}
                onClick={() => handleClick(entry)}
                className="flex items-center gap-2 text-xs py-1 hover:bg-muted/50 rounded px-1 transition-colors text-left"
              >
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="truncate text-muted-foreground">{entry.name}</span>
                <span className="ml-auto font-medium shrink-0">{pct}%</span>
              </button>
            );
          })}
        </div>
        <p className="text-center text-sm font-semibold mt-3">
          Total: {formatCurrency(total, selectedCurrency)}
        </p>
      </CardContent>
    </Card>
  );
};
