import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dashboard } from '@/components/Dashboard';
import { AccountsManager } from '@/components/AccountsManager';
import { CategoriesManager } from '@/components/CategoriesManager';
import { TransactionsManager } from '@/components/TransactionsManager';
import { DateFilter } from '@/components/DateFilter';
import { useFinanceData } from '@/hooks/useFinanceData';
import { DollarSign, CreditCard, Tags, ArrowUpDown, BarChart3 } from 'lucide-react';

const Index = () => {
  const financeData = useFinanceData();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Finanzas Personales</h1>
          <p className="text-muted-foreground">Gestiona tus ingresos, gastos y cuentas de manera eficiente</p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="accounts" className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <span>Cuentas</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center space-x-2">
              <Tags className="h-4 w-4" />
              <span>Categorías</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center space-x-2">
              <ArrowUpDown className="h-4 w-4" />
              <span>Transacciones</span>
            </TabsTrigger>
            <TabsTrigger value="filters" className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Filtros</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard metrics={financeData.dashboardMetrics} />
          </TabsContent>

          <TabsContent value="accounts">
            <AccountsManager
              accounts={financeData.accounts}
              accountTypes={financeData.accountTypes}
              onAddAccount={financeData.addAccount}
              onUpdateAccount={financeData.updateAccount}
              onDeleteAccount={financeData.deleteAccount}
            />
          </TabsContent>

          <TabsContent value="categories">
            <CategoriesManager
              categories={financeData.categories}
              onAddCategory={financeData.addCategory}
              onUpdateCategory={financeData.updateCategory}
              onDeleteCategory={financeData.deleteCategory}
            />
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

          <TabsContent value="filters">
            <DateFilter
              dateFilter={financeData.dateFilter}
              onDateFilterChange={financeData.setDateFilter}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
