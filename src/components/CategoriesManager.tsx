import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Category, TransactionType } from '@/types/finance';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface CategoriesManagerProps {
  categories: Category[];
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
}

const transactionTypes: TransactionType[] = ['Ingreso', 'Gastos', 'Aportación', 'Retiro'];

export const CategoriesManager = ({
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}: CategoriesManagerProps) => {
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedType, setSelectedType] = useState<TransactionType>('Gastos');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subcategoria || !formData.categoria || !formData.tipo) return;

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
      <div className="flex justify-between items-center space-x-4">
        <div className="flex items-center space-x-4">
          <Select value={selectedType} onValueChange={(value: TransactionType) => setSelectedType(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {transactionTypes.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant={getTypeBadgeVariant(selectedType)}>{selectedType}</Badge>
        </div>
        
        <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
          <DialogTrigger asChild>
            <Button onClick={handleNewCategory}>
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
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <TableHead>Categoría</TableHead>
                <TableHead>Subcategoría</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.length > 0 ? (
                filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.categoria}</TableCell>
                    <TableCell>{category.subcategoria}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEdit(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => onDeleteCategory(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
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