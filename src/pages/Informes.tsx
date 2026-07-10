import Layout from '@/components/Layout';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { MonthlyIncomeComparison } from '@/components/MonthlyIncomeComparison';
import { MonthlyExpenseComparison } from '@/components/MonthlyExpenseComparison';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SampleDataBanner } from '@/components/SampleDataBanner';

const Informes = () => {
  const financeData = useFinanceDataSupabase();
  const { formatCurrency } = useAppConfig();

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

        <Tabs defaultValue="comparativo-ingresos" className="w-full">
          <TabsList className="flex flex-wrap w-full justify-center gap-2 h-auto p-2 bg-muted rounded-lg">
            <TabsTrigger value="comparativo-ingresos" className="flex-1 min-w-[160px] text-xs sm:text-sm px-3 py-2">
              Comparativo de Ingresos
            </TabsTrigger>
            <TabsTrigger value="comparativo-gastos" className="flex-1 min-w-[160px] text-xs sm:text-sm px-3 py-2">
              Comparativo de Gastos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="comparativo-ingresos" className="space-y-4">
            <MonthlyIncomeComparison
              transactions={financeData.transactions}
              categories={financeData.categories}
              formatCurrency={formatCurrency}
            />
          </TabsContent>

          <TabsContent value="comparativo-gastos" className="space-y-4">
            <MonthlyExpenseComparison
              transactions={financeData.transactions}
              categories={financeData.categories}
              formatCurrency={formatCurrency}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Informes;
