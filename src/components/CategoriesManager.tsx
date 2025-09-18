import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Category, TransactionType, Transaction } from '@/types/finance';
import { Plus, Edit, Trash2, Check, X, ArrowUpDown, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { useSampleData } from '@/hooks/useSampleData';
import { toast } from 'sonner';

interface CategoriesManagerProps {
  categories: Category[];
  transactions: Transaction[];
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
}

const transactionTypes: TransactionType[] = ['Ingreso', 'Gastos', 'Aportación', 'Retiro', 'Reembolso'];

export const CategoriesManager = ({
  categories,
  transactions,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}: CategoriesManagerProps) => {
  const { hasSampleData, clearSampleData } = useSampleData();
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedType, setSelectedType] = useState<TransactionType>('Gastos');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Category | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });
  const [formData, setFormData] = useState({
    subcategoria: '',
    categoria: '',
    tipo: 'Gastos' as TransactionType
  });

  const resetForm = () => {
    setFormData({ subcategoria: '', categoria: '', tipo: selectedType });
    setEditingCategory(null);
    setIsAddingCategory(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subcategoria || !formData.categoria || !formData.tipo) return;

    // Limpiar datos de ejemplo antes de crear la primera categoría real
    if (!editingCategory && hasSampleData) {
      const success = await clearSampleData();
      if (success) {
        toast.success('Datos de ejemplo eliminados. Creando tu primera categoría...');
      }
    }

    if (editingCategory) {
      onUpdateCategory(editingCategory.id, formData);
    } else {
      onAddCategory(formData);
    }
    resetForm();
  };

  const handleEdit = (category: Category) => {
    setFormData({
      subcategoria: category.subcategoria,
      categoria: category.categoria,
      tipo: category.tipo
    });
    setEditingCategory(category);
    setIsAddingCategory(true);
  };

  // Filtrar categorías por tipo seleccionado
  const filteredCategories = categories.filter(category => category.tipo === selectedType);

  // Verificar si una categoría está en uso
  const isCategoryInUse = (categoryId: string) => {
    return transactions.some(transaction => transaction.subcategoriaId === categoryId);
  };

  // Función para togglear el seguimiento de pago
  const togglePaymentTracking = (categoryId: string, currentValue: boolean) => {
    onUpdateCategory(categoryId, { seguimiento_pago: !currentValue });
  };

  const handleSort = (key: keyof Category) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey: keyof Category) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  // Filtrar y ordenar categorías
  const filteredAndSortedCategories = filteredCategories.sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    }
    
    return 0;
  });

  const getTypeBadgeVariant = (tipo: TransactionType) => {
    switch (tipo) {
      case 'Ingreso': return 'default';
      case 'Gastos': return 'destructive';
      case 'Aportación': return 'secondary';
      case 'Retiro': return 'outline';
      default: return 'outline';
    }
  };

  const handleNewCategory = () => {
    setFormData({ subcategoria: '', categoria: '', tipo: selectedType });
    setIsAddingCategory(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 space-y-3 sm:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:space-x-4">
          <Select value={selectedType} onValueChange={(value: TransactionType) => setSelectedType(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {transactionTypes.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant={getTypeBadgeVariant(selectedType)} className="self-start">{selectedType}</Badge>
        </div>
        
        <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
          <DialogTrigger asChild>
            <Button onClick={handleNewCategory} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} method="post" className="space-y-4">
              <div>
                <Label htmlFor="categoria">Categoría</Label>
                <Input
                  id="categoria"
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  placeholder="Ej: Alimentación, Transporte"
                  required
                />
              </div>
              <div>
                <Label htmlFor="subcategoria">Subcategoría</Label>
                <Input
                  id="subcategoria"
                  value={formData.subcategoria}
                  onChange={(e) => setFormData({ ...formData, subcategoria: e.target.value })}
                  placeholder="Ej: Supermercado, Gasolina"
                  required
                />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={(value) => setFormData({ ...formData, tipo: value as TransactionType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {transactionTypes.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingCategory ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <Badge variant={getTypeBadgeVariant(selectedType)}>{selectedType}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('subcategoria')} className="h-auto p-0 font-medium hover:bg-transparent">
                    <span className="flex items-center gap-1">
                      Subcategoría
                      {getSortIcon('subcategoria')}
                    </span>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('categoria')} className="h-auto p-0 font-medium hover:bg-transparent">
                    <span className="flex items-center gap-1">
                      Categoría
                      {getSortIcon('categoria')}
                    </span>
                  </Button>
                </TableHead>
                <TableHead>En Uso</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedCategories.length > 0 ? (
                filteredAndSortedCategories.map((category) => {
                  const inUse = isCategoryInUse(category.id);
                  return (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {selectedType === 'Ingreso' && (
                            <Checkbox 
                              checked={category.seguimiento_pago || false}
                              onCheckedChange={() => togglePaymentTracking(category.id, category.seguimiento_pago || false)}
                            />
                          )}
                          <span>{category.subcategoria}</span>
                          {selectedType === 'Ingreso' && category.seguimiento_pago && (
                            <Badge variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              Seguimiento
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{category.categoria}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {inUse ? (
                            <Badge variant="default" className="flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              En uso
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <X className="h-3 w-3" />
                              Sin usar
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEdit(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                disabled={inUse}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Confirmar eliminación</DialogTitle>
                              </DialogHeader>
                              <p>¿Estás seguro de que quieres eliminar la categoría "{category.subcategoria} - {category.categoria}"?</p>
                              <div className="flex justify-end space-x-2 mt-4">
                                <DialogClose asChild>
                                  <Button variant="outline">Cancelar</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                  <Button 
                                    variant="destructive"
                                    onClick={() => onDeleteCategory(category.id)}
                                  >
                                    Eliminar
                                  </Button>
                                </DialogClose>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No hay categorías de tipo {selectedType}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};