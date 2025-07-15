import { Dashboard as DashboardComponent } from '@/components/Dashboard';
import Layout from '@/components/Layout';
import { useFinanceData } from '@/hooks/useFinanceData';

// Función simple para formatear moneda
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
};

const Dashboard = () => {
  const financeData = useFinanceData();

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