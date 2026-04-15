import Layout from '@/components/Layout';
import { Changelog } from '@/components/Changelog';
import { BookOpen } from 'lucide-react';

const ChangelogPage = () => {
  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Changelog</h1>
        </div>
        <Changelog />
      </div>
    </Layout>
  );
};

export default ChangelogPage;
