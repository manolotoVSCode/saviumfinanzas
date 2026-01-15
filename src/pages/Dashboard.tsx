import { Dashboard as DashboardComponent } from '@/components/Dashboard';
import { BusinessDashboard } from '@/components/BusinessDashboard';
import Layout from '@/components/Layout';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useUserProfile } from '@/hooks/useUserProfile';
import { SampleDataBanner } from '@/components/SampleDataBanner';
import { WelcomeGuide } from '@/components/WelcomeGuide';

const Dashboard = () => {
  const financeData = useFinanceDataSupabase();
  const { formatCurrency, config } = useAppConfig();
  const { profile, loading: profileLoading } = useUserProfile();

  if (financeData.loading || profileLoading) {
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

  // Show business dashboard for empresa accounts
  if (profile?.tipo_cuenta === 'empresa') {
    return (
      <Layout>
        <div className="animate-fade-in">
          <BusinessDashboard />
        </div>
      </Layout>
    );
  }

  // Default: personal dashboard
  return (
    <Layout>
      <div className="animate-fade-in">
        <SampleDataBanner />
        <WelcomeGuide />
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