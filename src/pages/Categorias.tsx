import { useNavigate } from 'react-router-dom';

import { Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { PageHeader } from '@/components/PageHeader';

import Layout from '@/components/Layout';
import { CategoriesManager } from '@/components/CategoriesManager';

import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';


const Categorias = () => {
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

  const trackedExpenseCount = financeData.categories.filter(
    c => c.tipo === 'Gastos' && c.seguimiento_pago
  ).length;

  const trackedIncomeCount = financeData.categories.filter(
    c => c.tipo === 'Ingreso' && c.seguimiento_pago
  ).length;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Gestión de Categorías" back="/configuracion" />

        {/* Tracking buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:shadow-md"
            onClick={() => navigate('/seguimiento-gastos')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-5 w-5 text-destructive" />
                Seguimiento de Pagos Recurrentes
              </CardTitle>
              <CardDescription>
                Controla tus gastos periódicos (mensuales y anuales)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {trackedExpenseCount > 0
                  ? `${trackedExpenseCount} subcategoría${trackedExpenseCount > 1 ? 's' : ''} en seguimiento`
                  : 'Sin subcategorías en seguimiento'}
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md"
            onClick={() => navigate('/seguimiento-ingresos')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-success" />
                Seguimiento de Ingresos
              </CardTitle>
              <CardDescription>
                Monitorea la recepción de tus fuentes de ingreso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {trackedIncomeCount > 0
                  ? `${trackedIncomeCount} subcategoría${trackedIncomeCount > 1 ? 's' : ''} en seguimiento`
                  : 'Sin subcategorías en seguimiento'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <CategoriesManager
              categories={financeData.categories}
              transactions={financeData.transactions}
              onAddCategory={financeData.addCategory}
              onUpdateCategory={financeData.updateCategory}
              onDeleteCategory={financeData.deleteCategory}
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Categorias;
