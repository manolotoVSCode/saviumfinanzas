import Layout from '@/components/Layout';
import { Changelog } from '@/components/Changelog';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const ChangelogPage = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/configuracion')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <BookOpen className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Changelog</h1>
        </div>
        <Changelog />
      </div>
    </Layout>
  );
};

export default ChangelogPage;
