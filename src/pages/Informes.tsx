import Layout from '@/components/Layout';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { SubscriptionsManager } from '@/components/SubscriptionsManager';
import { AssetsReport } from '@/components/AssetsReport';
import { LiabilitiesReport } from '@/components/LiabilitiesReport';
import { MonthlyPaymentsControl } from '@/components/MonthlyPaymentsControl';
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

        <Tabs defaultValue="pagos-recurrentes" className="w-full">
          <TabsList className="flex flex-wrap w-full justify-center gap-2 h-auto p-2 bg-muted rounded-lg">
            <TabsTrigger value="pagos-recurrentes" className="flex-1 min-w-[140px] text-xs sm:text-sm px-3 py-2">
              Pagos Recurrentes
            </TabsTrigger>
            <TabsTrigger value="suscripciones" className="flex-1 min-w-[140px] text-xs sm:text-sm px-3 py-2">
              Suscripciones
            </TabsTrigger>
            <TabsTrigger value="activos" className="flex-1 min-w-[140px] text-xs sm:text-sm px-3 py-2">
              Activos
            </TabsTrigger>
            <TabsTrigger value="pasivos" className="flex-1 min-w-[140px] text-xs sm:text-sm px-3 py-2">
              Pasivos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pagos-recurrentes" className="space-y-4">
            <MonthlyPaymentsControl 
              transactions={financeData.transactions}
              formatCurrency={formatCurrency}
              categories={financeData.categories}
            />
          </TabsContent>

          <TabsContent value="suscripciones" className="space-y-4">
            <SubscriptionsManager />
          </TabsContent>

          <TabsContent value="activos" className="space-y-4">
            <AssetsReport 
              metrics={financeData.dashboardMetrics}
              formatCurrency={formatCurrency}
              accounts={financeData.accounts}
              onAccountUpdate={financeData.refreshData}
            />
          </TabsContent>

          <TabsContent value="pasivos" className="space-y-4">
            <LiabilitiesReport 
              metrics={financeData.dashboardMetrics}
              formatCurrency={formatCurrency}
              accounts={financeData.accounts}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Informes;