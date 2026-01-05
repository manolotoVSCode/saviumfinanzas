import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Transaction, Account, Category } from '@/types/finance';
import { Plus, Edit, Trash2, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransactionsManagerProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'monto'>, autoContribution?: { targetAccountId: string; targetAccountType: 'Aportación' | 'Retiro' }) => void;
  onUpdateTransaction: (id: string, updates: Partial<Transaction>, autoContribution?: { targetAccountId: string; targetAccountType: 'Aportación' | 'Retiro' }) => void;
  onDeleteTransaction: (id: string) => void;
  onClearAllTransactions: () => void;
}

type SortField = 'fecha' | 'cuenta' | 'categoria' | 'comentario' | 'monto' | 'divisa' | 'tipo';
type SortDirection = 'asc' | 'desc' | null;

export const TransactionsManager = ({
  transactions,
  accounts,
  categories,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onClearAllTransactions
}: TransactionsManagerProps) => {
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Estados para ordenamiento
  const [sortField, setSortField] = useState<SortField>('fecha');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Estados para selección múltiple
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [isEditingBulk, setIsEditingBulk] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkIsReimbursement, setBulkIsReimbursement] = useState(false);
  const [bulkFilters, setBulkFilters] = useState({
    tipo: 'all',
    busqueda: ''
  });
  
  // Estados para cambio de mes masivo
  const [isEditingBulkDate, setIsEditingBulkDate] = useState(false);
  const [bulkDate, setBulkDate] = useState('');
  
  // Estado para el filtro de categorías con búsqueda
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
  
  // Estado para el selector de categorías en el formulario
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  
  // Estado para el selector de cuentas en el formulario
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  
  // Estado para el selector de categorías en cambio masivo
  const [bulkCategoryOpen, setBulkCategoryOpen] = useState(false);
  
  // Filtros
  const [filters, setFilters] = useState(() => {
    try {
      const stored = localStorage.getItem('transactions_filters_v2');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      // ignore parsing errors
    }
    return {
      cuentaId: 'all',
      mes: 'all',
      categoriaId: 'all',
      tipo: 'all',
      divisa: 'all',
      comentario: '',
      minAmount: '',
      maxAmount: '',
      importadas: 'all',
      montos: 'all',
      reembolsos: 'all' // 'all' | 'solo' | 'excluir'
    };
  });

  // Persistir filtros para mantenerlos tras recargas/refetch
  useEffect(() => {
    try {
      localStorage.setItem('transactions_filters_v2', JSON.stringify(filters));
    } catch (e) {
      // ignore storage errors
    }
  }, [filters]);

  const [formData, setFormData] = useState({
    cuentaId: '',
    fecha: new Date().toISOString().split('T')[0],
    comentario: '',
    ingreso: 0,
    gasto: 0,
    subcategoriaId: '',
    divisa: 'MXN' as 'MXN' | 'USD' | 'EUR'
  });

  const [autoContribution, setAutoContribution] = useState({
    enabled: false,
    targetAccountId: '',
    targetAccountType: 'Aportación' as 'Aportación' | 'Retiro'
  });

  const [categoryTypeFilter, setCategoryTypeFilter] = useState<string>('all');
  
  // Estado para marcar transacción como reembolso (ingreso asociado a categoría de gasto)
  const [isReimbursement, setIsReimbursement] = useState(false);


  // Aplicar filtros a las transacciones
  const filteredTransactions = transactions.filter(transaction => {
    if (filters.cuentaId && filters.cuentaId !== 'all' && transaction.cuentaId !== filters.cuentaId) return false;
    
    // Filtro por transacciones de hoy
    if (filters.importadas && filters.importadas !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const createdAt = transaction.created_at;
      const isToday = createdAt && createdAt >= today && createdAt < tomorrow;
      
      if (filters.importadas === 'hoy' && !isToday) return false;
      if (filters.importadas === 'anteriores' && isToday) return false;
    }
    
    // Para filtro de categoría, también incluir transacciones sin categoría válida
    if (filters.categoriaId && filters.categoriaId !== 'all') {
      const category = categories.find(c => c.id === transaction.subcategoriaId);
      const categoryExists = !!category;
      
      if (filters.categoriaId === 'sin-asignar') {
        // Mostrar transacciones sin categoría válida O con categoría "SIN ASIGNAR"
        const isSinAsignarCategory = category && 
          category.categoria.trim().toLowerCase() === 'sin asignar' && 
          category.subcategoria.trim().toLowerCase() === 'sin asignar';
        
        if (!(!categoryExists || isSinAsignarCategory)) return false;
      } else {
        // Filtro por categoría específica
        if (!categoryExists || transaction.subcategoriaId !== filters.categoriaId) return false;
      }
    }
    
    if (filters.tipo && filters.tipo !== 'all' && transaction.tipo !== filters.tipo) return false;
    if (filters.divisa && filters.divisa !== 'all' && transaction.divisa !== filters.divisa) return false;
    if (filters.mes && filters.mes !== 'all') {
      const adjustedDate = new Date(transaction.fecha.getTime() + transaction.fecha.getTimezoneOffset() * 60000);
      const transactionMonth = adjustedDate.toISOString().slice(0, 7); // YYYY-MM format
      if (transactionMonth !== filters.mes) return false;
    }
    
    // Filtro por comentario (mínimo 3 caracteres)
    if (filters.comentario && filters.comentario.length >= 3) {
      if (!transaction.comentario.toLowerCase().includes(filters.comentario.toLowerCase())) return false;
    }
    
    // Filtro por monto mínimo
    if (filters.minAmount && filters.minAmount !== '') {
      const minAmount = parseFloat(filters.minAmount);
      if (!isNaN(minAmount) && Math.abs(transaction.monto) < minAmount) return false;
    }
    
    // Filtro por monto máximo
    if (filters.maxAmount && filters.maxAmount !== '') {
      const maxAmount = parseFloat(filters.maxAmount);
      if (!isNaN(maxAmount) && Math.abs(transaction.monto) > maxAmount) return false;
    }
    
    // Filtro por montos positivos/negativos
    if (filters.montos && filters.montos !== 'all') {
      if (filters.montos === 'positivos' && transaction.monto < 0) return false;
      if (filters.montos === 'negativos' && transaction.monto >= 0) return false;
    }
    
    // Filtro por reembolsos (ingreso > 0 asociado a categoría tipo 'Gastos')
    if (filters.reembolsos && filters.reembolsos !== 'all') {
      const category = categories.find(c => c.id === transaction.subcategoriaId);
      const isReembolso = transaction.ingreso > 0 && category?.tipo === 'Gastos';
      
      if (filters.reembolsos === 'solo' && !isReembolso) return false;
      if (filters.reembolsos === 'excluir' && isReembolso) return false;
    }
    
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const resetFilters = () => {
    setFilters({ cuentaId: 'all', mes: 'all', categoriaId: 'all', tipo: 'all', divisa: 'all', comentario: '', minAmount: '', maxAmount: '', importadas: 'all', montos: 'all', reembolsos: 'all' });
  };

  const resetForm = () => {
    setFormData({
      cuentaId: '',
      fecha: new Date().toISOString().split('T')[0],
      comentario: '',
      ingreso: 0,
      gasto: 0,
      subcategoriaId: '',
      divisa: 'MXN' as 'MXN' | 'USD' | 'EUR'
    });
    setAutoContribution({
      enabled: false,
      targetAccountId: '',
      targetAccountType: 'Aportación'
    });
    setCategoryTypeFilter('all');
    setIsReimbursement(false);
    setEditingTransaction(null);
    // Mantener los filtros para conservar la vista del usuario
  };

  const openNewTransaction = () => {
    setEditingTransaction(null);
    setCategoryTypeFilter('all');
    setIsReimbursement(false);
    setAutoContribution({ enabled: false, targetAccountId: '', targetAccountType: 'Aportación' });
    setFormData({
      cuentaId: '',
      fecha: new Date().toISOString().split('T')[0],
      comentario: '',
      ingreso: 0,
      gasto: 0,
      subcategoriaId: '',
      divisa: 'MXN'
    });
    setIsAddingTransaction(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsAddingTransaction(open);
    if (!open) {
      resetForm();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cuentaId || !formData.subcategoriaId) return;
    
    // Validar que si el checkbox está marcado, haya una cuenta destino seleccionada
    if (autoContribution.enabled && !autoContribution.targetAccountId) {
      alert('Debes seleccionar una cuenta destino para la aportación automática');
      return;
    }

    const transactionData = {
      ...formData,
      fecha: new Date(formData.fecha + 'T12:00:00')
    };

    if (editingTransaction) {
      const autoContrib = autoContribution.enabled && autoContribution.targetAccountId 
        ? { targetAccountId: autoContribution.targetAccountId, targetAccountType: autoContribution.targetAccountType }
        : undefined;
      onUpdateTransaction(editingTransaction.id, transactionData, autoContrib);
    } else {
      const autoContrib = autoContribution.enabled && autoContribution.targetAccountId 
        ? { targetAccountId: autoContribution.targetAccountId, targetAccountType: autoContribution.targetAccountType }
        : undefined;
      onAddTransaction(transactionData, autoContrib);
    }
    
    // Cerrar el diálogo pero NO resetear los filtros para mantener la vista actual
    setIsAddingTransaction(false);
    resetForm(); // Solo resetear el formulario, no los filtros
  };

  const handleEdit = (transaction: Transaction) => {
    // Verificar si la categoría aún existe
    const categoryExists = categories.some(c => c.id === transaction.subcategoriaId);
    
    setFormData({
      cuentaId: transaction.cuentaId,
      fecha: new Date(transaction.fecha.getTime() + transaction.fecha.getTimezoneOffset() * 60000).toISOString().split('T')[0],
      comentario: transaction.comentario,
      ingreso: transaction.ingreso,
      gasto: transaction.gasto,
      subcategoriaId: categoryExists ? transaction.subcategoriaId : '',
      divisa: transaction.divisa || 'MXN'
    });
    
    // Resetear aportación automática al editar
    setAutoContribution({
      enabled: false,
      targetAccountId: '',
      targetAccountType: 'Aportación'
    });
    
    setEditingTransaction(transaction);
    setIsAddingTransaction(true);
  };

  const getAccountName = (cuentaId: string) => {
    return accounts.find(acc => acc.id === cuentaId)?.nombre || 'Cuenta desconocida';
  };

  const getTypeBadgeVariant = (tipo?: string) => {
    switch (tipo) {
      case 'Ingreso': return 'default';
      case 'Gastos': return 'destructive';
      case 'Aportación': return 'secondary';
      case 'Retiro': return 'outline';
      default: return 'outline';
    }
  };

  // Función para manejar el ordenamiento
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Si es el mismo campo, cambiar dirección
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc');
    } else {
      // Si es un campo diferente, empezar con ascendente
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Función para obtener el icono de ordenamiento
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-4 w-4" />;
    if (sortDirection === 'desc') return <ArrowDown className="h-4 w-4" />;
    return <ArrowUpDown className="h-4 w-4" />;
  };

  // Ordenar transacciones filtradas
  const getSortedTransactions = () => {
    let sorted = [...filteredTransactions];
    
    if (sortDirection && sortField) {
      sorted.sort((a, b) => {
        let valueA: any;
        let valueB: any;
        
        switch (sortField) {
          case 'fecha':
            valueA = a.fecha.getTime();
            valueB = b.fecha.getTime();
            break;
          case 'cuenta':
            valueA = getAccountName(a.cuentaId).toLowerCase();
            valueB = getAccountName(b.cuentaId).toLowerCase();
            break;
          case 'categoria':
            const catA = categories.find(c => c.id === a.subcategoriaId);
            const catB = categories.find(c => c.id === b.subcategoriaId);
            valueA = catA ? `${catA.categoria} - ${catA.subcategoria}`.toLowerCase() : 'zzz';
            valueB = catB ? `${catB.categoria} - ${catB.subcategoria}`.toLowerCase() : 'zzz';
            break;
          case 'comentario':
            valueA = a.comentario.toLowerCase();
            valueB = b.comentario.toLowerCase();
            break;
          case 'monto':
            valueA = Math.abs(a.monto);
            valueB = Math.abs(b.monto);
            break;
          case 'divisa':
            valueA = a.divisa || 'MXN';
            valueB = b.divisa || 'MXN';
            break;
          case 'tipo':
            valueA = a.tipo || '';
            valueB = b.tipo || '';
            break;
          default:
            return 0;
        }
        
        if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Ordenamiento por defecto: fecha descendente
      sorted.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
    }
    
    return sorted;
  };

  const sortedTransactions = getSortedTransactions();

  // Funciones para selección múltiple
  const handleSelectTransaction = (transactionId: string, checked: boolean) => {
    const newSelected = new Set(selectedTransactions);
    if (checked) {
      newSelected.add(transactionId);
    } else {
      newSelected.delete(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransactions(new Set(sortedTransactions.map(t => t.id)));
    } else {
      setSelectedTransactions(new Set());
    }
  };

  const handleBulkDelete = async () => {
    for (const transactionId of selectedTransactions) {
      onDeleteTransaction(transactionId);
    }
    setSelectedTransactions(new Set());
  };

  const handleBulkCategoryChange = async () => {
    for (const transactionId of selectedTransactions) {
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) continue;

      const updates: Partial<Transaction> = { subcategoriaId: bulkCategoryId };
      
      // Si es reembolso, convertir el gasto a ingreso
      if (bulkIsReimbursement && transaction.gasto > 0) {
        updates.ingreso = transaction.gasto;
        updates.gasto = 0;
      }
      
      onUpdateTransaction(transactionId, updates);
    }
    setSelectedTransactions(new Set());
    setIsEditingBulk(false);
    setBulkCategoryId('');
    setBulkIsReimbursement(false);
  };

  const handleBulkDateChange = async () => {
    for (const transactionId of selectedTransactions) {
      onUpdateTransaction(transactionId, { fecha: new Date(bulkDate + 'T12:00:00') });
    }
    setSelectedTransactions(new Set());
    setIsEditingBulkDate(false);
    setBulkDate('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-xl font-semibold">Gestión de Transacciones</h2>
        <div className="flex gap-2">
          <Dialog open={isAddingTransaction} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button onClick={openNewTransaction}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Transacción
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingTransaction ? 'Editar Transacción' : 'Nueva Transacción'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} method="post" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cuentaId">Cuenta</Label>
                    <Popover open={accountFormOpen} onOpenChange={setAccountFormOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={accountFormOpen}
                          className="w-full justify-between"
                        >
                          {formData.cuentaId
                            ? accounts.find((account) => account.id === formData.cuentaId)?.nombre + 
                              " (" + accounts.find((account) => account.id === formData.cuentaId)?.divisa + ")"
                            : "Selecciona una cuenta"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Buscar cuenta..." />
                          <CommandList>
                            <CommandEmpty>No se encontró la cuenta.</CommandEmpty>
                            <CommandGroup>
                              {accounts.map((account) => (
                                <CommandItem
                                  key={account.id}
                                  value={`${account.nombre} ${account.divisa}`}
                                  onSelect={() => {
                                    setFormData({ 
                                      ...formData, 
                                      cuentaId: account.id,
                                      divisa: account.divisa || 'MXN'
                                    });
                                    setAccountFormOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.cuentaId === account.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {account.nombre} ({account.divisa})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label htmlFor="fecha">Fecha</Label>
                    <Input
                      id="fecha"
                      type="date"
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Checkbox para marcar como reembolso */}
                <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg border">
                  <Checkbox
                    id="isReimbursement"
                    checked={isReimbursement}
                    onCheckedChange={(checked) => {
                      setIsReimbursement(checked as boolean);
                      // Si es reembolso, forzar filtro a Gastos y convertir gasto a ingreso
                      if (checked) {
                        setCategoryTypeFilter('Gastos');
                        // Convertir el gasto actual a ingreso si existe
                        const currentGasto = formData.gasto || 0;
                        const currentIngreso = formData.ingreso || 0;
                        setFormData({ 
                          ...formData, 
                          subcategoriaId: '', 
                          ingreso: currentGasto > 0 ? currentGasto : currentIngreso,
                          gasto: 0 
                        });
                      } else {
                        setCategoryTypeFilter('all');
                        // Al desmarcar, NO borrar el ingreso, solo limpiar categoría
                        setFormData({ ...formData, subcategoriaId: '' });
                      }
                    }}
                  />
                  <div className="flex flex-col">
                    <Label htmlFor="isReimbursement" className="cursor-pointer font-medium">
                      Es un reembolso
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      Registrar un ingreso asociado a una categoría de gasto
                    </span>
                  </div>
                </div>

                {/* Filtro de categorías por tipo - después de cuenta y fecha */}
                <div>
                  <Label htmlFor="tipo-categoria">Filtrar categorías por tipo</Label>
                  <Select 
                    value={categoryTypeFilter} 
                    onValueChange={(value) => {
                      setCategoryTypeFilter(value);
                      // Limpiar la categoría seleccionada cuando se cambia el filtro
                      setFormData({ ...formData, subcategoriaId: '' });
                    }}
                    disabled={isReimbursement} // Deshabilitar si es reembolso
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      <SelectItem value="Ingreso">Solo Ingresos</SelectItem>
                      <SelectItem value="Gastos">Solo Gastos</SelectItem>
                      <SelectItem value="Aportación">Solo Aportaciones</SelectItem>
                      <SelectItem value="Retiro">Solo Retiros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subcategoriaId">Categoría</Label>
                  <Popover open={categoryFormOpen} onOpenChange={setCategoryFormOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={categoryFormOpen}
                        className="w-full justify-between"
                      >
                        {formData.subcategoriaId 
                          ? categories.find(cat => cat.id === formData.subcategoriaId)
                              ? `${categories.find(cat => cat.id === formData.subcategoriaId)?.categoria} - ${categories.find(cat => cat.id === formData.subcategoriaId)?.subcategoria}`
                              : 'Selecciona una categoría'
                          : 'Selecciona una categoría'
                        }
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 bg-background">
                      <Command>
                        <CommandInput placeholder="Buscar categoría..." />
                        <CommandList>
                          <CommandEmpty>No se encontraron categorías.</CommandEmpty>
                          <CommandGroup>
                            {categories
                              .filter(category => categoryTypeFilter === 'all' || category.tipo === categoryTypeFilter)
                              .map((category) => (
                                <CommandItem
                                  key={category.id}
                                  value={`${category.categoria} ${category.subcategoria}`}
                                  onSelect={() => {
                                    setFormData({ 
                                      ...formData, 
                                      subcategoriaId: category.id,
                                      // Limpiar campos de ingreso/gasto según el tipo de categoría
                                      ingreso: category.tipo === 'Ingreso' || category.tipo === 'Aportación' ? formData.ingreso : 0,
                                      gasto: category.tipo === 'Gastos' || category.tipo === 'Retiro' ? formData.gasto : 0
                                    });
                                    setCategoryFormOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.subcategoriaId === category.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {category.categoria} - {category.subcategoria} ({category.tipo})
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="comentario">Comentario</Label>
                  <Textarea
                    id="comentario"
                    value={formData.comentario}
                    onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
                    placeholder="Descripción de la transacción"
                    required
                  />
                </div>

                {/* Campos de ingreso/gasto con lógica de bloqueo */}
                <div className="grid grid-cols-3 gap-4">
                  {(() => {
                    const selectedCategory = categories.find(cat => cat.id === formData.subcategoriaId);
                    // Si es reembolso, permitir ingreso aunque sea categoría de gasto
                    const isIngresoType = isReimbursement || selectedCategory?.tipo === 'Ingreso' || selectedCategory?.tipo === 'Aportación';
                    // Si es reembolso, bloquear gasto
                    const isGastoType = !isReimbursement && (selectedCategory?.tipo === 'Gastos' || selectedCategory?.tipo === 'Retiro');
                    
                    return (
                      <>
                        <div>
                          <Label htmlFor="ingreso">
                            {isReimbursement ? 'Monto del reembolso' : 'Ingreso'}
                          </Label>
                          <Input
                            id="ingreso"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.ingreso || ''}
                            onChange={(e) => setFormData({ ...formData, ingreso: parseFloat(e.target.value) || 0 })}
                            disabled={selectedCategory && !isIngresoType}
                            placeholder={selectedCategory && !isIngresoType ? "Bloqueado para este tipo" : "0.00"}
                          />
                        </div>

                        <div>
                          <Label htmlFor="gasto">Gasto</Label>
                          <Input
                            id="gasto"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.gasto || ''}
                            onChange={(e) => setFormData({ ...formData, gasto: parseFloat(e.target.value) || 0 })}
                            disabled={isReimbursement || (selectedCategory && !isGastoType)}
                            placeholder={isReimbursement ? "Deshabilitado (es reembolso)" : (selectedCategory && !isGastoType ? "Bloqueado para este tipo" : "0.00")}
                          />
                        </div>

                        <div>
                          <Label htmlFor="divisa">Divisa</Label>
                          <Select 
                            value={formData.divisa} 
                            onValueChange={(value: 'MXN' | 'USD' | 'EUR') => setFormData({ ...formData, divisa: value })}
                            disabled={!!formData.cuentaId} // Deshabilitado si ya se seleccionó una cuenta
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MXN">MXN</SelectItem>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                            </SelectContent>
                          </Select>
                          {formData.cuentaId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Divisa automática basada en la cuenta seleccionada
                            </p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>


                {/* Aportación automática disponible para crear y editar */}
                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="autoContribution"
                      checked={autoContribution.enabled}
                      onCheckedChange={(checked) => 
                        setAutoContribution({ ...autoContribution, enabled: checked as boolean })
                      }
                    />
                    <Label htmlFor="autoContribution">
                      Generar aportación automática a otra cuenta
                    </Label>
                  </div>

                  {autoContribution.enabled && (
                    <div className="mt-2 space-y-2">
                      <div>
                        <Label htmlFor="targetAccountType">Tipo de transacción en cuenta destino</Label>
                        <Select 
                          value={autoContribution.targetAccountType} 
                          onValueChange={(value: 'Aportación' | 'Retiro') => 
                            setAutoContribution({ ...autoContribution, targetAccountType: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Aportación">Aportación</SelectItem>
                            <SelectItem value="Retiro">Retiro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="targetAccount">Cuenta destino</Label>
                        <Select 
                          value={autoContribution.targetAccountId} 
                          onValueChange={(value) => 
                            setAutoContribution({ ...autoContribution, targetAccountId: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona cuenta destino" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts
                              .filter(account => account.id !== formData.cuentaId)
                              .map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.nombre} ({account.divisa})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {editingTransaction && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Al editar, se creará una nueva transacción automática adicional
                          </p>
                        )}
                      </div>
                      
                      {/* Preview de la transacción automática */}
                      {autoContribution.targetAccountId && (formData.ingreso > 0 || formData.gasto > 0) && (
                        <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-dashed">
                          <p className="text-sm font-medium mb-2 text-muted-foreground">
                            📋 Resumen de transacción automática:
                          </p>
                          {(() => {
                            const isGasto = formData.gasto > 0;
                            const originalAmount = isGasto ? formData.gasto : formData.ingreso;
                            const targetAccount = accounts.find(a => a.id === autoContribution.targetAccountId);
                            
                            let autoTipo: string;
                            let autoMonto: string;
                            let badgeClass: string;
                            
                            if (autoContribution.targetAccountType === 'Aportación') {
                              autoTipo = 'Aportación (Ingreso)';
                              autoMonto = `+${formatCurrency(originalAmount)}`;
                              badgeClass = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
                            } else if (autoContribution.targetAccountType === 'Retiro') {
                              autoTipo = 'Retiro (Gasto)';
                              autoMonto = `-${formatCurrency(originalAmount)}`;
                              badgeClass = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
                            } else if (isGasto) {
                              autoTipo = 'Ingreso';
                              autoMonto = `+${formatCurrency(originalAmount)}`;
                              badgeClass = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
                            } else {
                              autoTipo = 'Gasto';
                              autoMonto = `-${formatCurrency(originalAmount)}`;
                              badgeClass = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
                            }
                            
                            return (
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Cuenta destino:</span>
                                  <span className="font-medium">{targetAccount?.nombre || 'No seleccionada'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Tipo:</span>
                                  <Badge className={badgeClass}>{autoTipo}</Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Monto:</span>
                                  <span className={`font-bold ${autoMonto.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                                    {autoMonto}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Comentario:</span>
                                  <span className="text-xs truncate max-w-[200px]">
                                    Automática ({autoTipo}): {formData.comentario || '...'}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddingTransaction(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingTransaction ? 'Actualizar' : 'Crear'} Transacción
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* BOTONES DE ACCIONES EN GRUPO - FIJOS */}
      <div className="flex flex-wrap gap-3 items-center">
        {selectedTransactions.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
            <span className="text-sm font-medium">
              {selectedTransactions.size} seleccionada{selectedTransactions.size > 1 ? 's' : ''}
            </span>
          </div>
        )}
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              size="sm"
              disabled={selectedTransactions.size === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Seleccionadas {selectedTransactions.size > 0 && `(${selectedTransactions.size})`}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar transacciones seleccionadas?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminarán {selectedTransactions.size} transacciones permanentemente. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isEditingBulk} onOpenChange={setIsEditingBulk}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={selectedTransactions.size === 0}
            >
              <Edit className="h-4 w-4 mr-2" />
              Cambiar Categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar Categoría de {selectedTransactions.size} Transacciones</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bulk-tipo">Filtrar por tipo</Label>
                  <Select value={bulkFilters.tipo} onValueChange={(value) => setBulkFilters(prev => ({ ...prev, tipo: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="Ingreso">Ingreso</SelectItem>
                      <SelectItem value="Gastos">Gastos</SelectItem>
                      <SelectItem value="Aportación">Aportación</SelectItem>
                      <SelectItem value="Retiro">Retiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="bulk-busqueda">Buscar categoría</Label>
                  <Input
                    id="bulk-busqueda"
                    value={bulkFilters.busqueda}
                    onChange={(e) => setBulkFilters(prev => ({ ...prev, busqueda: e.target.value }))}
                    placeholder="Buscar... (mín. 3 letras)"
                  />
                  {bulkFilters.busqueda.length > 0 && bulkFilters.busqueda.length < 3 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Mínimo 3 caracteres para buscar
                    </p>
                  )}
                </div>
              </div>
              {/* Checkbox de Reembolso */}
              <div className="flex items-center space-x-2 p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/30">
                <Checkbox
                  id="bulk-reimbursement"
                  checked={bulkIsReimbursement}
                  onCheckedChange={(checked) => {
                    setBulkIsReimbursement(checked as boolean);
                    if (checked) {
                      // Forzar filtro a categorías de gasto
                      setBulkFilters(prev => ({ ...prev, tipo: 'Gastos' }));
                    }
                  }}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="bulk-reimbursement" className="text-sm font-medium cursor-pointer">
                    Marcar como reembolso
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Convierte el gasto en ingreso y lo asocia a la categoría de gasto seleccionada
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="bulk-categoria">Nueva Categoría</Label>
                <Popover open={bulkCategoryOpen} onOpenChange={setBulkCategoryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={bulkCategoryOpen}
                      className="w-full justify-between"
                    >
                      {bulkCategoryId
                        ? (() => {
                            const cat = categories.find(c => c.id === bulkCategoryId);
                            return cat ? `${cat.categoria} - ${cat.subcategoria}` : 'Selecciona una categoría';
                          })()
                        : 'Selecciona una categoría'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 bg-background z-50" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar categoría..." />
                      <CommandList>
                        <CommandEmpty>No se encontró categoría.</CommandEmpty>
                        <CommandGroup>
                          {(() => {
                            let filteredCategories = categories;
                            
                            // Filtrar por tipo (forzar Gastos si es reembolso)
                            const effectiveTypeFilter = bulkIsReimbursement ? 'Gastos' : bulkFilters.tipo;
                            if (effectiveTypeFilter !== 'all') {
                              filteredCategories = filteredCategories.filter(cat => cat.tipo === effectiveTypeFilter);
                            }
                            
                            // Filtrar por búsqueda externa (solo si tiene 3+ caracteres)
                            if (bulkFilters.busqueda.length >= 3) {
                              const searchTerm = bulkFilters.busqueda.toLowerCase();
                              filteredCategories = filteredCategories.filter(cat => 
                                cat.categoria.toLowerCase().includes(searchTerm) ||
                                cat.subcategoria.toLowerCase().includes(searchTerm)
                              );
                            }
                            
                            return filteredCategories.map((category) => (
                              <CommandItem
                                key={category.id}
                                value={`${category.categoria} ${category.subcategoria}`}
                                onSelect={() => {
                                  setBulkCategoryId(category.id);
                                  setBulkCategoryOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    bulkCategoryId === category.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span className="font-bold">{category.categoria}</span> - <span className="font-normal">{category.subcategoria}</span>
                              </CommandItem>
                            ));
                          })()}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditingBulk(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleBulkCategoryChange} disabled={!bulkCategoryId}>
                  Aplicar Cambios
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditingBulkDate} onOpenChange={setIsEditingBulkDate}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={selectedTransactions.size === 0}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Cambiar Fecha
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar Fecha de {selectedTransactions.size} Transacciones</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bulk-date">Nueva Fecha</Label>
                <Input
                  id="bulk-date"
                  type="date"
                  value={bulkDate}
                  onChange={(e) => setBulkDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditingBulkDate(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleBulkDateChange} disabled={!bulkDate}>
                  Aplicar Cambios
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Filtros
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Limpiar Filtros
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="filter-cuenta">Cuenta</Label>
              <Select 
                value={filters.cuentaId} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, cuentaId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las cuentas" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">Todas las cuentas</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-comentario">Comentario</Label>
              <Input
                id="filter-comentario"
                type="text"
                placeholder="Buscar por comentario (min. 3 letras)"
                value={filters.comentario}
                onChange={(e) => setFilters(prev => ({ ...prev, comentario: e.target.value }))}
              />
              {filters.comentario.length > 0 && filters.comentario.length < 3 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Mínimo 3 caracteres para filtrar
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="filter-mes">Mes</Label>
              <Select 
                value={filters.mes} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, mes: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los meses" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">Todos los meses</SelectItem>
                  <SelectItem value={new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 7)}>
                    Este mes
                  </SelectItem>
                  <SelectItem value={new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 7)}>
                    Mes anterior
                  </SelectItem>
                  <SelectItem value={new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 7)}>
                    Enero {new Date().getFullYear()}
                  </SelectItem>
                  <SelectItem value={new Date(new Date().getFullYear(), 1, 1).toISOString().slice(0, 7)}>
                    Febrero {new Date().getFullYear()}
                  </SelectItem>
                  <SelectItem value={new Date(new Date().getFullYear(), 2, 1).toISOString().slice(0, 7)}>
                    Marzo {new Date().getFullYear()}
                  </SelectItem>
                  <SelectItem value={new Date(new Date().getFullYear(), 3, 1).toISOString().slice(0, 7)}>
                    Abril {new Date().getFullYear()}
                  </SelectItem>
                  <SelectItem value={new Date(new Date().getFullYear(), 4, 1).toISOString().slice(0, 7)}>
                    Mayo {new Date().getFullYear()}
                  </SelectItem>
                  <SelectItem value={new Date(new Date().getFullYear(), 5, 1).toISOString().slice(0, 7)}>
                    Junio {new Date().getFullYear()}
                  </SelectItem>
                  <SelectItem value={new Date(new Date().getFullYear(), 6, 1).toISOString().slice(0, 7)}>
                    Julio {new Date().getFullYear()}
                  </SelectItem>
                  <SelectItem value={new Date(new Date().getFullYear(), 7, 1).toISOString().slice(0, 7)}>
                    Agosto {new Date().getFullYear()}
                  </SelectItem>
                  <SelectItem value={new Date(new Date().getFullYear(), 8, 1).toISOString().slice(0, 7)}>
                    Septiembre {new Date().getFullYear()}
                  </SelectItem>
                  <SelectItem value={new Date(new Date().getFullYear(), 9, 1).toISOString().slice(0, 7)}>
                    Octubre {new Date().getFullYear()}
                  </SelectItem>
                  <SelectItem value={new Date(new Date().getFullYear(), 10, 1).toISOString().slice(0, 7)}>
                    Noviembre {new Date().getFullYear()}
                  </SelectItem>
                  <SelectItem value={new Date(new Date().getFullYear(), 11, 1).toISOString().slice(0, 7)}>
                    Diciembre {new Date().getFullYear()}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="filter-categoria">Categoría</Label>
              <Popover open={categoryFilterOpen} onOpenChange={setCategoryFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryFilterOpen}
                    className="w-full justify-between"
                  >
                    {filters.categoriaId === 'all' 
                      ? 'Todas las categorías' 
                      : filters.categoriaId === 'sin-asignar'
                      ? 'SIN ASIGNAR'
                      : categories.find(cat => cat.id === filters.categoriaId)?.categoria + ' - ' + categories.find(cat => cat.id === filters.categoriaId)?.subcategoria || 'Seleccionar categoría'
                    }
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-background">
                  <Command>
                    <CommandInput placeholder="Buscar categoría..." />
                    <CommandList>
                      <CommandEmpty>No se encontraron categorías.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setFilters(prev => ({ ...prev, categoriaId: 'all' }));
                            setCategoryFilterOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filters.categoriaId === 'all' ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Todas las categorías
                        </CommandItem>
                        <CommandItem
                          value="sin-asignar"
                          onSelect={() => {
                            setFilters(prev => ({ ...prev, categoriaId: 'sin-asignar' }));
                            setCategoryFilterOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filters.categoriaId === 'sin-asignar' ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="text-destructive font-semibold">SIN ASIGNAR</span>
                        </CommandItem>
                        {categories
                          .filter((category) => !(
                            category.categoria && category.subcategoria &&
                            category.categoria.trim().toLowerCase() === 'sin asignar' &&
                            category.subcategoria.trim().toLowerCase() === 'sin asignar'
                          ))
                          .map((category) => (
                            <CommandItem
                              key={category.id}
                              value={`${category.categoria} ${category.subcategoria}`}
                              onSelect={() => {
                                setFilters(prev => ({ ...prev, categoriaId: category.id }));
                                setCategoryFilterOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  filters.categoriaId === category.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="font-bold">{category.categoria}</span> - <span className="font-normal">{category.subcategoria}</span>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="filter-tipo">Tipo</Label>
              <Select 
                value={filters.tipo} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="Ingreso">Ingreso</SelectItem>
                  <SelectItem value="Gastos">Gastos</SelectItem>
                  <SelectItem value="Aportación">Aportación</SelectItem>
                  <SelectItem value="Retiro">Retiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-divisa">Divisa</Label>
              <Select 
                value={filters.divisa} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, divisa: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las divisas" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">Todas las divisas</SelectItem>
                  <SelectItem value="MXN">MXN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="filter-min-amount">Monto Mínimo</Label>
              <Input
                id="filter-min-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Monto mínimo"
                value={filters.minAmount}
                onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="filter-max-amount">Monto Máximo</Label>
              <Input
                id="filter-max-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Monto máximo"
                value={filters.maxAmount}
                onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="filter-importadas">Transacciones Importadas</Label>
              <Select 
                value={filters.importadas} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, importadas: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="hoy">De Hoy</SelectItem>
                  <SelectItem value="anteriores">Anteriores</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="filter-montos">Tipo de Monto</Label>
              <Select 
                value={filters.montos} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, montos: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="positivos">Solo Positivos (Ingresos)</SelectItem>
                  <SelectItem value="negativos">Solo Negativos (Gastos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="filter-reembolsos">Reembolsos</Label>
              <Select 
                value={filters.reembolsos} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, reembolsos: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="solo">Solo Reembolsos</SelectItem>
                  <SelectItem value="excluir">Excluir Reembolsos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Transacciones ({filteredTransactions.length} 
            {filteredTransactions.length !== transactions.length && 
              ` de ${transactions.length} total`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedTransactions.size === sortedTransactions.length && sortedTransactions.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Seleccionar todas"
                  />
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('fecha')}
                  >
                    <div className="flex items-center gap-2">
                      Fecha
                      {getSortIcon('fecha')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('cuenta')}
                  >
                    <div className="flex items-center gap-2">
                      Cuenta
                      {getSortIcon('cuenta')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('categoria')}
                  >
                    <div className="flex items-center gap-2">
                      Categoría
                      {getSortIcon('categoria')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('comentario')}
                  >
                    <div className="flex items-center gap-2">
                      Comentario
                      {getSortIcon('comentario')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('monto')}
                  >
                    <div className="flex items-center gap-2">
                      Monto
                      {getSortIcon('monto')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('divisa')}
                  >
                    <div className="flex items-center gap-2">
                      Divisa
                      {getSortIcon('divisa')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('tipo')}
                  >
                    <div className="flex items-center gap-2">
                      Tipo
                      {getSortIcon('tipo')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedTransactions.has(transaction.id)}
                      onCheckedChange={(checked) => handleSelectTransaction(transaction.id, checked as boolean)}
                      aria-label={`Seleccionar transacción ${transaction.comentario}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(transaction.fecha.getTime() + transaction.fecha.getTimezoneOffset() * 60000).toLocaleDateString('es-MX')}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getAccountName(transaction.cuentaId)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {(() => {
                        const category = categories.find(c => c.id === transaction.subcategoriaId);
                        if (category) {
                          return (
                             <>
                               <div className="font-medium">{category.subcategoria}</div>
                               <div className="text-sm text-muted-foreground">{category.categoria}</div>
                             </>
                          );
                        } else {
                          return (
                            <>
                              <div className="font-medium text-destructive">SIN ASIGNAR</div>
                              <div className="text-sm text-muted-foreground">Sin clasificar</div>
                            </>
                          );
                        }
                      })()}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{transaction.comentario}</TableCell>
                  <TableCell className={transaction.monto >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(transaction.monto))}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {transaction.divisa || 'MXN'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={getTypeBadgeVariant(transaction.tipo)}>
                        {transaction.tipo}
                      </Badge>
                      {(() => {
                        const category = categories.find(c => c.id === transaction.subcategoriaId);
                        const isReimbursement = transaction.ingreso > 0 && category?.tipo === 'Gastos';
                        if (isReimbursement) {
                          return (
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700">
                              Reembolso
                            </Badge>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(transaction)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar transacción?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción eliminará permanentemente esta transacción. Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => onDeleteTransaction(transaction.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};