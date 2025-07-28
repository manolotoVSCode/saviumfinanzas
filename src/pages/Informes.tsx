import Layout from '@/components/Layout';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { SubscriptionsManager } from '@/components/SubscriptionsManager';
import { ProfitLossReport } from '@/components/ProfitLossReport';
import { BalanceSheetReport } from '@/components/BalanceSheetReport';
import { CashFlowReport } from '@/components/CashFlowReport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SampleDataBanner } from '@/components/SampleDataBanner';

const Informes = () => {
  const financeData = useFinanceDataSupabase();
  const { formatCurrency, config } = useAppConfig();

  if (financeData.loading) {
    return (
      <Layout>
        <div className="animate-fade-in flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando datos financieros...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <SampleDataBanner />
        
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">Informes Financieros</h1>
          <p className="text-muted-foreground">Reportes detallados de tu situación financiera</p>
        </div>

        <Tabs defaultValue="suscripciones" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="suscripciones">Suscripciones</TabsTrigger>
            <TabsTrigger value="profit-loss">P&L</TabsTrigger>
            <TabsTrigger value="balance">Balance</TabsTrigger>
            <TabsTrigger value="cashflow">Flujo de Caja</TabsTrigger>
          </TabsList>

          <TabsContent value="suscripciones" className="space-y-4">
            <SubscriptionsManager />
          </TabsContent>

          <TabsContent value="profit-loss" className="space-y-4">
            <ProfitLossReport 
              metrics={financeData.dashboardMetrics}
              formatCurrency={formatCurrency}
              transactions={financeData.transactions}
              categories={financeData.categories}
            />
          </TabsContent>

          <TabsContent value="balance" className="space-y-4">
            <BalanceSheetReport 
              metrics={financeData.dashboardMetrics}
              formatCurrency={formatCurrency}
              accounts={financeData.accounts}
            />
          </TabsContent>

          <TabsContent value="cashflow" className="space-y-4">
            <CashFlowReport 
              metrics={financeData.dashboardMetrics}
              formatCurrency={formatCurrency}
              transactions={financeData.transactions}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Informes;