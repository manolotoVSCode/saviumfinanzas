import Layout from '@/components/Layout';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { MonthlyPaymentsControl } from '@/components/MonthlyPaymentsControl';
import { SampleDataBanner } from '@/components/SampleDataBanner';

const IngresosRecurrentes = () => {
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
          <h1 className="text-3xl font-bold">Ingresos Recurrentes</h1>
          <p className="text-muted-foreground">Control de pagos e ingresos recurrentes mes a mes</p>
        </div>
        <MonthlyPaymentsControl
          transactions={financeData.transactions}
          formatCurrency={formatCurrency}
          categories={financeData.categories}
        />
      </div>
    </Layout>
  );
};

export default IngresosRecurrentes;
