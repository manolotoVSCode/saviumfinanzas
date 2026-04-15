import { useState } from 'react';
import { TransactionsManager } from '@/components/TransactionsManager';
import { ExcelExporter } from '@/components/ExcelExporter';
import BankStatementImporter from '@/components/BankStatementImporter';
import Layout from '@/components/Layout';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Info } from 'lucide-react';

const ImportFormatInfo = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary">
        <Info className="h-4 w-4" />
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Formatos compatibles para importación</DialogTitle>
        <DialogDescription>Requisitos y formatos aceptados para estados de cuenta</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 text-sm max-h-[60vh] overflow-y-auto">
        <div>
          <p className="font-semibold text-foreground mb-1">✅ Formatos aceptados</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
            <li>CSV (.csv) — separado por comas o punto y coma</li>
            <li>Excel (.xls, .xlsx)</li>
            <li>Codificación UTF-8 o Latin-1</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">📋 Columnas requeridas</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
            <li><strong>Fecha</strong> — DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY o serial de Excel</li>
            <li><strong>Descripción / Concepto</strong> — texto del movimiento</li>
            <li><strong>Monto</strong> — una columna (positivo/negativo) o dos (cargo/abono)</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">🔍 Detección automática</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
            <li>Columnas detectadas por nombre (fecha, date, descripción, concepto, monto, cargo, abono...)</li>
            <li>Montos negativos = gastos (o ingresos en tarjeta de crédito)</li>
            <li>Se aplican reglas de clasificación automática</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">❌ No funcionará si...</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
            <li>El archivo es un PDF (exporta a CSV/Excel desde tu banco)</li>
            <li>Las columnas no tienen encabezados reconocibles</li>
            <li>Hay múltiples tablas sin estructura clara</li>
            <li>Los montos incluyen texto (ej: "1,500 MXN")</li>
            <li>El archivo está protegido con contraseña</li>
          </ul>
        </div>
        <div className="pt-2 border-t">
          <p className="text-muted-foreground text-xs">
            💡 <strong>Tip:</strong> La mayoría de bancos permiten descargar movimientos en CSV o Excel desde la banca en línea. Busca "Exportar", "Descargar movimientos" o "Estado de cuenta digital".
          </p>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

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
          <ImportFormatInfo />
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