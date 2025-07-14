import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileText } from 'lucide-react';
import { Account, Category, Transaction } from '@/types/finance';

interface TransactionImporterProps {
  accounts: Account[];
  categories: Category[];
  onImportTransactions: (transactions: Omit<Transaction, 'id' | 'monto'>[]) => void;
}

interface RawTransaction {
  id: string;
  cuentaId: string;
  fecha: string;
  comentario: string;
  ingreso: string;
  gasto: string;
  subcategoriaId: string;
}

const TransactionImporter = ({ accounts, categories, onImportTransactions }: TransactionImporterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const findAccountByName = (accountName: string): string | null => {
    const normalizedName = accountName.trim().toLowerCase();
    const account = accounts.find(acc => 
      acc.nombre.toLowerCase().includes(normalizedName) || 
      normalizedName.includes(acc.nombre.toLowerCase())
    );
    return account?.id || null;
  };

  const findCategoryBySubcategoria = (subcategoriaName: string): string | null => {
    const normalizedName = subcategoriaName.trim().toLowerCase();
    const category = categories.find(cat => 
      cat.subcategoria.toLowerCase() === normalizedName ||
      cat.subcategoria.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(cat.subcategoria.toLowerCase())
    );
    return category?.id || null;
  };

  const parseAmount = (amountStr: string): number => {
    if (!amountStr || amountStr.trim() === '-') return 0;
    // Remove spaces, remove dots (thousand separators), replace comma with dot for decimal separator
    const cleanAmount = amountStr.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleanAmount);
    console.log(`Parsing amount: "${amountStr}" -> "${cleanAmount}" -> ${parsed}`);
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
      
      if (lines.length < 2) {
        setImportStatus({ type: 'error', message: 'El archivo debe tener al menos 2 líneas (encabezado y datos)' });
        return;
      }

      // Skip header line
      const dataLines = lines.slice(1);
      const transactions: Omit<Transaction, 'id' | 'monto'>[] = [];
      const errors: string[] = [];

      dataLines.forEach((line, index) => {
        try {
          const columns = parseCSVLine(line);
          if (columns.length < 7) return; // Skip invalid lines

          const [csvId, cuentaNombre, fecha, comentario, ingreso, gasto, subcategoriaNombre] = columns;
          
          const cuentaId = findAccountByName(cuentaNombre);
          const subcategoriaId = findCategoryBySubcategoria(subcategoriaNombre);
          
          if (!cuentaId) {
            errors.push(`Línea ${index + 2}: Cuenta "${cuentaNombre}" no encontrada`);
            return;
          }
          
          if (!subcategoriaId) {
            errors.push(`Línea ${index + 2}: Subcategoría "${subcategoriaNombre}" no encontrada`);
            return;
          }

          const ingresoAmount = parseAmount(ingreso);
          const gastoAmount = parseAmount(gasto);
          
          console.log(`Línea ${csvId}: ${cuentaNombre}, Ingreso: ${ingresoAmount}, Gasto: ${gastoAmount}, Monto: ${ingresoAmount - gastoAmount}`);
          
          transactions.push({
            csvId: csvId, // Preservar el ID original del CSV
            cuentaId,
            fecha: new Date(parseDateDDMMYY(fecha)),
            comentario: comentario.trim(),
            ingreso: ingresoAmount,
            gasto: gastoAmount,
            subcategoriaId
          });
        } catch (error) {
          errors.push(`Línea ${index + 2}: Error al procesar - ${error}`);
        }
      });

      if (errors.length > 0) {
        setImportStatus({ 
          type: 'warning', 
          message: `Se importaron ${transactions.length} transacciones con ${errors.length} errores. Primeros errores: ${errors.slice(0, 3).join(', ')}` 
        });
      } else {
        setImportStatus({ 
          type: 'success', 
          message: `Se importaron exitosamente ${transactions.length} transacciones` 
        });
      }

      if (transactions.length > 0) {
        console.log('Importando transacciones:', transactions.length);
        console.log('Primera transacción:', transactions[0]);
        onImportTransactions(transactions);
        console.log('onImportTransactions llamado');
      } else {
        console.log('No hay transacciones para importar');
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
          <DialogTitle>Importar Transacciones desde CSV</DialogTitle>
        </DialogHeader>
        
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
                <p>id;cuentaId;fecha;comentario;ingreso;gasto;subcategoriaId</p>
                <p className="text-xs mt-1">
                  • Separador: punto y coma (;)<br/>
                  • Fecha: DD/MM/YY<br/>
                  • Cuenta y subcategoría: por nombre exacto<br/>
                  • Montos: usar coma como decimal, "-" para vacío
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
      </DialogContent>
    </Dialog>
  );
};

export default TransactionImporter;