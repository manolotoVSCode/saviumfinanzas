import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface DashboardKPIsProps {
  selectedMonth: number;
  selectedMonthYear: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onMonthYearChange: (year: number) => void;
  onYearChange: (year: number) => void;
  availableYears: number[];
  filteredMetrics: {
    ingresosMes: number;
    gastosMes: number;
    balanceMes: number;
    reembolsosMes: number;
    ingresosAnio: number;
    gastosAnio: number;
    balanceAnio: number;
    reembolsosAnio: number;
    cambioIngresosMes: number;
    cambioGastosMes: number;
    cambioIngresosAnio: number;
    cambioGastosAnio: number;
    balanceMesAnterior: number;
    balanceAnioAnterior: number;
  };
  selectedCurrency: string;
  formatCurrency: (amount: number, currency: string) => string;
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const DashboardKPIs = ({
  selectedMonth,
  selectedMonthYear,
  selectedYear,
  onMonthChange,
  onMonthYearChange,
  onYearChange,
  availableYears,
  filteredMetrics,
  selectedCurrency,
  formatCurrency,
}: DashboardKPIsProps) => {

  const navigateMonth = (direction: -1 | 1) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedMonthYear;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    if (newMonth > 11) { newMonth = 0; newYear++; }
    onMonthChange(newMonth);
    onMonthYearChange(newYear);
  };

  const cambioBalanceMes = filteredMetrics.balanceMesAnterior !== 0
    ? ((filteredMetrics.balanceMes - filteredMetrics.balanceMesAnterior) / Math.abs(filteredMetrics.balanceMesAnterior)) * 100
    : 0;

  const cambioBalanceAnio = filteredMetrics.balanceAnioAnterior !== 0
    ? ((filteredMetrics.balanceAnio - filteredMetrics.balanceAnioAnterior) / Math.abs(filteredMetrics.balanceAnioAnterior)) * 100
    : 0;

  const ChangeIndicator = ({ value, invertColor = false }: { value: number; invertColor?: boolean }) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    const color = invertColor
      ? (isPositive ? 'text-destructive' : 'text-success')
      : (isPositive ? 'text-success' : 'text-destructive');
    return (
      <span className={`flex items-center gap-0.5 text-xs font-medium ${color}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  const getBalanceColor = (amount: number) => {
    if (amount > 0) return 'text-success';
    if (amount < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-4">
      {/* Selector de período mensual */}
      <Card className="border-primary/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-sm min-w-[120px] text-center">
                {MONTHS[selectedMonth]} {selectedMonthYear}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">vs mes anterior</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-success/5 border border-success/20">
              <p className="text-xs text-muted-foreground mb-1">Ingresos</p>
              <p className="text-sm sm:text-base font-bold text-success">{formatCurrency(filteredMetrics.ingresosMes, selectedCurrency)}</p>
              <ChangeIndicator value={filteredMetrics.cambioIngresosMes} />
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-xs text-muted-foreground mb-1">Gastos</p>
              <p className="text-sm sm:text-base font-bold text-destructive">{formatCurrency(filteredMetrics.gastosMes, selectedCurrency)}</p>
              <ChangeIndicator value={filteredMetrics.cambioGastosMes} invertColor />
            </div>
            <div className={`text-center p-3 rounded-lg border ${filteredMetrics.balanceMes >= 0 ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}>
              <p className="text-xs text-muted-foreground mb-1">Balance</p>
              <p className={`text-sm sm:text-base font-bold ${getBalanceColor(filteredMetrics.balanceMes)}`}>{formatCurrency(filteredMetrics.balanceMes, selectedCurrency)}</p>
              <ChangeIndicator value={cambioBalanceMes} />
            </div>
          </div>
          {filteredMetrics.reembolsosMes > 0 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Reembolsos: {formatCurrency(filteredMetrics.reembolsosMes, selectedCurrency)} (ya descontados de gastos)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Selector de período anual */}
      <Card className="border-primary/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onYearChange(selectedYear - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-sm min-w-[60px] text-center">
                {selectedYear}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onYearChange(selectedYear + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">vs {selectedYear - 1}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-success/5 border border-success/20">
              <p className="text-xs text-muted-foreground mb-1">Ingresos</p>
              <p className="text-sm sm:text-base font-bold text-success">{formatCurrency(filteredMetrics.ingresosAnio, selectedCurrency)}</p>
              <ChangeIndicator value={filteredMetrics.cambioIngresosAnio} />
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-xs text-muted-foreground mb-1">Gastos</p>
              <p className="text-sm sm:text-base font-bold text-destructive">{formatCurrency(filteredMetrics.gastosAnio, selectedCurrency)}</p>
              <ChangeIndicator value={filteredMetrics.cambioGastosAnio} invertColor />
            </div>
            <div className={`text-center p-3 rounded-lg border ${filteredMetrics.balanceAnio >= 0 ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'}`}>
              <p className="text-xs text-muted-foreground mb-1">Balance</p>
              <p className={`text-sm sm:text-base font-bold ${getBalanceColor(filteredMetrics.balanceAnio)}`}>{formatCurrency(filteredMetrics.balanceAnio, selectedCurrency)}</p>
              <ChangeIndicator value={cambioBalanceAnio} />
            </div>
          </div>
          {filteredMetrics.reembolsosAnio > 0 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Reembolsos: {formatCurrency(filteredMetrics.reembolsosAnio, selectedCurrency)} (ya descontados de gastos)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
