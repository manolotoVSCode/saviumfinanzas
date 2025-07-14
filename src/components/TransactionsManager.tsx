import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Transaction, Account, Category } from '@/types/finance';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';

interface TransactionsManagerProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'monto'>) => void;
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
    categoriaId: 'all'
  });

  const [formData, setFormData] = useState({
    cuentaId: '',
    fecha: new Date().toISOString().split('T')[0],
    comentario: '',
    ingreso: 0,
    gasto: 0,
    subcategoriaId: ''
  });

  // Aplicar filtros a las transacciones
  const filteredTransactions = transactions.filter(transaction => {
    if (filters.cuentaId && filters.cuentaId !== 'all' && transaction.cuentaId !== filters.cuentaId) return false;
    if (filters.categoriaId && filters.categoriaId !== 'all' && transaction.subcategoriaId !== filters.categoriaId) return false;
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
    setFilters({ cuentaId: 'all', mes: '', categoriaId: 'all' });
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
    setEditingTransaction(null);
    setIsAddingTransaction(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cuentaId || !formData.subcategoriaId) return;

    const transactionData = {
      ...formData,
      fecha: new Date(formData.fecha)
    };

    if (editingTransaction) {
      onUpdateTransaction(editingTransaction.id, transactionData);
    } else {
      onAddTransaction(transactionData);
    }
    resetForm();
  };

  const handleEdit = (transaction: Transaction) => {
    setFormData({
      cuentaId: transaction.cuentaId,
      fecha: transaction.fecha.toISOString().split('T')[0],
      comentario: transaction.comentario,
      ingreso: transaction.ingreso,
      gasto: transaction.gasto,
      subcategoriaId: transaction.subcategoriaId
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
          <Button 
            variant="outline" 
            onClick={onClearAllTransactions}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpiar Todo
          </Button>
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
                  <Label htmlFor="subcategoriaId">Categoría</Label>
                  <Select 
                    value={formData.subcategoriaId} 
                    onValueChange={(value) => setFormData({ ...formData, subcategoriaId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="filter-cuenta">Cuenta</Label>
              <Select 
                value={filters.cuentaId} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, cuentaId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las cuentas" />
                </SelectTrigger>
                <SelectContent>
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
              <Input
                type="month"
                value={filters.mes}
                onChange={(e) => setFilters(prev => ({ ...prev, mes: e.target.value }))}
                placeholder="Seleccionar mes"
              />
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
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.categoria} - {category.subcategoria}
                    </SelectItem>
                  ))}
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
                        {categories.find(c => c.id === transaction.subcategoriaId)?.subcategoria}
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
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => onDeleteTransaction(transaction.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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