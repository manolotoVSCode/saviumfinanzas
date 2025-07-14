import { TransactionsManager } from '@/components/TransactionsManager';
import { useFinanceData } from '@/hooks/useFinanceData';

const Transacciones = () => {
  const financeData = useFinanceData();

  return (
    <div className="animate-fade-in">
      <TransactionsManager
        transactions={financeData.transactions}
        accounts={financeData.accounts}
        categories={financeData.categories}
        onAddTransaction={financeData.addTransaction}
        onUpdateTransaction={financeData.updateTransaction}
        onDeleteTransaction={financeData.deleteTransaction}
      />
    </div>
  );
};

export default Transacciones;