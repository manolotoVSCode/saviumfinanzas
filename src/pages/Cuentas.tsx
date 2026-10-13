
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { PageHeader } from '@/components/PageHeader';

import Layout from '@/components/Layout';
import { AccountsManager } from '@/components/AccountsManager';

import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';


const Cuentas = () => {
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
        <PageHeader title="Gestión de Cuentas" back="/configuracion" />

        <Card>
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
