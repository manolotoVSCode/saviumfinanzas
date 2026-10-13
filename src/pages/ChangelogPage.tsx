import { PageHeader } from '@/components/PageHeader';

import Layout from '@/components/Layout';
import { Changelog } from '@/components/Changelog';



const ChangelogPage = () => {

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Changelog" back="/configuracion" />
        <Changelog />
      </div>
    </Layout>
  );
};

export default ChangelogPage;
