import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout';
import { ClientesManager } from '@/components/business/ClientesManager';
import { ProveedoresManager } from '@/components/business/ProveedoresManager';
import { ProyectosManager } from '@/components/business/ProyectosManager';
import { FacturasManager } from '@/components/business/FacturasManager';
import { CategoriesManager } from '@/components/CategoriesManager';
import { AccountsManager } from '@/components/AccountsManager';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { Building2, Users, Truck, FolderKanban, FileText, Tags, Wallet } from 'lucide-react';

const Empresa = () => {
  const financeData = useFinanceDataSupabase();

  if (financeData.loading) {
    return (
      <Layout>
        <div className="animate-fade-in flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando datos...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Gestión Empresarial</h1>
        </div>
        <p className="text-muted-foreground">
          Administra clientes, proveedores, proyectos, facturas y catálogos de tu empresa.
        </p>

        <Tabs defaultValue="proyectos" className="space-y-4">
          <TabsList className="grid grid-cols-3 lg:grid-cols-7 gap-2 h-auto">
            <TabsTrigger value="proyectos" className="flex items-center gap-2 py-2">
              <FolderKanban className="h-4 w-4" />
              <span className="hidden sm:inline">Proyectos</span>
            </TabsTrigger>
            <TabsTrigger value="clientes" className="flex items-center gap-2 py-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="proveedores" className="flex items-center gap-2 py-2">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Proveedores</span>
            </TabsTrigger>
            <TabsTrigger value="facturas" className="flex items-center gap-2 py-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Facturas</span>
            </TabsTrigger>
            <TabsTrigger value="categorias" className="flex items-center gap-2 py-2">
              <Tags className="h-4 w-4" />
              <span className="hidden sm:inline">Categorías</span>
            </TabsTrigger>
            <TabsTrigger value="cuentas" className="flex items-center gap-2 py-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Cuentas</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="proyectos">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderKanban className="h-5 w-5" />
                  Proyectos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProyectosManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clientes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Clientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClientesManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="proveedores">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Proveedores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProveedoresManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="facturas">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Facturas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FacturasManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categorias">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tags className="h-5 w-5" />
                  Categorías Contables
                </CardTitle>
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
          </TabsContent>

          <TabsContent value="cuentas">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Cuentas Bancarias
                </CardTitle>
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
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Empresa;
