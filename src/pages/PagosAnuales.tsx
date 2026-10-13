import { PageHeader } from '@/components/PageHeader';
import Layout from '@/components/Layout';
import { AnnualPaymentsTracker } from '@/components/AnnualPaymentsTracker';

const PagosAnuales = () => {
  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <PageHeader title="Pagos Anuales" subtitle={<>Seguimiento de pagos que se realizan una vez al año</>} />
        <AnnualPaymentsTracker />
      </div>
    </Layout>
  );
};

export default PagosAnuales;
