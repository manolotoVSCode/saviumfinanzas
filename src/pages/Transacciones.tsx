import { TransactionsManager } from '@/components/TransactionsManager';
import { ExcelExporter } from '@/components/ExcelExporter';
import BankStatementImporter from '@/components/BankStatementImporter';
import Layout from '@/components/Layout';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useIsMobile } from '@/hooks/use-mobile';

const Transacciones = () => {
  const financeData = useFinanceDataSupabase();
  const isMobile = useIsMobile();

  if (financeData.loading) {
    return (
      <Layout>
        <div className="animate-fade-in flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando transacciones...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div className={`flex items-center ${isMobile ? 'flex-col space-y-2 items-start' : 'justify-end gap-2'}`}>
          <ExcelExporter
            transactions={financeData.transactions}
            accounts={financeData.accounts}
            categories={financeData.categories}
          />
          <BankStatementImporter
            accounts={financeData.accounts}
            categories={financeData.categories}
            transactions={financeData.transactions}
            onImportTransactions={financeData.addTransactionsBatch}
          />
        </div>
        
        <TransactionsManager
          transactions={financeData.transactions}
          accounts={financeData.accounts}
          categories={financeData.categories}
          onAddTransaction={(transaction, autoContribution) => financeData.addTransaction(transaction, autoContribution)}
          onUpdateTransaction={(id, updates, autoContribution) => financeData.updateTransaction(id, updates, autoContribution)}
          onDeleteTransaction={financeData.deleteTransaction}
          onClearAllTransactions={financeData.clearAllTransactions}
        />
      </div>
    </Layout>
  );
};

export default Transacciones;