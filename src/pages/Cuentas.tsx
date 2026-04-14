import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout';
import { AccountsManager } from '@/components/AccountsManager';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';

const Cuentas = () => {
  const navigate = useNavigate();
  const financeData = useFinanceDataSupabase();

  if (financeData.loading) {
    return (
      <Layout>
        <div className="animate-fade-in flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/configuracion')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Gestión de Cuentas</h1>
          </div>
        </div>

        <Card className="border-secondary/20 hover:border-secondary/40 transition-all duration-300">
          <CardContent className="pt-6">
            <AccountsManager
              accounts={financeData.accounts}
              accountTypes={financeData.accountTypes}
              onAddAccount={financeData.addAccount}
              onUpdateAccount={financeData.updateAccount}
              onDeleteAccount={financeData.deleteAccount}
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Cuentas;
