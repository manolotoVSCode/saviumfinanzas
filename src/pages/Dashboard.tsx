import { Dashboard as DashboardComponent } from '@/components/Dashboard';
import Layout from '@/components/Layout';
import { CompleteProfileBanner } from '@/components/CompleteProfileBanner';
import { MigrationBanner } from '@/components/MigrationBanner';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useAppConfig } from '@/hooks/useAppConfig';

const Dashboard = () => {
  const financeData = useFinanceData();
  const { formatCurrency, config } = useAppConfig();

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