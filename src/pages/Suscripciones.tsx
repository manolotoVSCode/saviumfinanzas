import { PageHeader } from '@/components/PageHeader';
import Layout from '@/components/Layout';
import { SubscriptionsManager } from '@/components/SubscriptionsManager';

const Suscripciones = () => {
  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <PageHeader title="Suscripciones" subtitle={<>Gestiona tus suscripciones activas y su gasto recurrente</>} />
        <SubscriptionsManager />
      </div>
    </Layout>
  );
};

export default Suscripciones;
