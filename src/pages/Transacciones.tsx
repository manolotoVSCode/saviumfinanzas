import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { TransactionsManager } from '@/components/TransactionsManager';
import { ExcelExporter } from '@/components/ExcelExporter';
import BankStatementImporter from '@/components/import/BankStatementImporter';
import { PageHeader } from '@/components/PageHeader';
import Layout from '@/components/Layout';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
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
            <li>CSV (.csv) — separado por comas, punto y coma, tabulador o barra vertical (se detecta solo)</li>
            <li>Excel (.xls, .xlsx) — se lee la primera hoja</li>
            <li>Codificación UTF-8 o Latin-1 (se detecta sola)</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">📋 Columnas requeridas</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
            <li><strong>Fecha</strong> — DD/MM/AAAA, MM/DD/AAAA (con /, - o .), AAAA-MM-DD, "15 ene 2026" o fecha de Excel. Si no se distingue día y mes, te pregunta cuál es</li>
            <li><strong>Descripción / Concepto</strong> — texto del movimiento</li>
            <li><strong>Importe</strong> — una columna con signo (importe, monto, cantidad) o dos (cargo/abono, debe/haber, retiro/depósito)</li>
            <li><strong>Tarjetahabiente</strong> (opcional) — si viene la columna titular o cardholder, se guarda en cada movimiento</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">🔍 Detección automática</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
            <li>Se saltan las filas de título antes de la cabecera (ej: BBVA)</li>
            <li>Columnas detectadas por nombre; sin cabecera, se deducen de los datos</li>
            <li>Con fecha de operación y fecha valor, usa la de operación; la columna Saldo se ignora</li>
            <li>Importes con $, €, MXN, USD o EUR, en formato 1,234.56 o 1.234,56</li>
            <li>Cuentas bancarias: negativo = gasto. Tarjetas de crédito: positivo = gasto, negativo = pago</li>
            <li>Categoría sugerida por tus reglas y tu historial; los abonos con categoría de gasto se marcan como reembolso</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">👀 En la vista previa</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
            <li>Los posibles duplicados (mismo importe, ±2 días) entran desmarcados</li>
            <li>Las filas descartadas se listan con su motivo (sin fecha, importe 0 o no numérico)</li>
            <li>Los ingresos pueden vincularse a un pendiente por cobrar</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">❌ No funcionará si...</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
            <li>El archivo es un PDF (exporta a CSV/Excel desde tu banco)</li>
            <li>El archivo está protegido con contraseña</li>
            <li>Los movimientos no están en la primera hoja del Excel, o hay varias tablas en la misma hoja</li>
            <li>Las fechas tienen año de 2 dígitos (15/01/26) o no tienen año</li>
            <li>Los importes llevan otro texto (ej: "1,500 pesos")</li>
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
  const { soloLectura } = useAuth();

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
        <PageHeader title="Transacciones" actions={soloLectura ? undefined : <>
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
        </>} />
        
        <TransactionsManager
          transactions={financeData.transactions}
          accounts={financeData.accounts}
          categories={financeData.categories}
          onAddTransaction={(transaction, autoContribution) => financeData.addTransaction(transaction, autoContribution)}
          onUpdateTransaction={(id, updates, autoContribution) => financeData.updateTransaction(id, updates, autoContribution)}
          onDeleteTransaction={financeData.deleteTransaction}
          onClearAllTransactions={financeData.clearAllTransactions}
          soloLectura={soloLectura}
        />
      </div>
    </Layout>
  );
};

export default Transacciones;