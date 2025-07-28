import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, CreditCard, TrendingUp, PieChart } from 'lucide-react';
import { DashboardMetrics } from '@/types/finance';
import { useMemo } from 'react';

interface BalanceSheetReportProps {
  metrics: DashboardMetrics;
  formatCurrency: (amount: number) => string;
  accounts: any[];
}

export const BalanceSheetReport = ({ metrics, formatCurrency, accounts }: BalanceSheetReportProps) => {
  const balanceData = useMemo(() => {
    const assets = accounts.filter(acc => acc.saldoActual >= 0);
    const liabilities = accounts.filter(acc => acc.saldoActual < 0);
    
    const totalAssets = assets.reduce((sum, acc) => sum + acc.saldoActual, 0);
    const totalLiabilities = Math.abs(liabilities.reduce((sum, acc) => sum + acc.saldoActual, 0));
    const netWorth = totalAssets - totalLiabilities;

    return {
      assets,
      liabilities,
      totalAssets,
      totalLiabilities,
      netWorth
    };
  }, [accounts]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Balance General
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resumen Principal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Activos Totales</p>
                <p className="text-2xl font-bold text-green-600">
                  ${formatCurrency(balanceData.totalAssets)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pasivos Totales</p>
                <p className="text-2xl font-bold text-red-600">
                  ${formatCurrency(balanceData.totalLiabilities)}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${
            balanceData.netWorth >= 0 
              ? 'bg-blue-50 dark:bg-blue-950' 
              : 'bg-orange-50 dark:bg-orange-950'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Patrimonio Neto</p>
                <p className={`text-2xl font-bold ${
                  balanceData.netWorth >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`}>
                  ${formatCurrency(balanceData.netWorth)}
                </p>
              </div>
              <TrendingUp className={`h-8 w-8 ${
                balanceData.netWorth >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`} />
            </div>
          </div>
        </div>

        {/* Desglose de Activos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-green-600">Activos</h3>
            <div className="space-y-3">
              {balanceData.assets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay activos registrados</p>
              ) : (
                balanceData.assets.map((account, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-green-50/50 dark:bg-green-950/50">
                    <div>
                      <span className="font-medium">{account.nombre}</span>
                      <p className="text-xs text-muted-foreground">{account.tipo}</p>
                      {account.divisa !== 'MXN' && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {account.divisa}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-green-600">
                        ${formatCurrency(account.saldoActual)}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {((account.saldoActual / balanceData.totalAssets) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Desglose de Pasivos */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-red-600">Pasivos</h3>
            <div className="space-y-3">
              {balanceData.liabilities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay pasivos registrados</p>
              ) : (
                balanceData.liabilities.map((account, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-red-50/50 dark:bg-red-950/50">
                    <div>
                      <span className="font-medium">{account.nombre}</span>
                      <p className="text-xs text-muted-foreground">{account.tipo}</p>
                      {account.divisa !== 'MXN' && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {account.divisa}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-red-600">
                        ${formatCurrency(Math.abs(account.saldoActual))}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {((Math.abs(account.saldoActual) / balanceData.totalLiabilities) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Ratios Financieros */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-4">Ratios Financieros</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-muted-foreground">Ratio de Endeudamiento</p>
              <p className="font-semibold">
                {balanceData.totalAssets > 0 
                  ? ((balanceData.totalLiabilities / balanceData.totalAssets) * 100).toFixed(1) 
                  : '0'}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-muted-foreground">Ratio de Patrimonio</p>
              <p className="font-semibold">
                {balanceData.totalAssets > 0 
                  ? ((balanceData.netWorth / balanceData.totalAssets) * 100).toFixed(1) 
                  : '0'}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-muted-foreground">Apalancamiento</p>
              <p className="font-semibold">
                {balanceData.netWorth > 0 
                  ? (balanceData.totalAssets / balanceData.netWorth).toFixed(2) 
                  : '∞'}:1
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};