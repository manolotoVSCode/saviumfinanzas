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
import { matchesClassificationRule } from '@/lib/classificationRules';
import { Transaction } from '@/types/finance';

const MATCH_TYPE_LABELS: Record<string, string> = {
  exact: 'Exacta',
  contains: 'Contiene',
  starts_with: 'Empieza con',
};

const ReglasClasificacion = () => {
  const navigate = useNavigate();
  const { rules, loading, addRule, updateRule, deleteRule } = useClassificationRules();
  const { categories, transactions, accounts, loading: loadingFinance, updateTransaction } = useFinanceDataSupabase();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ClassificationRule | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchesDialogRule, setMatchesDialogRule] = useState<ClassificationRule | null>(null);

  // Form state
  const [ruleName, setRuleName] = useState('');
  const [keyword, setKeyword] = useState('');
  const [matchType, setMatchType] = useState<string>('contains');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState('0');
  const [active, setActive] = useState(true);
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  // Group categories by parent for the select
  const groupedCategories = useMemo(() => {
    const groups: Record<string, typeof categories> = {};
    categories.forEach(c => {
      if (!groups[c.categoria]) groups[c.categoria] = [];
      groups[c.categoria].push(c);
    });
    return groups;
  }, [categories]);

  // Helper to check if a transaction matches a rule
  function transactionMatchesRule(t: Transaction, rule: ClassificationRule): boolean {
    if (!matchesClassificationRule(t.comentario || '', rule.keyword, rule.match_type)) return false;
    const amount = (t.gasto || 0) + (t.ingreso || 0);
    if (rule.amount_min !== null && amount < rule.amount_min) return false;
    if (rule.amount_max !== null && amount > rule.amount_max) return false;
    return true;
  }

  // Count matching transactions per rule
  const matchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rules.forEach(rule => {
      counts[rule.id] = transactions.filter(t => transactionMatchesRule(t, rule)).length;
    });
    return counts;
  }, [rules, transactions]);

  // Matching transactions for the selected rule
  const matchingTransactions = useMemo(() => {
    if (!matchesDialogRule) return [];
    return transactions
      .filter(t => transactionMatchesRule(t, matchesDialogRule))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [matchesDialogRule, transactions]);

  const filteredRules = useMemo(() => {
    if (!searchQuery) return rules;
    const q = searchQuery.toLowerCase();
    return rules.filter(r => 
      r.keyword.toLowerCase().includes(q) ||
      (r.name && r.name.toLowerCase().includes(q)) ||
      getCategoryLabel(r.category_id).toLowerCase().includes(q)
    );
  }, [rules, searchQuery, categories]);

  function getCategoryLabel(catId: string) {
    const cat = categories.find(c => c.id === catId);
    return cat ? `${cat.categoria} > ${cat.subcategoria}` : 'Desconocida';
  }

  function getAccountName(accountId: string) {
    const acc = accounts.find(a => a.id === accountId);
    return acc?.nombre || 'Desconocida';
  }

  function openNew() {
    setEditingRule(null);
    setRuleName('');
    setKeyword('');
    setMatchType('contains');
    setCategoryId('');
    setPriority('0');
    setActive(true);
    setAmountMin('');
    setAmountMax('');
    setDialogOpen(true);
  }

  function openEdit(rule: ClassificationRule) {
    setEditingRule(rule);
    setRuleName(rule.name || '');
    setKeyword(rule.keyword);
    setMatchType(rule.match_type);
    setCategoryId(rule.category_id);
    setPriority(String(rule.priority));
    setActive(rule.active);
    setAmountMin(rule.amount_min != null ? String(rule.amount_min) : '');
    setAmountMax(rule.amount_max != null ? String(rule.amount_max) : '');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!keyword.trim() || !categoryId) return;

    const data = {
      name: ruleName.trim() || null,
      keyword: keyword.trim(),
      match_type: matchType as 'exact' | 'contains' | 'starts_with',
      category_id: categoryId,
      priority: parseInt(priority) || 0,
      active,
      amount_min: amountMin.trim() ? parseFloat(amountMin) : null,
      amount_max: amountMax.trim() ? parseFloat(amountMax) : null,
    };

    if (editingRule) {
      await updateRule(editingRule.id, data);
    } else {
      await addRule(data);
    }
    setDialogOpen(false);
  }

  async function handleChangeTransactionCategory(transactionId: string, newCategoryId: string) {
    await updateTransaction(transactionId, { subcategoriaId: newCategoryId });
  }

  function formatDate(fecha: string | Date) {
    const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatAmount(t: Transaction) {
    const amount = t.ingreso > 0 ? t.ingreso : -t.gasto;
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: t.divisa || 'MXN' }).format(amount);
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
                      <TableHead>Nombre</TableHead>
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
                        <TableCell className="font-medium">{rule.name || '—'}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground" title={rule.keyword}>{rule.keyword}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{MATCH_TYPE_LABELS[rule.match_type]}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{getCategoryLabel(rule.category_id)}</TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={matchCounts[rule.id] > 0 ? 'default' : 'secondary'}
                            className={matchCounts[rule.id] > 0 ? 'cursor-pointer hover:opacity-80' : ''}
                            onClick={() => matchCounts[rule.id] > 0 && setMatchesDialogRule(rule)}
                          >
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto mínimo (opcional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountMin}
                  onChange={e => setAmountMin(e.target.value)}
                  placeholder="Sin límite"
                />
              </div>
              <div className="space-y-2">
                <Label>Monto máximo (opcional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountMax}
                  onChange={e => setAmountMax(e.target.value)}
                  placeholder="Sin límite"
                />
              </div>
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

      {/* Dialog de transacciones coincidentes */}
      <Dialog open={!!matchesDialogRule} onOpenChange={(open) => !open && setMatchesDialogRule(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col" onPointerDownOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              Transacciones con "{matchesDialogRule?.keyword}"
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {matchingTransactions.length} transacciones coinciden con esta regla. Puedes cambiar la categoría de cualquiera.
            </p>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Categoría</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matchingTransactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap text-sm">{formatDate(t.fecha)}</TableCell>
                    <TableCell className="max-w-[250px] truncate text-sm" title={t.comentario}>{t.comentario}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{getAccountName(t.cuentaId)}</TableCell>
                    <TableCell className={`text-right whitespace-nowrap text-sm font-medium ${t.ingreso > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatAmount(t)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={t.subcategoriaId}
                        onValueChange={(newCatId) => handleChangeTransactionCategory(t.id, newCatId)}
                      >
                        <SelectTrigger className="h-8 text-xs w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(groupedCategories).map(([group, cats]) => (
                            cats.map(c => (
                              <SelectItem key={c.id} value={c.id} className="text-xs">
                                {group} {'>'} {c.subcategoria}
                              </SelectItem>
                            ))
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchesDialogRule(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ReglasClasificacion;
