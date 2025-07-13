import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dashboard } from '@/components/Dashboard';
import { AccountsManager } from '@/components/AccountsManager';
import { CategoriesManager } from '@/components/CategoriesManager';
import { TransactionsManager } from '@/components/TransactionsManager';
import { UserConfig } from '@/components/UserConfig';
import { useFinanceData } from '@/hooks/useFinanceData';
import { useUser } from '@/hooks/useUser';
import { BarChart3, ArrowUpDown, Settings, LogOut } from 'lucide-react';

const Index = () => {
  const financeData = useFinanceData();
  const { user, updateUser, formatCurrency } = useUser();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Finanzas Personales</h1>
          <p className="text-muted-foreground">Gestiona tus ingresos, gastos y cuentas de manera eficiente</p>
        </div>

        <Tabs defaultValue="dashboard">
          <TabsList className="fixed bottom-0 left-0 right-0 h-16 grid grid-cols-4 bg-background border-t shadow-lg z-50">
            <TabsTrigger value="dashboard" className="flex flex-col items-center justify-center space-y-1 h-full">
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex flex-col items-center justify-center space-y-1 h-full">
              <ArrowUpDown className="h-5 w-5" />
              <span className="text-xs">Transacciones</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex flex-col items-center justify-center space-y-1 h-full">
              <Settings className="h-5 w-5" />
              <span className="text-xs">Configuración</span>
            </TabsTrigger>
            <TabsTrigger value="logout" className="flex flex-col items-center justify-center space-y-1 h-full">
              <LogOut className="h-5 w-5" />
              <span className="text-xs">Logout</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard metrics={financeData.dashboardMetrics} formatCurrency={formatCurrency} />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionsManager
              transactions={financeData.transactions}
              accounts={financeData.accounts}
              categories={financeData.categories}
              onAddTransaction={financeData.addTransaction}
              onUpdateTransaction={financeData.updateTransaction}
              onDeleteTransaction={financeData.deleteTransaction}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4">Configuración</h2>
                
                <div className="space-y-6">
                  <UserConfig user={user} onUpdateUser={updateUser} />

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Gestión de Cuentas</h3>
                    <AccountsManager
                      accounts={financeData.accounts}
                      accountTypes={financeData.accountTypes}
                      onAddAccount={financeData.addAccount}
                      onUpdateAccount={financeData.updateAccount}
                      onDeleteAccount={financeData.deleteAccount}
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Gestión de Categorías</h3>
                    <CategoriesManager
                      categories={financeData.categories}
                      onAddCategory={financeData.addCategory}
                      onUpdateCategory={financeData.updateCategory}
                      onDeleteCategory={financeData.deleteCategory}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logout">
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <LogOut className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">Funcionalidad de logout pendiente</p>
              <p className="text-sm text-muted-foreground">Se implementará con el sistema de autenticación</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
