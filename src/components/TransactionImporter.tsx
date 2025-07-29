import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, ArrowRight, ArrowLeft } from 'lucide-react';
import { Account, Category, Transaction } from '@/types/finance';

interface TransactionImporterProps {
  accounts: Account[];
  categories: Category[];
  onImportTransactions: (transactions: Omit<Transaction, 'id' | 'monto'>[]) => void;
}

interface ParsedCSVTransaction {
  fecha: string;
  comentario: string;
  ingreso: number;
  gasto: number;
}

const CURRENCIES: Array<{ value: 'MXN' | 'USD' | 'EUR'; label: string }> = [
  { value: 'MXN', label: 'Peso Mexicano (MXN)' },
  { value: 'USD', label: 'Dólar Americano (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' }
];

const TransactionImporter = ({ accounts, categories, onImportTransactions }: TransactionImporterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'configure'>('upload');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedCSVTransaction[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<'MXN' | 'USD' | 'EUR' | ''>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ';' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const parseAmount = (amountStr: string): number => {
    if (!amountStr || amountStr.trim() === '' || amountStr.trim() === '0') return 0;
    // Replace comma with dot for decimal separator
    const cleanAmount = amountStr.replace(/\s/g, '').replace(',', '.');
    const parsed = parseFloat(cleanAmount);
    return isNaN(parsed) ? 0 : parsed;
  };

  const parseDateDDMMYY = (dateStr: string): string => {
    try {
      const parts = dateStr.split('/');
      if (parts.length !== 3) return new Date().toISOString().split('T')[0];
      
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      let year = parts[2];
      
      // Convert YY to YYYY (assuming 20YY for years < 50, 19YY for years >= 50)
      if (year.length === 2) {
        const yearNum = parseInt(year);
        year = yearNum < 50 ? `20${year}` : `19${year}`;
      }
      
      return `${year}-${month}-${day}`;
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportStatus(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        setImportStatus({ type: 'error', message: 'El archivo está vacío' });
        return;
      }

      const transactions: ParsedCSVTransaction[] = [];
      const errors: string[] = [];

      lines.forEach((line, index) => {
        try {
          const columns = parseCSVLine(line);
          if (columns.length < 4) {
            errors.push(`Línea ${index + 1}: Formato incorrecto (se esperan 4 columnas)`);
            return;
          }

          const [fecha, comentario, ingreso, gasto] = columns;
          
          const ingresoAmount = parseAmount(ingreso);
          const gastoAmount = parseAmount(gasto);
          
          transactions.push({
            fecha: parseDateDDMMYY(fecha),
            comentario: comentario.trim(),
            ingreso: ingresoAmount,
            gasto: gastoAmount
          });
        } catch (error) {
          errors.push(`Línea ${index + 1}: Error al procesar - ${error}`);
        }
      });

      if (errors.length > 0) {
        setImportStatus({ 
          type: 'warning', 
          message: `Se procesaron ${transactions.length} transacciones con ${errors.length} errores. Primeros errores: ${errors.slice(0, 3).join(', ')}` 
        });
      } else {
        setImportStatus({ 
          type: 'success', 
          message: `Se procesaron exitosamente ${transactions.length} transacciones` 
        });
      }

      if (transactions.length > 0) {
        setParsedTransactions(transactions);
        setStep('configure');
      }

    } catch (error) {
      setImportStatus({ 
        type: 'error', 
        message: `Error al procesar el archivo: ${error}` 
      });
    } finally {
      setIsProcessing(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleImport = () => {
    if (!selectedCurrency || !selectedAccount) {
      setImportStatus({ type: 'error', message: 'Debe seleccionar divisa y cuenta' });
      return;
    }

    // Buscar categoría "SIN ASIGNAR" o usar la primera disponible
    const defaultCategory = categories.find(cat => 
      cat.categoria.toLowerCase() === 'sin asignar' || 
      cat.subcategoria.toLowerCase() === 'sin asignar'
    ) || categories[0];

    if (!defaultCategory) {
      setImportStatus({ type: 'error', message: 'No hay categorías disponibles. Debe crear al menos una categoría antes de importar.' });
      return;
    }

    const transactions: Omit<Transaction, 'id' | 'monto'>[] = parsedTransactions.map((transaction, index) => ({
      csvId: `import_${Date.now()}_${index}`,
      cuentaId: selectedAccount,
      fecha: new Date(transaction.fecha),
      comentario: transaction.comentario,
      ingreso: transaction.ingreso,
      gasto: transaction.gasto,
      subcategoriaId: defaultCategory.id,
      divisa: selectedCurrency as 'MXN' | 'USD' | 'EUR'
    }));

    onImportTransactions(transactions);
    
    setImportStatus({ 
      type: 'success', 
      message: `Se importaron exitosamente ${transactions.length} transacciones` 
    });

    // Reset form
    setTimeout(() => {
      setIsOpen(false);
      setStep('upload');
      setParsedTransactions([]);
      setSelectedCurrency('');
      setSelectedAccount('');
      setImportStatus(null);
    }, 2000);
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep('upload');
    setParsedTransactions([]);
    setSelectedCurrency('');
    setSelectedAccount('');
    setImportStatus(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Transacciones
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' ? 'Importar Transacciones desde CSV' : 'Configurar Importación'}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'upload' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">Seleccionar archivo CSV</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Formato esperado:</p>
                  <p>Fecha;Comentario;Ingreso;Gasto</p>
                  <p className="text-xs mt-1">
                    • Separador: punto y coma (;)<br/>
                    • Fecha: DD/MM/AA<br/>
                    • Montos: usar coma como decimal<br/>
                    • Ejemplo: 15/03/25;Compra de comida;0;250
                  </p>
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
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Se procesaron {parsedTransactions.length} transacciones. Configure los siguientes parámetros:
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Divisa de las transacciones</Label>
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
                <Label>Cuenta de destino</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.nombre} ({account.divisa})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                <p className="font-medium mb-1">Categoría automática</p>
                <p>Las transacciones se asignarán automáticamente a "SIN ASIGNAR" y podrán ser categorizadas manualmente después.</p>
              </div>
            </div>

            {importStatus && (
              <Alert className={importStatus.type === 'error' ? 'border-destructive' : 'border-green-500'}>
                <AlertDescription>
                  {importStatus.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('upload')} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <Button onClick={handleImport} className="gap-2 flex-1">
                <ArrowRight className="h-4 w-4" />
                Importar Transacciones
              </Button>
            </div>
          </div>
        )}

        {step === 'upload' && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TransactionImporter;