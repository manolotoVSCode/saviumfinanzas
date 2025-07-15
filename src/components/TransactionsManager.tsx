import { useState } from 'react';
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
import { Transaction, Account, Category } from '@/types/finance';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';

interface TransactionsManagerProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'monto'>, autoContribution?: { targetAccountId: string }) => void;
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onClearAllTransactions: () => void;
}

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
  
  // Filtros
  const [filters, setFilters] = useState({
    cuentaId: 'all',
    mes: '',
    categoriaId: 'all',
    tipo: 'all'
  });

  const [formData, setFormData] = useState({
    cuentaId: '',
    fecha: new Date().toISOString().split('T')[0],
    comentario: '',
    ingreso: 0,
    gasto: 0,
    subcategoriaId: ''
  });

  const [autoContribution, setAutoContribution] = useState({
    enabled: false,
    targetAccountId: ''
  });

  const [categoryTypeFilter, setCategoryTypeFilter] = useState<string>('all');

  // Aplicar filtros a las transacciones
  const filteredTransactions = transactions.filter(transaction => {
    if (filters.cuentaId && filters.cuentaId !== 'all' && transaction.cuentaId !== filters.cuentaId) return false;
    if (filters.categoriaId && filters.categoriaId !== 'all' && transaction.subcategoriaId !== filters.categoriaId) return false;
    if (filters.tipo && filters.tipo !== 'all' && transaction.tipo !== filters.tipo) return false;
    if (filters.mes) {
      const transactionMonth = transaction.fecha.toISOString().slice(0, 7); // YYYY-MM format
      if (transactionMonth !== filters.mes) return false;
    }
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const resetFilters = () => {
    setFilters({ cuentaId: 'all', mes: '', categoriaId: 'all', tipo: 'all' });
  };

  const resetForm = () => {
    setFormData({
      cuentaId: '',
      fecha: new Date().toISOString().split('T')[0],
      comentario: '',
      ingreso: 0,
      gasto: 0,
      subcategoriaId: ''
    });
    setAutoContribution({
      enabled: false,
      targetAccountId: ''
    });
    setCategoryTypeFilter('all');
    setEditingTransaction(null);
    setIsAddingTransaction(false);
  };

  // Obtener categorías filtradas por tipo
  const getFilteredCategories = () => {
    if (categoryTypeFilter === 'all') return categories;
    return categories.filter(c => c.tipo === categoryTypeFilter);
  };

  // Obtener tipo de categoría seleccionada
  const getSelectedCategoryType = () => {
    if (!formData.subcategoriaId) return null;
    const category = categories.find(c => c.id === formData.subcategoriaId);
    return category?.tipo || null;
  };

  // Verificar si un campo debe estar bloqueado
  const isFieldDisabled = (fieldType: 'ingreso' | 'gasto') => {
    const categoryType = getSelectedCategoryType();
    if (!categoryType) return false;
    
    if (fieldType === 'gasto' && categoryType === 'Ingreso') return true;
    if (fieldType === 'ingreso' && (categoryType === 'Gastos' || categoryType === 'Aportación' || categoryType === 'Retiro')) return true;
    
    return false;
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
      onUpdateTransaction(editingTransaction.id, transactionData);
    } else {
      const autoContrib = autoContribution.enabled && autoContribution.targetAccountId 
        ? { targetAccountId: autoContribution.targetAccountId }
        : undefined;
      onAddTransaction(transactionData, autoContrib);
    }
    resetForm();
  };

  const handleEdit = (transaction: Transaction) => {
    // Verificar si la categoría aún existe
    const categoryExists = categories.some(c => c.id === transaction.subcategoriaId);
    
    setFormData({
      cuentaId: transaction.cuentaId,
      fecha: transaction.fecha.toISOString().split('T')[0],
      comentario: transaction.comentario,
      ingreso: transaction.ingreso,
      gasto: transaction.gasto,
      subcategoriaId: categoryExists ? transaction.subcategoriaId : ''
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

  // Ordenar transacciones filtradas por fecha
  const sortedTransactions = filteredTransactions.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-xl font-semibold">Gestión de Transacciones</h2>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpiar Todo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción eliminará todas las transacciones permanentemente. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onClearAllTransactions} className="bg-red-600 hover:bg-red-700">
                  Eliminar todo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Dialog open={isAddingTransaction} onOpenChange={setIsAddingTransaction}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsAddingTransaction(true)}>
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
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cuentaId">Cuenta</Label>
                    <Select 
                      value={formData.cuentaId} 
                      onValueChange={(value) => setFormData({ ...formData, cuentaId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una cuenta" />
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

                <div>
                  <Label htmlFor="category-type">Tipo de Categoría</Label>
                  <Select 
                    value={categoryTypeFilter} 
                    onValueChange={(value) => {
                      setCategoryTypeFilter(value);
                      // Reset subcategory when changing type filter
                      setFormData(prev => ({ ...prev, subcategoriaId: '' }));
                      setAutoContribution({
                        enabled: false,
                        targetAccountId: ''
                      });
                    }}
                  >
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
                  <Label htmlFor="subcategoriaId">Categoría</Label>
                  <Select 
                    value={formData.subcategoriaId} 
                    onValueChange={(value) => {
                      const category = categories.find(c => c.id === value);
                      const newFormData = { ...formData, subcategoriaId: value };
                      
                      // Resetear campos según el tipo de categoría
                      if (category?.tipo === 'Ingreso') {
                        newFormData.gasto = 0;
                      } else if (category?.tipo === 'Gastos' || category?.tipo === 'Aportación' || category?.tipo === 'Retiro') {
                        newFormData.ingreso = 0;
                      }
                      
                      setFormData(newFormData);
                      
                      // Reset category type filter when changing category
                      if (category?.tipo !== 'Aportación') {
                        setAutoContribution({
                          enabled: false,
                          targetAccountId: ''
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {getFilteredCategories().map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.categoria} - {category.subcategoria} ({category.tipo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ingreso">Ingreso</Label>
                    <Input
                      id="ingreso"
                      type="number"
                      step="0.01"
                      value={formData.ingreso}
                      onChange={(e) => setFormData({ ...formData, ingreso: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      disabled={isFieldDisabled('ingreso')}
                      className={isFieldDisabled('ingreso') ? 'opacity-50 cursor-not-allowed' : ''}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gasto">Gasto</Label>
                    <Input
                      id="gasto"
                      type="number"
                      step="0.01"
                      value={formData.gasto}
                      onChange={(e) => setFormData({ ...formData, gasto: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      disabled={isFieldDisabled('gasto')}
                      className={isFieldDisabled('gasto') ? 'opacity-50 cursor-not-allowed' : ''}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="comentario">Comentario</Label>
                  <Textarea
                    id="comentario"
                    value={formData.comentario}
                    onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
                    placeholder="Descripción de la transacción..."
                    rows={3}
                  />
                </div>

                {/* Sección de aportación automática */}
                {getSelectedCategoryType() === 'Aportación' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="auto-contribution"
                        checked={autoContribution.enabled}
                        onCheckedChange={(checked) => 
                          setAutoContribution(prev => ({ 
                            ...prev, 
                            enabled: !!checked,
                            targetAccountId: checked ? prev.targetAccountId : ''
                          }))
                        }
                      />
                      <Label htmlFor="auto-contribution" className="text-sm font-medium">
                        Crear aportación automática en cuenta destino
                      </Label>
                    </div>
                    
                    {autoContribution.enabled && (
                      <div>
                        <Label htmlFor="target-account">Cuenta destino</Label>
                        <Select 
                          value={autoContribution.targetAccountId} 
                          onValueChange={(value) => 
                            setAutoContribution(prev => ({ ...prev, targetAccountId: value }))
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
                                  {account.nombre} ({account.tipo})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingTransaction ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
              <Label htmlFor="filter-mes">Mes</Label>
              <Select 
                value={filters.mes} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, mes: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los meses" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="">Todos los meses</SelectItem>
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
              <Select 
                value={filters.categoriaId} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, categoriaId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.categoria} - {category.subcategoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <TableHead>ID</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Comentario</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <span className="text-xs text-muted-foreground font-mono">{transaction.id}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{transaction.fecha.toLocaleDateString('es-MX')}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getAccountName(transaction.cuentaId)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{transaction.categoria}</div>
                      <div className="text-sm text-muted-foreground">
                        {categories.find(c => c.id === transaction.subcategoriaId)?.subcategoria || 
                         <span className="text-red-500 italic">Categoría eliminada</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{transaction.comentario}</TableCell>
                  <TableCell className={transaction.monto >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(Math.abs(transaction.monto))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getTypeBadgeVariant(transaction.tipo)}>
                      {transaction.tipo}
                    </Badge>
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