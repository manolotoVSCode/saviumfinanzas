import { Dashboard as DashboardComponent } from '@/components/Dashboard';
import Layout from '@/components/Layout';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useAppConfig } from '@/hooks/useAppConfig';

const Dashboard = () => {
  const financeData = useFinanceData();
  const { formatCurrency, config } = useAppConfig();

  return (
    <Layout>
      <div className="animate-fade-in">
        <DashboardComponent 
          metrics={financeData.dashboardMetrics} 
          formatCurrency={formatCurrency}
          currencyCode={config.currency}
        />
      </div>
    </Layout>
  );
};

export default Dashboard;