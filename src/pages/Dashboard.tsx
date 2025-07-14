import { Dashboard as DashboardComponent } from '@/components/Dashboard';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useUser } from '@/hooks/useUser';

const Dashboard = () => {
  const financeData = useFinanceData();
  const { formatCurrency } = useUser();

  return (
    <div className="animate-fade-in">
      <DashboardComponent 
        metrics={financeData.dashboardMetrics} 
        formatCurrency={formatCurrency} 
      />
    </div>
  );
};

export default Dashboard;