import { PageHeader } from '@/components/PageHeader';
import Layout from '@/components/Layout';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { MonthlyPaymentsControl } from '@/components/MonthlyPaymentsControl';

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
        <PageHeader title="Ingresos Recurrentes" subtitle={<>Control de pagos e ingresos recurrentes mes a mes</>} />
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
