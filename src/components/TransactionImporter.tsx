import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, ArrowRight, ArrowLeft, Check, X, RefreshCcw } from 'lucide-react';
import { Account, Category, Transaction } from '@/types/finance';
import { parseBankFile, ParsedTransaction, BANK_FORMATS } from '@/hooks/useBankParser';

interface TransactionImporterProps {
  accounts: Account[];
  categories: Category[];
  onImportTransactions: (transactions: Omit<Transaction, 'id' | 'monto'>[]) => void;
}

const CURRENCIES: Array<{ value: 'MXN' | 'USD' | 'EUR'; label: string }> = [
  { value: 'MXN', label: 'Peso Mexicano (MXN)' },
  { value: 'USD', label: 'Dólar Americano (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' }
];

type Step = 'select-account' | 'upload' | 'preview' | 'importing';

const TransactionImporter = ({ accounts, categories, onImportTransactions }: TransactionImporterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>('select-account');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<(ParsedTransaction & { selected: boolean })[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<'MXN' | 'USD' | 'EUR' | ''>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedBankFormat, setSelectedBankFormat] = useState<string>('');
  
  const selectedAccountData = accounts.find(a => a.id === selectedAccount);
  const isCreditCard = selectedAccountData?.tipo === 'Tarjeta de Crédito';

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportStatus(null);

    try {
      const text = await file.text();
      
      const transactions = parseBankFile(text, selectedBankFormat, categories, isCreditCard);
      
      if (transactions.length === 0) {
        setImportStatus({ type: 'error', message: 'No se encontraron transacciones en el archivo' });
        return;
      }

      setParsedTransactions(transactions.map(t => ({ ...t, selected: true })));
      setImportStatus({ 
        type: 'success', 
        message: `Se procesaron ${transactions.length} transacciones` 
      });
      setStep('preview');

    } catch (error) {
      setImportStatus({ 
        type: 'error', 
        message: `Error al procesar el archivo: ${error}` 
      });
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  const toggleTransaction = (index: number) => {
    setParsedTransactions(prev => 
      prev.map((t, i) => i === index ? { ...t, selected: !t.selected } : t)
    );
  };

  const selectAll = () => {
    setParsedTransactions(prev => prev.map(t => ({ ...t, selected: true })));
  };

  const deselectAll = () => {
    setParsedTransactions(prev => prev.map(t => ({ ...t, selected: false })));
  };

  const updateCategory = (index: number, categoryId: string) => {
    setParsedTransactions(prev => 
      prev.map((t, i) => i === index ? { ...t, suggestedCategoryId: categoryId, confidence: 'high' as const } : t)
    );
  };

  const handleImport = () => {
    if (!selectedCurrency || !selectedAccount) {
      setImportStatus({ type: 'error', message: 'Debe seleccionar divisa y cuenta' });
      return;
    }

    const defaultCategory = categories.find(cat => 
      cat.subcategoria.toUpperCase() === 'SIN ASIGNAR' && 
      cat.categoria.toUpperCase() === 'SIN ASIGNAR'
    );

    if (!defaultCategory) {
      setImportStatus({ type: 'error', message: 'Error: No se encontró la categoría "SIN ASIGNAR".' });
      return;
    }

    const selectedTxs = parsedTransactions.filter(t => t.selected);

    const transactions: Omit<Transaction, 'id' | 'monto'>[] = selectedTxs.map((transaction, index) => {
      const [year, month, day] = transaction.fecha.split('-');
      const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      // Add REEMBOLSO prefix if it's a refund
      let comentario = transaction.comentario;
      if (transaction.isReembolso && !comentario.toUpperCase().includes('REEMBOLSO')) {
        comentario = `REEMBOLSO (gasto): ${comentario}`;
      }
      
      return {
        csvId: `import_${Date.now()}_${index}`,
        cuentaId: selectedAccount,
        fecha,
        comentario,
        ingreso: transaction.ingreso,
        gasto: transaction.gasto,
        subcategoriaId: transaction.suggestedCategoryId || defaultCategory.id,
        divisa: selectedCurrency as 'MXN' | 'USD' | 'EUR'
      };
    });

    onImportTransactions(transactions);
    
    setImportStatus({ 
      type: 'success', 
      message: `Se importaron ${transactions.length} transacciones` 
    });

    setTimeout(() => {
      handleClose();
    }, 2000);
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep('select-account');
    setParsedTransactions([]);
    setSelectedCurrency('');
    setSelectedAccount('');
    setSelectedBankFormat('');
    setImportStatus(null);
  };

  const canProceedToUpload = selectedCurrency && selectedAccount && selectedBankFormat;

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    const colors = {
      high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      low: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    const labels = { high: 'Alta', medium: 'Media', low: 'Baja' };
    return <Badge className={colors[confidence]} variant="outline">{labels[confidence]}</Badge>;
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'Sin asignar';
    const cat = categories.find(c => c.id === categoryId);
    return cat ? `${cat.categoria} > ${cat.subcategoria}` : 'Sin asignar';
  };

  const selectedCount = parsedTransactions.filter(t => t.selected).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar CSV/Excel
        </Button>
      </DialogTrigger>
      <DialogContent className={step === 'preview' ? 'max-w-5xl max-h-[90vh]' : 'max-w-md'}>
        <DialogHeader>
          <DialogTitle>
            {step === 'select-account' && 'Paso 1: Seleccionar Cuenta y Formato'}
            {step === 'upload' && 'Paso 2: Subir Archivo'}
            {step === 'preview' && 'Paso 3: Revisar y Confirmar'}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'select-account' && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>¿A qué cuenta pertenecen las transacciones?</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.nombre} ({account.tipo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>¿En qué divisa están las transacciones?</Label>
                <Select value={selectedCurrency} onValueChange={(value: string) => setSelectedCurrency(value as 'MXN' | 'USD' | 'EUR')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una divisa" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>¿De qué banco/formato es el archivo?</Label>
                <Select value={selectedBankFormat} onValueChange={setSelectedBankFormat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el formato del banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANK_FORMATS.map((format) => (
                      <SelectItem key={format.id} value={format.id}>
                        {format.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isCreditCard && (
                <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                  <AlertDescription className="text-blue-800 dark:text-blue-200">
                    <strong>Tarjeta de Crédito detectada:</strong> Los abonos/créditos que parezcan reembolsos se marcarán automáticamente con la etiqueta "REEMBOLSO".
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={() => setStep('upload')} disabled={!canProceedToUpload} className="gap-2">
                Siguiente
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-md text-sm">
              <p><strong>Cuenta:</strong> {selectedAccountData?.nombre}</p>
              <p><strong>Divisa:</strong> {selectedCurrency}</p>
              <p><strong>Formato:</strong> {BANK_FORMATS.find(f => f.id === selectedBankFormat)?.name}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="csv-file">Seleccionar archivo</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Archivos soportados:</p>
                  <p className="text-xs">CSV, XLS, XLSX exportados desde tu banco</p>
                </div>
              </div>
            </div>

            {importStatus && (
              <Alert className={importStatus.type === 'error' ? 'border-destructive' : importStatus.type === 'warning' ? 'border-orange-500' : 'border-green-500'}>
                <AlertDescription>
                  {importStatus.message}
                </AlertDescription>
              </Alert>
            )}

            {isProcessing && (
              <div className="text-center text-sm text-muted-foreground">
                Procesando archivo...
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('select-account')} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                {selectedCount} de {parsedTransactions.length} transacciones seleccionadas
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  <Check className="h-4 w-4 mr-1" />
                  Todas
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  <X className="h-4 w-4 mr-1" />
                  Ninguna
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedCount === parsedTransactions.length}
                        onCheckedChange={(checked) => checked ? selectAll() : deselectAll()}
                      />
                    </TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Ingreso</TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Confianza</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedTransactions.map((transaction, index) => (
                    <TableRow key={index} className={!transaction.selected ? 'opacity-50' : ''}>
                      <TableCell>
                        <Checkbox 
                          checked={transaction.selected}
                          onCheckedChange={() => toggleTransaction(index)}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{transaction.fecha}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {transaction.isReembolso && (
                          <Badge variant="outline" className="mr-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            <RefreshCcw className="h-3 w-3 mr-1" />
                            Reembolso
                          </Badge>
                        )}
                        {transaction.comentario}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {transaction.ingreso > 0 ? `$${transaction.ingreso.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {transaction.gasto > 0 ? `$${transaction.gasto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={transaction.suggestedCategoryId || ''} 
                          onValueChange={(value) => updateCategory(index, value)}
                        >
                          <SelectTrigger className="w-[180px] h-8 text-xs">
                            <SelectValue placeholder="Sin asignar">
                              {getCategoryName(transaction.suggestedCategoryId)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.categoria} &gt; {cat.subcategoria}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {getConfidenceBadge(transaction.confidence)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {importStatus && (
              <Alert className={importStatus.type === 'error' ? 'border-destructive' : 'border-green-500'}>
                <AlertDescription>
                  {importStatus.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 justify-between">
              <Button variant="outline" onClick={() => setStep('upload')} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <Button onClick={handleImport} disabled={selectedCount === 0} className="gap-2">
                <ArrowRight className="h-4 w-4" />
                Importar {selectedCount} transacciones
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TransactionImporter;
