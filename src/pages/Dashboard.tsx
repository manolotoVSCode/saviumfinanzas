import { Dashboard as DashboardComponent } from '@/components/Dashboard';
import Layout from '@/components/Layout';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useUser } from '@/hooks/useUser';

const Dashboard = () => {
  const financeData = useFinanceData();
  const { formatCurrency } = useUser();

  return (
    <Layout>
      <div className="animate-fade-in">
        <DashboardComponent 
          metrics={financeData.dashboardMetrics} 
          formatCurrency={formatCurrency} 
        />
      </div>
    </Layout>
  );
};

export default Dashboard;