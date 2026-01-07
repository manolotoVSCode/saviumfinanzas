import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileText, ArrowRight, ArrowLeft, Sparkles, AlertCircle, CheckCircle2, Loader2, Search, Filter } from 'lucide-react';
import { Account, Category, Transaction } from '@/types/finance';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SmartTransactionImporterProps {
  accounts: Account[];
  categories: Category[];
  onImportTransactions: (transactions: Omit<Transaction, 'id' | 'monto'>[]) => void;
}

interface ParsedTransaction {
  fecha: string;
  comentario: string;
  ingreso: number;
  gasto: number;
  suggestedCategoryId: string;
  suggestedCategory: string;
  suggestedSubcategory: string;
  confidence: 'high' | 'medium' | 'low';
  isNewCategory: boolean;
  selected: boolean;
  editedCategoryId?: string;
}

interface NewCategorySuggestion {
  categoria: string;
  subcategoria: string;
  razon: string;
}

const CURRENCIES: Array<{ value: 'MXN' | 'USD' | 'EUR'; label: string }> = [
  { value: 'MXN', label: 'Peso Mexicano (MXN)' },
  { value: 'USD', label: 'Dólar Americano (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' }
];

type AccountType = 'bank' | 'credit_card';

const ACCOUNT_TYPES: Array<{ value: AccountType; label: string; description: string }> = [
  { value: 'bank', label: 'Cuenta Bancaria', description: 'Negativo = gasto, Positivo = ingreso' },
  { value: 'credit_card', label: 'Tarjeta de Crédito', description: 'Negativo = ingreso/abono, Positivo = gasto/cargo' }
];

