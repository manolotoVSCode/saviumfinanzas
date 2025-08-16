import { TransactionsManager } from '@/components/TransactionsManager';
import TransactionImporter from '@/components/TransactionImporter';
import Layout from '@/components/Layout';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Info } from 'lucide-react';

const Transacciones = () => {
  const financeData = useFinanceDataSupabase();

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
        <div className="flex justify-end items-center">
          <div className="flex items-center gap-2">
            <TransactionImporter
              accounts={financeData.accounts}
              categories={financeData.categories}
              onImportTransactions={financeData.addTransactionsBatch}
            />
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Info className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Instrucciones para Importar Transacciones</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">Formato del archivo CSV:</h4>
                    <p className="mb-2">El archivo debe contener las siguientes columnas en orden:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-4">
                      <li><strong>Fecha:</strong> Formato DD/MM/AA (ejemplo: 15/03/25)</li>
                      <li><strong>Comentario:</strong> Descripción de la transacción</li>
                      <li><strong>Ingreso:</strong> Monto de ingreso (usar 0 si no aplica)</li>
                      <li><strong>Gasto:</strong> Monto de gasto (usar 0 si no aplica)</li>
                    </ol>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Ejemplo de formato:</h4>
                    <div className="bg-muted p-3 rounded font-mono text-xs">
                      15/03/25;Compra de comida;0;250
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Notas importantes:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Al importar las transacciones, se aplicarán con la divisa elegida en el proceso</li>
                      <li>Al importar, se le asignará una cuenta en el proceso</li>
                      <li>No incluir encabezados en el archivo</li>
                      <li>Usar punto y coma (;) como separador</li>
                      <li>Los decimales se pueden usar con coma (,)</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
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