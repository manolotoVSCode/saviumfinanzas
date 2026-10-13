import { Dashboard as DashboardComponent } from '@/components/Dashboard';
import { PageHeader } from '@/components/PageHeader';
import { FraseSavium } from '@/components/FraseSavium';
import Layout from '@/components/Layout';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { PendingsWidget } from '@/components/dashboard/PendingsWidget';
import { PagosGrandesWidget } from '@/components/dashboard/PagosGrandesWidget';

const Dashboard = () => {
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
        <PageHeader
          title="Dashboard"
          subtitle={<FraseSavium maquina />}
        />
        <PagosGrandesWidget />
        <PendingsWidget />
        <DashboardComponent 
          metrics={financeData.dashboardMetrics} 
          formatCurrency={formatCurrency}
          currencyCode={config.currency}
          transactions={financeData.transactions}
          accounts={financeData.accounts}
        />
      </div>
    </Layout>
  );
};

export default Dashboard;
