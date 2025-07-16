import { Dashboard as DashboardComponent } from '@/components/Dashboard';
import Layout from '@/components/Layout';
import { CompleteProfileBanner } from '@/components/CompleteProfileBanner';
import { MigrationBanner } from '@/components/MigrationBanner';
import { useFinanceData } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';

const Dashboard = () => {
  const financeData = useFinanceData();
  const { formatCurrency, config } = useAppConfig();

  if (financeData.loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <CompleteProfileBanner />
      <MigrationBanner />
      <div className="animate-fade-in">
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