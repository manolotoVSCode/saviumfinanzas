import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/Layout';
import { AccountsManager } from '@/components/AccountsManager';
import { CategoriesManager } from '@/components/CategoriesManager';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { ExchangeRates } from '@/components/ExchangeRates';
import { Settings, Heart } from 'lucide-react';

const Configuracion = () => {
  const financeData = useFinanceDataSupabase();

  if (financeData.loading) {
    return (
      <Layout>
        <div className="animate-fade-in flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando configuración...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Configuración</h1>
        </div>


        {/* TASAS DE CAMBIO ACTUALES */}
        <ExchangeRates />

        {/* GESTIÓN DE CUENTAS */}
        <Card className="hover-scale border-secondary/20 hover:border-secondary/40 transition-all duration-300">
          <CardHeader>
            <CardTitle>Gestión de Cuentas</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountsManager
              accounts={financeData.accounts}
              accountTypes={financeData.accountTypes}
              onAddAccount={financeData.addAccount}
              onUpdateAccount={financeData.updateAccount}
              onDeleteAccount={financeData.deleteAccount}
            />
          </CardContent>
        </Card>

        {/* GESTIÓN DE CATEGORÍAS */}
        <Card className="hover-scale border-accent/20 hover:border-accent/40 transition-all duration-300">
          <CardHeader>
            <CardTitle>Gestión de Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoriesManager
              categories={financeData.categories}
              transactions={financeData.transactions}
              onAddCategory={financeData.addCategory}
              onUpdateCategory={financeData.updateCategory}
              onDeleteCategory={financeData.deleteCategory}
            />
          </CardContent>
        </Card>

        {/* INFORMACIÓN DE LA APP */}
        <Card className="hover-scale border-muted/20 hover:border-muted/40 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Acerca de Savium
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Savium es tu aplicación de finanzas personales diseñada para ayudarte a tomar control de tu dinero.
            </p>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Gestión de Transacciones</Badge>
              <Badge variant="secondary">Seguimiento de Inversiones</Badge>
              <Badge variant="secondary">Dashboard Financiero</Badge>
              <Badge variant="secondary">Múltiples Cuentas</Badge>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Versión: 1.0.0 • Desarrollado con ❤️
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Configuracion;