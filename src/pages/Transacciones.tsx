import { TransactionsManager } from '@/components/TransactionsManager';
import TransactionImporter from '@/components/TransactionImporter';
import Layout from '@/components/Layout';
import { useFinanceData } from '@/hooks/useFinanceData';

const Transacciones = () => {
  const financeData = useFinanceData();

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Transacciones</h1>
          <TransactionImporter
            accounts={financeData.accounts}
            categories={financeData.categories}
            onImportTransactions={financeData.addTransactionsBatch}
          />
        </div>
        
        <TransactionsManager
          transactions={financeData.transactions}
          accounts={financeData.accounts}
          categories={financeData.categories}
          onAddTransaction={financeData.addTransaction}
          onUpdateTransaction={financeData.updateTransaction}
          onDeleteTransaction={financeData.deleteTransaction}
        />
      </div>
    </Layout>
  );
};

export default Transacciones;