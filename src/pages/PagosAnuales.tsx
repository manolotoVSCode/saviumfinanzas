import Layout from '@/components/Layout';
import { AnnualPaymentsTracker } from '@/components/AnnualPaymentsTracker';
import { SampleDataBanner } from '@/components/SampleDataBanner';

const PagosAnuales = () => {
  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <SampleDataBanner />
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">Pagos Anuales</h1>
          <p className="text-muted-foreground">Seguimiento de pagos que se realizan una vez al año</p>
        </div>
        <AnnualPaymentsTracker />
      </div>
    </Layout>
  );
};

export default PagosAnuales;
