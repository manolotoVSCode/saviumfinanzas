import Layout from '@/components/Layout';
import { SubscriptionsManager } from '@/components/SubscriptionsManager';
import { SampleDataBanner } from '@/components/SampleDataBanner';

const Suscripciones = () => {
  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <SampleDataBanner />
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">Suscripciones</h1>
          <p className="text-muted-foreground">Gestiona tus suscripciones activas y su gasto recurrente</p>
        </div>
        <SubscriptionsManager />
      </div>
    </Layout>
  );
};

export default Suscripciones;
