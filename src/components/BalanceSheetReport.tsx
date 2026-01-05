import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, CreditCard, TrendingUp, PieChart, ChevronDown } from 'lucide-react';
import { DashboardMetrics } from '@/types/finance';
import { useMemo, useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface BalanceSheetReportProps {
  metrics: DashboardMetrics;
  formatCurrency: (amount: number) => string;
  accounts: any[];
}

export const BalanceSheetReport = ({ metrics, formatCurrency, accounts }: BalanceSheetReportProps) => {
  const balanceData = useMemo(() => {
    // Filtrar cuentas vendidas
    const activeAccounts = accounts.filter(acc => !acc.vendida);
    const assets = activeAccounts.filter(acc => acc.saldoActual >= 0);
    const liabilities = activeAccounts.filter(acc => acc.saldoActual < 0);
    
    const totalAssets = assets.reduce((sum, acc) => sum + acc.saldoActual, 0);
    const totalLiabilities = Math.abs(liabilities.reduce((sum, acc) => sum + acc.saldoActual, 0));
    const netWorth = totalAssets - totalLiabilities;

    // Agrupar activos por tipo
    const groupedAssets: Record<string, any[]> = {};
    assets.forEach(acc => {
      const tipo = acc.tipo || 'Otros';
      if (!groupedAssets[tipo]) {
        groupedAssets[tipo] = [];
      }
      groupedAssets[tipo].push(acc);
    });

    // Agrupar pasivos por tipo
    const groupedLiabilities: Record<string, any[]> = {};
    liabilities.forEach(acc => {
      const tipo = acc.tipo || 'Otros';
      if (!groupedLiabilities[tipo]) {
        groupedLiabilities[tipo] = [];
      }
      groupedLiabilities[tipo].push(acc);
    });

    return {
      assets,
      liabilities,
      totalAssets,
      totalLiabilities,
      netWorth,
      groupedAssets,
      groupedLiabilities
    };
  }, [accounts]);

  // Estado para controlar qué categorías están abiertas
  const [openAssetCategories, setOpenAssetCategories] = useState<Record<string, boolean>>({});
  const [openLiabilityCategories, setOpenLiabilityCategories] = useState<Record<string, boolean>>({});

  const toggleAssetCategory = (tipo: string) => {
    setOpenAssetCategories(prev => ({
      ...prev,
      [tipo]: !prev[tipo]
    }));
  };

  const toggleLiabilityCategory = (tipo: string) => {
    setOpenLiabilityCategories(prev => ({
      ...prev,
      [tipo]: !prev[tipo]
    }));
  };

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
                Object.entries(balanceData.groupedAssets).map(([tipo, cuentas]) => {
                  const totalCategoria = cuentas.reduce((sum, acc) => sum + acc.saldoActual, 0);
                  return (
                    <Collapsible 
                      key={tipo}
                      open={openAssetCategories[tipo]}
                      onOpenChange={() => toggleAssetCategory(tipo)}
                    >
                      <div className="rounded-lg border bg-green-50/50 dark:bg-green-950/50">
                        <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-green-100/50 dark:hover:bg-green-900/50 transition-colors">
                          <div>
                            <span className="font-medium">{tipo}</span>
                            <p className="text-xs text-muted-foreground">
                              {cuentas.length} {cuentas.length === 1 ? 'cuenta' : 'cuentas'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="font-semibold text-green-600">
                                ${formatCurrency(totalCategoria)}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {((totalCategoria / balanceData.totalAssets) * 100).toFixed(2)}%
                              </p>
                            </div>
                            <ChevronDown className={`h-4 w-4 transition-transform ${openAssetCategories[tipo] ? 'rotate-180' : ''}`} />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-3 pb-3">
                          <div className="space-y-2 mt-2 pt-2 border-t">
                            {cuentas.map((account, index) => (
                              <div key={index} className="flex items-center justify-between p-2 rounded bg-background/50">
                                <div>
                                  <span className="text-sm font-medium">{account.nombre}</span>
                                  {account.divisa !== 'MXN' && (
                                    <Badge variant="outline" className="text-xs ml-2">
                                      {account.divisa}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-semibold text-green-600">
                                    ${formatCurrency(account.saldoActual)}
                                  </span>
                                  <p className="text-xs text-muted-foreground">
                                    {((account.saldoActual / balanceData.totalAssets) * 100).toFixed(2)}%
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })
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
                Object.entries(balanceData.groupedLiabilities).map(([tipo, cuentas]) => {
                  const totalCategoria = Math.abs(cuentas.reduce((sum, acc) => sum + acc.saldoActual, 0));
                  return (
                    <Collapsible 
                      key={tipo}
                      open={openLiabilityCategories[tipo]}
                      onOpenChange={() => toggleLiabilityCategory(tipo)}
                    >
                      <div className="rounded-lg border bg-red-50/50 dark:bg-red-950/50">
                        <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-red-100/50 dark:hover:bg-red-900/50 transition-colors">
                          <div>
                            <span className="font-medium">{tipo}</span>
                            <p className="text-xs text-muted-foreground">
                              {cuentas.length} {cuentas.length === 1 ? 'cuenta' : 'cuentas'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="font-semibold text-red-600">
                                ${formatCurrency(totalCategoria)}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {((totalCategoria / balanceData.totalLiabilities) * 100).toFixed(2)}%
                              </p>
                            </div>
                            <ChevronDown className={`h-4 w-4 transition-transform ${openLiabilityCategories[tipo] ? 'rotate-180' : ''}`} />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-3 pb-3">
                          <div className="space-y-2 mt-2 pt-2 border-t">
                            {cuentas.map((account, index) => (
                              <div key={index} className="flex items-center justify-between p-2 rounded bg-background/50">
                                <div>
                                  <span className="text-sm font-medium">{account.nombre}</span>
                                  {account.divisa !== 'MXN' && (
                                    <Badge variant="outline" className="text-xs ml-2">
                                      {account.divisa}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-semibold text-red-600">
                                    ${formatCurrency(Math.abs(account.saldoActual))}
                                  </span>
                                  <p className="text-xs text-muted-foreground">
                                    {((Math.abs(account.saldoActual) / balanceData.totalLiabilities) * 100).toFixed(2)}%
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })
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
                  ? ((balanceData.totalLiabilities / balanceData.totalAssets) * 100).toFixed(2) 
                  : '0.00'}%
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-muted-foreground">Ratio de Patrimonio</p>
              <p className="font-semibold">
                {balanceData.totalAssets > 0 
                  ? ((balanceData.netWorth / balanceData.totalAssets) * 100).toFixed(2) 
                  : '0.00'}%
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