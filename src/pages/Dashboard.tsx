import { Dashboard as DashboardComponent } from '@/components/Dashboard';
import Layout from '@/components/Layout';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { SampleDataBanner } from '@/components/SampleDataBanner';
import { WelcomeGuide } from '@/components/WelcomeGuide';
import { OnboardingTour, useOnboardingTour } from '@/components/OnboardingTour';
import { useEffect, useState } from 'react';

const Dashboard = () => {
  const financeData = useFinanceDataSupabase();
  const { formatCurrency, config } = useAppConfig();
  const { isCompleted, markCompleted } = useOnboardingTour();
  const [tourActive, setTourActive] = useState(false);

  // Auto-start tour for new users (first visit)
  useEffect(() => {
    if (!financeData.loading && !isCompleted) {
      // Small delay to let the layout render and measure elements
      const timer = setTimeout(() => setTourActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, [financeData.loading, isCompleted]);

  const handleTourComplete = () => {
    setTourActive(false);
    markCompleted();
  };

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
      <OnboardingTour active={tourActive} onComplete={handleTourComplete} />
    </Layout>
  );
};

export default Dashboard;
