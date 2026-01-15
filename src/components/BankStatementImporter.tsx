import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, AlertCircle, Check, X } from 'lucide-react';
import { Account, Category, Transaction } from '@/types/finance';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface BankStatementImporterProps {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  onImportTransactions: (transactions: Omit<Transaction, 'id' | 'monto'>[]) => Promise<void>;
}

interface ParsedRow {
  id: string;
  fecha: Date;
  descripcion: string;
  monto: number;
  esGasto: boolean;
  esReembolso: boolean;
  categoriaId: string;
  incluir: boolean;
  montoOriginal: number;
}

type Step = 'select-account' | 'upload' | 'preview';

const BankStatementImporter = ({ accounts, categories, transactions, onImportTransactions }: BankStatementImporterProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('select-account');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const selectedAccount = useMemo(() => 
    accounts.find(a => a.id === selectedAccountId),
    [accounts, selectedAccountId]
  );

  const isCreditCard = selectedAccount?.tipo === 'Tarjeta de Crédito';

  // Get "Sin Asignar" category
  const sinAsignarCategory = useMemo(() => 
    categories.find(c => c.subcategoria === 'Sin Asignar' || c.categoria === 'Sin Asignar'),
    [categories]
  );

  // Build a map of descriptions to categories from existing transactions
  const descriptionToCategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    
    transactions.forEach(t => {
      if (t.comentario && t.subcategoriaId) {
        // Normalize description for matching
        const normalized = normalizeDescription(t.comentario);
        if (normalized.length >= 3) {
          map.set(normalized, t.subcategoriaId);
        }
      }
    });
    
    return map;
  }, [transactions]);

  function normalizeDescription(desc: string): string {
    return desc
      .toLowerCase()
      .replace(/[^a-záéíóúñü0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function findMatchingCategory(description: string): string | null {
    const normalized = normalizeDescription(description);
    
    // Direct match
    if (descriptionToCategoryMap.has(normalized)) {
      return descriptionToCategoryMap.get(normalized)!;
    }
    
    // Partial match - find if any existing description is contained in this one or vice versa
    for (const [existingDesc, categoryId] of descriptionToCategoryMap) {
      if (normalized.includes(existingDesc) || existingDesc.includes(normalized)) {
        return categoryId;
      }
      
      // Check first 3 words match
      const words1 = normalized.split(' ').slice(0, 3).join(' ');
      const words2 = existingDesc.split(' ').slice(0, 3).join(' ');
      if (words1.length >= 5 && words1 === words2) {
        return categoryId;
      }
    }
    
    return null;
  }

  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result;
  }

  function parseAmount(amountStr: string): number {
    if (!amountStr) return 0;
    
    // Remove quotes and spaces
    let cleaned = amountStr.replace(/["'\s]/g, '');
    
    // Handle European format (1.234,56) vs American format (1,234.56)
    const hasCommaDecimal = /,\d{1,2}$/.test(cleaned);
    
    if (hasCommaDecimal) {
      // European format: remove dots (thousands), replace comma with dot
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // American format: remove commas
      cleaned = cleaned.replace(/,/g, '');
    }
    
    return parseFloat(cleaned) || 0;
  }

  function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    
    const cleaned = dateStr.trim();
    
    // DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
    }
    
    // DD Mon YYYY (e.g., "06 Jan 2026")
    const ddMonYYYY = cleaned.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
    if (ddMonYYYY) {
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      const month = months[ddMonYYYY[2].toLowerCase()];
      if (month !== undefined) {
        return new Date(parseInt(ddMonYYYY[3]), month, parseInt(ddMonYYYY[1]));
      }
    }
    
    // YYYY-MM-DD
    const yyyymmdd = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (yyyymmdd) {
      return new Date(parseInt(yyyymmdd[1]), parseInt(yyyymmdd[2]) - 1, parseInt(yyyymmdd[3]));
    }
    
    return null;
  }

  function detectFormat(lines: string[][]): { dateCol: number; descCol: number; amountCol: number; hasHeader: boolean } {
    // Try to detect which columns are date, description, and amount
    let dateCol = 0;
    let descCol = 1;
    let amountCol = -1;
    let hasHeader = false;
    
    // Check first few rows to detect format
    for (let rowIdx = 0; rowIdx < Math.min(5, lines.length); rowIdx++) {
      const row = lines[rowIdx];
      
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const cell = row[colIdx];
        
        // Detect date column
        if (parseDate(cell)) {
          dateCol = colIdx;
        }
        
        // Detect amount column (contains numbers with decimals)
        const amount = parseAmount(cell);
        if (amount !== 0 && !isNaN(amount)) {
          amountCol = colIdx;
        }
      }
      
      // Check if first row looks like a header
      if (rowIdx === 0) {
        const firstRowText = row.join(' ').toLowerCase();
        if (firstRowText.includes('fecha') || firstRowText.includes('date') || 
            firstRowText.includes('descripción') || firstRowText.includes('description') ||
            firstRowText.includes('importe') || firstRowText.includes('amount')) {
          hasHeader = true;
        }
      }
    }
    
    // Find description column (longest text that's not date or amount)
    const firstDataRow = lines[hasHeader ? 1 : 0];
    if (firstDataRow) {
      let maxLen = 0;
      for (let i = 0; i < firstDataRow.length; i++) {
        if (i !== dateCol && i !== amountCol) {
          const len = firstDataRow[i].length;
          if (len > maxLen) {
            maxLen = len;
            descCol = i;
          }
        }
      }
    }
    
    return { dateCol, descCol, amountCol, hasHeader };
  }

  function parseCSVContent(content: string): ParsedRow[] {
    // Handle multi-line fields in CSV
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (char === '"') {
        if (inQuotes && content[i + 1] === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && content[i + 1] === '\n') {
          i++;
        }
        if (currentCell || currentRow.length > 0) {
          currentRow.push(currentCell.trim());
          if (currentRow.some(c => c.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentCell = '';
        }
      } else {
        currentCell += char;
      }
    }
    
    // Don't forget last row
    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
    }
    
    if (rows.length === 0) return [];
    
    const { dateCol, descCol, amountCol, hasHeader } = detectFormat(rows);
    const dataRows = hasHeader ? rows.slice(1) : rows;
    
    const parsed: ParsedRow[] = [];
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      const fecha = parseDate(row[dateCol]);
      if (!fecha) continue; // Skip rows without valid date
      
      const descripcion = row[descCol] || '';
      const montoOriginal = parseAmount(row[amountCol]);
      
      if (montoOriginal === 0) continue; // Skip zero amount rows
      
      // Determine if it's an expense based on account type
      let esGasto: boolean;
      if (isCreditCard) {
        // Credit cards: positive = expense, negative = income/payment
        esGasto = montoOriginal > 0;
      } else {
        // Bank accounts: negative = expense, positive = income
        esGasto = montoOriginal < 0;
      }
      
      // Find matching category from history
      const matchedCategoryId = findMatchingCategory(descripcion);
      const categoriaId = matchedCategoryId || sinAsignarCategory?.id || '';
      
      parsed.push({
        id: `import-${i}-${Date.now()}`,
        fecha,
        descripcion,
        monto: Math.abs(montoOriginal),
        esGasto,
        esReembolso: false,
        categoriaId,
        incluir: true,
        montoOriginal
      });
    }
    
    return parsed;
  }

  function parseExcelContent(data: ArrayBuffer): ParsedRow[] {
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][];
    
    // Convert to string arrays
    const rows: string[][] = jsonData.map(row => 
      row.map(cell => {
        if (cell === null || cell === undefined) return '';
        if (typeof cell === 'number') return cell.toString();
        return String(cell);
      })
    );
    
    // Filter out empty rows and metadata rows (like ING header)
    const dataRows = rows.filter(row => {
      const hasDate = row.some(cell => parseDate(cell));
      const hasAmount = row.some(cell => {
        const amt = parseAmount(cell);
        return amt !== 0 && !isNaN(amt);
      });
      return hasDate && hasAmount;
    });
    
    if (dataRows.length === 0) return [];
    
    const { dateCol, descCol, amountCol, hasHeader } = detectFormat(dataRows);
    
    const parsed: ParsedRow[] = [];
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      const fecha = parseDate(row[dateCol]);
      if (!fecha) continue;
      
      // For ING format, description might be in column 3 (DESCRIPCIÓN)
      let descripcion = row[descCol] || '';
      // If we have more columns, check for a better description column
      if (row.length > 4 && row[3] && row[3].length > descripcion.length) {
        descripcion = row[3];
      }
      
      // Find amount column - look for IMPORTE column in ING
      let montoOriginal = parseAmount(row[amountCol]);
      for (let j = row.length - 1; j >= 0; j--) {
        const possibleAmount = parseAmount(row[j]);
        if (possibleAmount !== 0 && !isNaN(possibleAmount)) {
          // Check if this looks like an amount (not a balance)
          if (j < row.length - 1 || amountCol === -1) {
            montoOriginal = possibleAmount;
            break;
          }
        }
      }
      
      if (montoOriginal === 0) continue;
      
      let esGasto: boolean;
      if (isCreditCard) {
        esGasto = montoOriginal > 0;
      } else {
        esGasto = montoOriginal < 0;
      }
      
      const matchedCategoryId = findMatchingCategory(descripcion);
      const categoriaId = matchedCategoryId || sinAsignarCategory?.id || '';
      
      parsed.push({
        id: `import-${i}-${Date.now()}`,
        fecha,
        descripcion,
        monto: Math.abs(montoOriginal),
        esGasto,
        esReembolso: false,
        categoriaId,
        incluir: true,
        montoOriginal
      });
    }
    
    return parsed;
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const isExcel = file.name.endsWith('.xls') || file.name.endsWith('.xlsx');
      
      if (isExcel) {
        const buffer = await file.arrayBuffer();
        const rows = parseExcelContent(buffer);
        if (rows.length === 0) {
          toast({ title: 'Error', description: 'No se encontraron transacciones válidas en el archivo', variant: 'destructive' });
          return;
        }
        setParsedRows(rows);
        setStep('preview');
      } else {
        const text = await file.text();
        const rows = parseCSVContent(text);
        if (rows.length === 0) {
          toast({ title: 'Error', description: 'No se encontraron transacciones válidas en el archivo', variant: 'destructive' });
          return;
        }
        setParsedRows(rows);
        setStep('preview');
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({ title: 'Error', description: 'Error al procesar el archivo', variant: 'destructive' });
    }
  };

  const handleToggleInclude = (id: string) => {
    setParsedRows(prev => prev.map(row => 
      row.id === id ? { ...row, incluir: !row.incluir } : row
    ));
  };

  const handleToggleReembolso = (id: string) => {
    setParsedRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      
      const newEsReembolso = !row.esReembolso;
      
      // If marking as reimbursement, it becomes an expense (positive in gasto column)
      // If unmarking, it goes back to income
      return {
        ...row,
        esReembolso: newEsReembolso,
        esGasto: newEsReembolso ? true : row.montoOriginal < 0 ? !isCreditCard : isCreditCard
      };
    }));
  };

  const handleCategoryChange = (id: string, categoriaId: string) => {
    setParsedRows(prev => prev.map(row =>
      row.id === id ? { ...row, categoriaId } : row
    ));
  };

  const handleImport = async () => {
    const rowsToImport = parsedRows.filter(row => row.incluir);
    
    if (rowsToImport.length === 0) {
      toast({ title: 'Error', description: 'No hay transacciones seleccionadas para importar', variant: 'destructive' });
      return;
    }
    
    setImporting(true);
    
    try {
      const transactionsToImport = rowsToImport.map(row => {
        // Determine the transaction type based on category
        const category = categories.find(c => c.id === row.categoriaId);
        
        return {
          cuentaId: selectedAccountId,
          fecha: row.fecha,
          comentario: row.descripcion,
          ingreso: row.esGasto ? 0 : row.monto,
          gasto: row.esGasto ? row.monto : 0,
          subcategoriaId: row.categoriaId,
          divisa: selectedAccount?.divisa || 'MXN',
        };
      });
      
      await onImportTransactions(transactionsToImport);
      
      toast({ 
        title: 'Importación exitosa', 
        description: `Se importaron ${transactionsToImport.length} transacciones` 
      });
      
      handleClose();
    } catch (error) {
      console.error('Error importing:', error);
      toast({ title: 'Error', description: 'Error al importar transacciones', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setStep('select-account');
    setSelectedAccountId('');
    setParsedRows([]);
  };

  const categoriesByType = useMemo(() => {
    const gastoCategories = categories.filter(c => c.tipo === 'Gastos');
    const ingresoCategories = categories.filter(c => c.tipo === 'Ingreso');
    const reembolsoCategories = categories.filter(c => c.tipo === 'Reembolso');
    return { gastoCategories, ingresoCategories, reembolsoCategories };
  }, [categories]);

  const getCategoriesForRow = (row: ParsedRow) => {
    if (row.esReembolso) {
      return [...categoriesByType.gastoCategories, ...categoriesByType.reembolsoCategories];
    }
    if (row.esGasto) {
      return categoriesByType.gastoCategories;
    }
    return categoriesByType.ingresoCategories;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  const selectedCount = parsedRows.filter(r => r.incluir).length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Estado de Cuenta
        </Button>
      </DialogTrigger>
      
      <DialogContent className={`${step === 'preview' ? 'max-w-6xl max-h-[90vh]' : 'max-w-md'}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Estado de Cuenta
          </DialogTitle>
          <DialogDescription>
            {step === 'select-account' && 'Selecciona la cuenta a la que pertenece el estado de cuenta'}
            {step === 'upload' && 'Sube tu archivo CSV o Excel'}
            {step === 'preview' && `Vista previa - ${selectedCount} de ${parsedRows.length} transacciones seleccionadas`}
          </DialogDescription>
        </DialogHeader>
        
        {step === 'select-account' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cuenta</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.nombre} ({account.tipo}) - {account.divisa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedAccount && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p><strong>Tipo:</strong> {selectedAccount.tipo}</p>
                <p><strong>Divisa:</strong> {selectedAccount.divisa}</p>
                <p className="text-muted-foreground mt-2">
                  {isCreditCard 
                    ? 'En tarjetas de crédito: valores positivos = gastos, negativos = pagos/abonos'
                    : 'En cuentas bancarias: valores negativos = gastos, positivos = ingresos'
                  }
                </p>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button 
                onClick={() => setStep('upload')} 
                disabled={!selectedAccountId}
              >
                Continuar
              </Button>
            </div>
          </div>
        )}
        
        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Input
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Arrastra o haz clic para subir</p>
                <p className="text-sm text-muted-foreground mt-1">CSV o Excel (.csv, .xls, .xlsx)</p>
              </label>
            </div>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('select-account')}>
                Atrás
              </Button>
            </div>
          </div>
        )}
        
        {step === 'preview' && (
          <div className="space-y-4 overflow-hidden">
            <div className="overflow-auto max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={parsedRows.every(r => r.incluir)}
                        onCheckedChange={(checked) => {
                          setParsedRows(prev => prev.map(r => ({ ...r, incluir: !!checked })));
                        }}
                      />
                    </TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Ingreso</TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead className="w-20 text-center">Reembolso</TableHead>
                    <TableHead>Categoría</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map(row => {
                    const category = categories.find(c => c.id === row.categoriaId);
                    const isSinAsignar = !category || category.subcategoria === 'Sin Asignar';
                    
                    return (
                      <TableRow key={row.id} className={!row.incluir ? 'opacity-50' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={row.incluir}
                            onCheckedChange={() => handleToggleInclude(row.id)}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(row.fecha)}</TableCell>
                        <TableCell className="max-w-xs truncate" title={row.descripcion}>
                          {row.descripcion}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {!row.esGasto ? formatMoney(row.monto) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {row.esGasto ? formatMoney(row.monto) : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {!row.esGasto && !row.esReembolso ? (
                            <Checkbox
                              checked={row.esReembolso}
                              onCheckedChange={() => handleToggleReembolso(row.id)}
                            />
                          ) : row.esReembolso ? (
                            <Checkbox
                              checked={true}
                              onCheckedChange={() => handleToggleReembolso(row.id)}
                            />
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.categoriaId}
                            onValueChange={(value) => handleCategoryChange(row.id, value)}
                          >
                            <SelectTrigger className={`w-40 ${isSinAsignar ? 'border-yellow-500' : ''}`}>
                              <SelectValue>
                                {category ? `${category.categoria} - ${category.subcategoria}` : 'Sin Asignar'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {getCategoriesForRow(row).map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.categoria} - {cat.subcategoria}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={() => { setParsedRows([]); setStep('upload'); }}>
                Atrás
              </Button>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {selectedCount} transacciones a importar
                </span>
                <Button onClick={handleImport} disabled={importing || selectedCount === 0}>
                  {importing ? 'Importando...' : 'Importar'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BankStatementImporter;
