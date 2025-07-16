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
  cuentaNombre: string;
  fecha: string;
  comentario: string;
  ingreso: number;
  gasto: number;
  subcategoriaNombre: string;
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
    // Usar split simple con punto y coma para este formato específico
    const parts = line.split(';');
    
    // Limpiar espacios de cada parte
    return parts.map(part => part.trim());
  };

  const parseAmount = (amountStr: string): number => {
    if (!amountStr || amountStr.trim() === '' || amountStr.trim() === '-') return 0;
    
    // Limpiar espacios
    let clean = amountStr.replace(/\s/g, '');
    
    // Si tiene formato europeo (ej: 94.591,88), convertir a formato americano (94591.88)
    if (clean.includes('.') && clean.includes(',')) {
      // Remover puntos (separadores de miles) y cambiar coma por punto
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',') && !clean.includes('.')) {
      // Solo tiene coma, es separador decimal
      clean = clean.replace(',', '.');
    }
    
    const parsed = parseFloat(clean);
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
          // Saltar línea de encabezado si coincide con el formato esperado
          if (line.toLowerCase().includes('id;cuentaid;fecha;comentario;ingreso;gasto;subcategoriaid')) {
            return;
          }
          
          const columns = parseCSVLine(line);
          console.log(`Línea ${index + 1}:`, columns);
          
          if (columns.length < 7) {
            errors.push(`Línea ${index + 1}: Formato incorrecto (se esperan 7 columnas: id;cuentaId;fecha;comentario;ingreso;gasto;subcategoriaId). Encontradas: ${columns.length}`);
            return;
          }

          const [id, cuentaId, fecha, comentario, ingreso, gasto, subcategoriaId] = columns;
          
          const ingresoAmount = parseAmount(ingreso);
          const gastoAmount = parseAmount(gasto);
          
          console.log(`Procesando transacción ${index + 1}:`, {
            cuentaId,
            fecha,
            comentario: comentario.substring(0, 30) + '...',
            ingreso: ingresoAmount,
            gasto: gastoAmount,
            subcategoriaId
          });
          
          transactions.push({
            cuentaNombre: cuentaId.trim(),
            fecha: parseDateDDMMYY(fecha),
            comentario: comentario.trim(),
            ingreso: ingresoAmount,
            gasto: gastoAmount,
            subcategoriaNombre: subcategoriaId.trim()
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
    if (!selectedCurrency) {
      setImportStatus({ type: 'error', message: 'Debe seleccionar divisa' });
      return;
    }

    // Función para encontrar subcategoría por nombre
    const findSubcategoryByName = (nombreSubcategoria: string) => {
      // Buscar categoría que coincida con el nombre
      const categoria = categories.find(cat => 
        cat.subcategoria.toLowerCase().includes(nombreSubcategoria.toLowerCase()) ||
        cat.categoria.toLowerCase().includes(nombreSubcategoria.toLowerCase()) ||
        nombreSubcategoria.toLowerCase().includes(cat.subcategoria.toLowerCase()) ||
        nombreSubcategoria.toLowerCase().includes(cat.categoria.toLowerCase())
      );
      
      // Si no encuentra, usar SIN ASIGNAR como fallback
      if (!categoria) {
        const sinAsignar = categories.find(cat => 
          cat.subcategoria.toLowerCase().includes('sin asignar') || 
          cat.subcategoria.toLowerCase().includes('sin categoría') ||
          cat.categoria.toLowerCase().includes('sin categoría')
        );
        return sinAsignar?.id || categories[0]?.id || 'cat-1';
      }
      
      return categoria.id;
    };

    // Función para encontrar cuenta por nombre
    const findAccountByName = (nombreCuenta: string) => {
      const cuenta = accounts.find(acc => 
        acc.nombre.toLowerCase().includes(nombreCuenta.toLowerCase()) ||
        nombreCuenta.toLowerCase().includes(acc.nombre.toLowerCase())
      );
      
      if (!cuenta) {
        console.warn(`No se encontró cuenta para: ${nombreCuenta}, usando primera cuenta disponible`);
        return accounts[0]?.id || '';
      }
      
      return cuenta.id;
    };

    const transactions: Omit<Transaction, 'id' | 'monto'>[] = parsedTransactions.map((transaction, index) => {
      const cuentaId = findAccountByName(transaction.cuentaNombre);
      const subcategoriaId = findSubcategoryByName(transaction.subcategoriaNombre);
      
      console.log(`Transacción ${index + 1}:`, {
        cuenta: transaction.cuentaNombre,
        cuentaId,
        subcategoria: transaction.subcategoriaNombre,
        subcategoriaId,
        ingreso: transaction.ingreso,
        gasto: transaction.gasto
      });
      
      return {
        csvId: `import_${Date.now()}_${index}`,
        cuentaId: cuentaId,
        fecha: new Date(transaction.fecha),
        comentario: transaction.comentario,
        ingreso: transaction.ingreso,
        gasto: transaction.gasto,
        subcategoriaId: subcategoriaId,
        divisa: selectedCurrency as 'MXN' | 'USD' | 'EUR'
      };
    });

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
                  <p className="font-medium">Formato esperado (7 columnas):</p>
                  <p>id;cuentaId;fecha;comentario;ingreso;gasto;subcategoriaId</p>
                  <p className="text-xs mt-1">
                    • Separador: punto y coma (;)<br/>
                    • Fecha: DD/M/YY (ej: 30/4/25)<br/>
                    • Montos: usar coma como decimal y espacios para miles<br/>
                    • Ejemplo: 1;HSBC;30/4/25;MT RENDIMIENTO 0425; 94.591,88 ; -   ;Nómina<br/>
                    • El ID se ignora (puede ser cualquier valor)<br/>
                    • Las cuentas y categorías se asignan automáticamente
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

              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                <p className="font-medium mb-1">Importación automática</p>
                <p>• Las cuentas se asignarán automáticamente por nombre del CSV</p>
                <p>• Las subcategorías se buscarán por nombre del CSV</p>
                <p>• Si no se encuentra la subcategoría, se asignará "SIN ASIGNAR"</p>
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