import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Pencil, Trash2, Search, Filter } from 'lucide-react';
import Layout from '@/components/Layout';
import { useClassificationRules, ClassificationRule } from '@/hooks/useClassificationRules';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';

const MATCH_TYPE_LABELS: Record<string, string> = {
  exact: 'Exacta',
  contains: 'Contiene',
  starts_with: 'Empieza con',
};

const ReglasClasificacion = () => {
  const navigate = useNavigate();
  const { rules, loading, addRule, updateRule, deleteRule } = useClassificationRules();
  const { categories, transactions, loading: loadingFinance } = useFinanceDataSupabase();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ClassificationRule | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [keyword, setKeyword] = useState('');
  const [matchType, setMatchType] = useState<string>('contains');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState('0');
  const [active, setActive] = useState(true);

  // Group categories by parent for the select
  const groupedCategories = useMemo(() => {
    const groups: Record<string, typeof categories> = {};
    categories.forEach(c => {
      if (!groups[c.categoria]) groups[c.categoria] = [];
      groups[c.categoria].push(c);
    });
    return groups;
  }, [categories]);

  // Count matching transactions per rule
  const matchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rules.forEach(rule => {
      const kw = rule.keyword.toLowerCase().trim();
      let count = 0;
      transactions.forEach(t => {
        const comment = (t.comentario || '').toLowerCase();
        switch (rule.match_type) {
          case 'exact':
            if (comment === kw) count++;
            break;
          case 'contains':
            if (comment.includes(kw)) count++;
            break;
          case 'starts_with':
            if (comment.startsWith(kw)) count++;
            break;
        }
      });
      counts[rule.id] = count;
    });
    return counts;
  }, [rules, transactions]);

  const filteredRules = useMemo(() => {
    if (!searchQuery) return rules;
    const q = searchQuery.toLowerCase();
    return rules.filter(r => 
      r.keyword.toLowerCase().includes(q) ||
      getCategoryLabel(r.category_id).toLowerCase().includes(q)
    );
  }, [rules, searchQuery, categories]);

  function getCategoryLabel(catId: string) {
    const cat = categories.find(c => c.id === catId);
    return cat ? `${cat.categoria} > ${cat.subcategoria}` : 'Desconocida';
  }

  function openNew() {
    setEditingRule(null);
    setKeyword('');
    setMatchType('contains');
    setCategoryId('');
    setPriority('0');
    setActive(true);
    setDialogOpen(true);
  }

  function openEdit(rule: ClassificationRule) {
    setEditingRule(rule);
    setKeyword(rule.keyword);
    setMatchType(rule.match_type);
    setCategoryId(rule.category_id);
    setPriority(String(rule.priority));
    setActive(rule.active);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!keyword.trim() || !categoryId) return;

    const data = {
      keyword: keyword.trim(),
      match_type: matchType as 'exact' | 'contains' | 'starts_with',
      category_id: categoryId,
      priority: parseInt(priority) || 0,
      active,
    };

    if (editingRule) {
      await updateRule(editingRule.id, data);
    } else {
      await addRule(data);
    }
    setDialogOpen(false);
  }

  if (loading || loadingFinance) {
    return (
      <Layout>
        <div className="animate-fade-in flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/configuracion')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Filter className="h-6 w-6" />
            <h1 className="text-2xl md:text-3xl font-bold">Reglas de Clasificación</h1>
          </div>
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Nueva Regla
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reglas activas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Estas reglas se aplican automáticamente al importar estados de cuenta. Las reglas con mayor prioridad se evalúan primero.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por palabra clave o categoría..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {filteredRules.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {rules.length === 0 
                  ? 'No hay reglas de clasificación. Crea una nueva para empezar.'
                  : 'No se encontraron reglas con ese criterio.'
                }
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Palabra clave</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-center">Coincidencias</TableHead>
                      <TableHead className="text-center">Prioridad</TableHead>
                      <TableHead className="text-center">Activa</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRules.map(rule => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.keyword}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{MATCH_TYPE_LABELS[rule.match_type]}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{getCategoryLabel(rule.category_id)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={matchCounts[rule.id] > 0 ? 'default' : 'secondary'}>
                            {matchCounts[rule.id] || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{rule.priority}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={rule.active}
                            onCheckedChange={checked => updateRule(rule.id, { active: checked })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar regla?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Se eliminará la regla para "{rule.keyword}". Esta acción no se puede deshacer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteRule(rule.id)} className="bg-destructive text-destructive-foreground">
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog para crear/editar regla */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Editar Regla' : 'Nueva Regla de Clasificación'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Palabra clave</Label>
              <Input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="ej: AMAZON, UBER, NETFLIX..."
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de coincidencia</Label>
              <Select value={matchType} onValueChange={setMatchType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contiene — la descripción incluye esta palabra</SelectItem>
                  <SelectItem value="starts_with">Empieza con — la descripción comienza con esta palabra</SelectItem>
                  <SelectItem value="exact">Exacta — la descripción es exactamente esta palabra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoría asignada</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(groupedCategories).map(([group, cats]) => (
                    cats.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {group} {'>'} {c.subcategoria}
                      </SelectItem>
                    ))
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridad (mayor = se evalúa primero)</Label>
              <Input
                type="number"
                value={priority}
                onChange={e => setPriority(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={active} onCheckedChange={setActive} />
              <Label>Regla activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!keyword.trim() || !categoryId}>
              {editingRule ? 'Guardar cambios' : 'Crear regla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ReglasClasificacion;