const SmartTransactionImporter = ({ accounts, categories, onImportTransactions }: SmartTransactionImporterProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'select_type' | 'upload' | 'preview' | 'configure'>('select_type');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [newCategorySuggestions, setNewCategorySuggestions] = useState<NewCategorySuggestion[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<'MXN' | 'USD' | 'EUR' | ''>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'new'>('all');
  const [accountType, setAccountType] = useState<AccountType | ''>('');
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportStatus({ type: 'info', message: '🤖 Analizando archivo con IA...' });
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('categories', JSON.stringify(categories));
      formData.append('accountType', accountType);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('No hay sesión activa');
      }

      const response = await supabase.functions.invoke('parse-transactions', {
        body: formData,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error al procesar archivo');
      }

      const result = response.data;

      if (!result.success) {
        throw new Error(result.error || 'Error al analizar el archivo');
      }

      const transactionsWithSelection = result.transactions.map((t: any) => ({
        ...t,
        selected: true,
        editedCategoryId: t.suggestedCategoryId,
      }));

      setParsedTransactions(transactionsWithSelection);
      setNewCategorySuggestions(result.newCategorySuggestions || []);
      
      const highConfidence = result.transactions.filter((t: any) => t.confidence === 'high').length;
      const mediumConfidence = result.transactions.filter((t: any) => t.confidence === 'medium').length;
      const lowConfidence = result.transactions.filter((t: any) => t.confidence === 'low').length;

      setImportStatus({ 
        type: 'success', 
        message: `✅ Se detectaron ${result.transactions.length} transacciones. Clasificación: ${highConfidence} alta, ${mediumConfidence} media, ${lowConfidence} baja confianza.` 
      });
      setStep('preview');

    } catch (error) {
      console.error('Error processing file:', error);
      setImportStatus({ 
        type: 'error', 
        message: `Error al procesar el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}` 
      });
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  const toggleTransactionSelection = (index: number) => {
    setParsedTransactions(prev => prev.map((t, i) => 
      i === index ? { ...t, selected: !t.selected } : t
    ));
  };

  const updateTransactionCategory = (index: number, categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    setParsedTransactions(prev => prev.map((t, i) => 
      i === index ? { 
        ...t, 
        editedCategoryId: categoryId,
        suggestedCategory: category?.categoria || t.suggestedCategory,
        suggestedSubcategory: category?.subcategoria || t.suggestedSubcategory,
      } : t
    ));
  };

  const selectAll = () => {
    setParsedTransactions(prev => prev.map(t => ({ ...t, selected: true })));
  };

  const deselectAll = () => {
    setParsedTransactions(prev => prev.map(t => ({ ...t, selected: false })));
  };

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Alta</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Media</Badge>;
      case 'low':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Baja</Badge>;
    }
  };

  const handleImport = () => {
    if (!selectedCurrency || !selectedAccount) {
      setImportStatus({ type: 'error', message: 'Debe seleccionar divisa y cuenta' });
      return;
    }

    const selectedTransactions = parsedTransactions.filter(t => t.selected);
    
    if (selectedTransactions.length === 0) {
      setImportStatus({ type: 'error', message: 'Debe seleccionar al menos una transacción' });
      return;
    }

    const transactions: Omit<Transaction, 'id' | 'monto'>[] = selectedTransactions.map((transaction, index) => {
      const [year, month, day] = transaction.fecha.split('-');
      const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      return {
        csvId: `smart_import_${Date.now()}_${index}`,
        cuentaId: selectedAccount,
        fecha,
        comentario: transaction.comentario,
        ingreso: transaction.ingreso,
        gasto: transaction.gasto,
        subcategoriaId: transaction.editedCategoryId || transaction.suggestedCategoryId,
        divisa: selectedCurrency as 'MXN' | 'USD' | 'EUR'
      };
    });

    onImportTransactions(transactions);
    
    toast({
      title: "Importación exitosa",
      description: `Se importaron ${transactions.length} transacciones`,
    });

    handleClose();
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep('select_type');
    setParsedTransactions([]);
    setNewCategorySuggestions([]);
    setSelectedCurrency('');
    setSelectedAccount('');
    setImportStatus(null);
    setFileName('');
    setSearchTerm('');
    setConfidenceFilter('all');
    setAccountType('');
  };

  const filteredTransactions = parsedTransactions.filter(t => {
    const matchesSearch = searchTerm === '' || 
      t.comentario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.suggestedCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.suggestedSubcategory.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesConfidence = 
      confidenceFilter === 'all' ||
      (confidenceFilter === 'new' && t.isNewCategory) ||
      t.confidence === confidenceFilter;
    
    return matchesSearch && matchesConfidence;
  });

  const selectedCount = parsedTransactions.filter(t => t.selected).length;
  const filteredSelectedCount = filteredTransactions.filter(t => t.selected).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Importar con IA
        </Button>
      </DialogTrigger>
      <DialogContent className={step === 'preview' ? 'max-w-5xl max-h-[90vh]' : 'max-w-md'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {step === 'select_type' && '¿Qué tipo de cuenta estás importando?'}
            {step === 'upload' && 'Importar Transacciones con IA'}
            {step === 'preview' && `Vista Previa - ${fileName}`}
            {step === 'configure' && 'Configurar Importación'}
          </DialogTitle>
        </DialogHeader>

        {step === 'select_type' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Esto determina cómo interpretar los signos (+/-) de los montos:
            </p>
            
            <div className="grid gap-3">
              {ACCOUNT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setAccountType(type.value)}
                  className={`flex flex-col items-start gap-1 p-4 rounded-lg border-2 text-left transition-all ${
                    accountType === type.value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="font-medium">{type.label}</span>
                  <span className="text-xs text-muted-foreground">{type.description}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={() => setStep('upload')} 
                className="flex-1 gap-2" 
                disabled={!accountType}
              >
                <ArrowRight className="h-4 w-4" />
                Continuar
              </Button>
            </div>
          </div>
        )}
        
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="smart-file">Seleccionar archivo</Label>
              <Input
                id="smart-file"
                type="file"
                accept=".csv,.xlsx,.xls,.pdf,.txt"
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Formatos soportados:</p>
                  <p className="text-xs mt-1">
                    • PDF de estados de cuenta bancarios<br/>
                    • Archivos CSV y Excel<br/>
                    • Cualquier formato con transacciones
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-primary/5 p-3 rounded-lg">
                <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-medium text-primary">Clasificación Inteligente</p>
                  <p className="text-xs mt-1">
                    La IA analizará tus transacciones y las clasificará automáticamente 
                    basándose en tus categorías existentes y tu historial.
                  </p>
                </div>
              </div>
            </div>

            {importStatus && (
              <Alert className={
                importStatus.type === 'error' ? 'border-destructive' : 
                importStatus.type === 'warning' ? 'border-orange-500' : 
                importStatus.type === 'info' ? 'border-blue-500' :
                'border-green-500'
              }>
                <AlertDescription className="flex items-center gap-2">
                  {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {importStatus.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button variant="outline" onClick={() => setStep('select_type')} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex flex-col gap-4 max-h-[70vh]">
            {importStatus && (
              <Alert className={`flex-shrink-0 ${importStatus.type === 'error' ? 'border-destructive' : 'border-green-500'}`}>
                <AlertDescription>{importStatus.message}</AlertDescription>
              </Alert>
            )}

            {newCategorySuggestions.length > 0 && (
              <Alert className="flex-shrink-0 border-orange-500 bg-orange-50 dark:bg-orange-950/30">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription>
                  <span className="font-medium text-orange-700 dark:text-orange-400">💡 La IA sugiere crear estas nuevas categorías:</span>
                  <ul className="mt-2 text-xs space-y-1">
                    {newCategorySuggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <Badge variant="outline" className="text-xs border-orange-500 text-orange-600 shrink-0">Nueva</Badge>
                        <span><strong>{s.categoria} &gt; {s.subcategoria}</strong>: {s.razon}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted-foreground">Puedes crearlas en Configuración &gt; Categorías</p>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por comentario o categoría..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
                <Select value={confidenceFilter} onValueChange={(value: 'all' | 'high' | 'medium' | 'low' | 'new') => setConfidenceFilter(value)}>
                  <SelectTrigger className="w-[180px] h-9">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar por..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="high">Alta confianza</SelectItem>
                    <SelectItem value="medium">Media confianza</SelectItem>
                    <SelectItem value="low">Baja confianza</SelectItem>
                    <SelectItem value="new">Categoría nueva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>Seleccionar todo</Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>Deseleccionar todo</Button>
                </div>
                <span className="text-sm text-muted-foreground">
                  {filteredTransactions.length !== parsedTransactions.length && (
                    <span className="mr-2">Mostrando {filteredTransactions.length} de {parsedTransactions.length} •</span>
                  )}
                  {selectedCount} seleccionadas
                </span>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-[200px] max-h-[300px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Comentario</TableHead>
                    <TableHead className="text-right">Ingreso</TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead>Categoría Sugerida</TableHead>
                    <TableHead>Confianza</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No hay transacciones que coincidan con los filtros
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction) => {
                      const originalIndex = parsedTransactions.findIndex(t => t === transaction);
                      return (
                        <TableRow key={originalIndex} className={!transaction.selected ? 'opacity-50' : ''}>
                          <TableCell>
                            <Checkbox 
                              checked={transaction.selected}
                              onCheckedChange={() => toggleTransactionSelection(originalIndex)}
                            />
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{transaction.fecha}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={transaction.comentario}>
                            {transaction.comentario}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {transaction.ingreso > 0 ? `+${formatCurrency(transaction.ingreso)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {transaction.gasto > 0 ? `-${formatCurrency(transaction.gasto)}` : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {transaction.isNewCategory && (
                                <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">Nueva</Badge>
                              )}
                              <Select 
                                value={transaction.editedCategoryId || transaction.suggestedCategoryId}
                                onValueChange={(value) => updateTransactionCategory(originalIndex, value)}
                              >
                                <SelectTrigger className="w-[180px] h-8 text-xs">
                                  <SelectValue>
                                    {transaction.suggestedCategory} &gt; {transaction.suggestedSubcategory}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id} className="text-xs">
                                      {cat.categoria} &gt; {cat.subcategoria}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                          <TableCell>{getConfidenceBadge(transaction.confidence)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex gap-2 flex-shrink-0 pt-2 border-t">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button variant="outline" onClick={() => setStep('upload')} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <Button onClick={() => setStep('configure')} className="gap-2 flex-1" disabled={selectedCount === 0}>
                <ArrowRight className="h-4 w-4" />
                Continuar ({selectedCount} transacciones)
              </Button>
            </div>
          </div>
        )}

        {step === 'configure' && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Configurar {selectedCount} transacciones para importar:
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Cuenta de destino</Label>
                <Select 
                  value={selectedAccount} 
                  onValueChange={(value) => {
                    setSelectedAccount(value);
                    const account = accounts.find(a => a.id === value);
                    if (account) {
                      setSelectedCurrency(account.divisa as 'MXN' | 'USD' | 'EUR');
                    }
                  }}
                >
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
                <p className="text-xs text-muted-foreground">
                  La divisa se auto-selecciona según la cuenta, pero puedes cambiarla si las transacciones están en otra moneda.
                </p>
              </div>

              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                <div>
                  <p className="font-medium">Categorías pre-asignadas</p>
                  <p className="text-xs">Las transacciones ya tienen categorías asignadas por la IA. Puedes modificarlas en el paso anterior.</p>
                </div>
              </div>
            </div>

            {importStatus && importStatus.type === 'error' && (
              <Alert className="border-destructive">
                <AlertDescription>{importStatus.message}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button variant="outline" onClick={() => setStep('preview')} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <Button onClick={handleImport} className="gap-2 flex-1">
                <Upload className="h-4 w-4" />
                Importar {selectedCount} Transacciones
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SmartTransactionImporter;
