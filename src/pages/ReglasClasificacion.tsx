import { useState, useMemo, KeyboardEvent } from 'react';
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
import { ArrowLeft, Plus, Pencil, Trash2, Search, Filter, X, ArrowUpDown, AlertTriangle } from 'lucide-react';
import Layout from '@/components/Layout';
import { useClassificationRules, ClassificationRule } from '@/hooks/useClassificationRules';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { matchesClassificationRule, splitClassificationKeywords } from '@/lib/classificationRules';
import { Transaction } from '@/types/finance';

const MATCH_TYPE_LABELS: Record<string, string> = {
  exact: 'Exacta',
  contains: 'Contiene',
  starts_with: 'Empieza con',
};

type SortKey = 'priority' | 'matches' | 'name' | 'keywords' | 'match_type' | 'cuenta' | 'category' | 'active';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'used' | 'unused' | 'inactive';

const ReglasClasificacion = () => {
  const navigate = useNavigate();
  const { rules, loading, addRule, updateRule, deleteRule } = useClassificationRules();
  const { categories, transactions, accounts, loading: loadingFinance, updateTransaction } = useFinanceDataSupabase();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ClassificationRule | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchesDialogRule, setMatchesDialogRule] = useState<ClassificationRule | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Form state
  const [ruleName, setRuleName] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [matchType, setMatchType] = useState<string>('contains');
  const [categoryId, setCategoryId] = useState('');
  const [cuentaId, setCuentaId] = useState('');
  const [priority, setPriority] = useState('0');
  const [active, setActive] = useState(true);
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  const groupedCategories = useMemo(() => {
    const groups: Record<string, typeof categories> = {};
    categories.forEach(c => {
      if (!groups[c.categoria]) groups[c.categoria] = [];
      groups[c.categoria].push(c);
    });
    return groups;
  }, [categories]);

  function transactionMatchesRule(t: Transaction, rule: ClassificationRule): boolean {
    if (!matchesClassificationRule(t.comentario || '', rule.keyword, rule.match_type)) return false;
    const amount = (t.gasto || 0) + (t.ingreso || 0);
    if (rule.cuenta_id !== null && t.cuentaId !== rule.cuenta_id) return false;
    if (rule.amount_min !== null && amount < rule.amount_min) return false;
    if (rule.amount_max !== null && amount > rule.amount_max) return false;
    return true;
  }

  // Compute rule -> matching transaction IDs (for overlap detection)
  const ruleMatches = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    rules.forEach(rule => {
      map[rule.id] = new Set(
        transactions.filter(t => transactionMatchesRule(t, rule)).map(t => t.id)
      );
    });
    return map;
  }, [rules, transactions]);

  const matchCounts = useMemo(() => {
    const c: Record<string, number> = {};
    Object.entries(ruleMatches).forEach(([id, set]) => { c[id] = set.size; });
    return c;
  }, [ruleMatches]);

  // Detect overlapping rules (share ≥1 transaction with another active rule)
  const overlappingRules = useMemo(() => {
    const overlap: Record<string, string[]> = {};
    const active = rules.filter(r => r.active);
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i], b = active[j];
        const setA = ruleMatches[a.id];
        const setB = ruleMatches[b.id];
        if (!setA || !setB) continue;
        let shared = 0;
        setA.forEach(id => { if (setB.has(id)) shared++; });
        if (shared > 0) {
          (overlap[a.id] ||= []).push(b.id);
          (overlap[b.id] ||= []).push(a.id);
        }
      }
    }
    return overlap;
  }, [rules, ruleMatches]);

  const matchingTransactions = useMemo(() => {
    if (!matchesDialogRule) return [];
    return transactions
      .filter(t => transactionMatchesRule(t, matchesDialogRule))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [matchesDialogRule, transactions]);

  const filteredRules = useMemo(() => {
    let list = [...rules];

    if (statusFilter === 'used') list = list.filter(r => (matchCounts[r.id] || 0) > 0 && r.active);
    else if (statusFilter === 'unused') list = list.filter(r => (matchCounts[r.id] || 0) === 0 && r.active);
    else if (statusFilter === 'inactive') list = list.filter(r => !r.active);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        r.keyword.toLowerCase().includes(q) ||
        (r.name && r.name.toLowerCase().includes(q)) ||
        getCategoryLabel(r.category_id).toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortKey === 'matches') return (matchCounts[b.id] || 0) - (matchCounts[a.id] || 0);
      if (sortKey === 'name') return (a.name || a.keyword).localeCompare(b.name || b.keyword);
      return b.priority - a.priority;
    });

    return list;
  }, [rules, searchQuery, statusFilter, sortKey, matchCounts, categories]);

  function getCategoryLabel(catId: string) {
    const cat = categories.find(c => c.id === catId);
    return cat ? `${cat.categoria} > ${cat.subcategoria}` : 'Desconocida';
  }

  function getAccountName(accountId: string) {
    const acc = accounts.find(a => a.id === accountId);
    return acc?.nombre || 'Desconocida';
  }

  function priorityBadgeVariant(p: number): 'default' | 'secondary' | 'outline' {
    if (p >= 10) return 'default';
    if (p >= 5) return 'secondary';
    return 'outline';
  }

  function openNew() {
    setEditingRule(null);
    setRuleName('');
    setKeywords([]);
    setKeywordInput('');
    setMatchType('contains');
    setCategoryId('');
    setCuentaId('');
    setPriority('0');
    setActive(true);
    setAmountMin('');
    setAmountMax('');
    setDialogOpen(true);
  }

  function openEdit(rule: ClassificationRule) {
    setEditingRule(rule);
    setRuleName(rule.name || '');
    setKeywords(splitClassificationKeywords(rule.keyword).map(k => k.toUpperCase()));
    setKeywordInput('');
    setMatchType(rule.match_type);
    setCategoryId(rule.category_id);
    setCuentaId(rule.cuenta_id || '');
    setPriority(String(rule.priority));
    setActive(rule.active);
    setAmountMin(rule.amount_min != null ? String(rule.amount_min) : '');
    setAmountMax(rule.amount_max != null ? String(rule.amount_max) : '');
    setDialogOpen(true);
  }

  function addKeywordsFromInput() {
    const parts = keywordInput.split(',').map(p => p.trim().toUpperCase()).filter(Boolean);
    if (parts.length === 0) return;
    setKeywords(prev => Array.from(new Set([...prev, ...parts])));
    setKeywordInput('');
  }

  function handleKeywordKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      if (keywordInput.trim()) {
        e.preventDefault();
        addKeywordsFromInput();
      }
    } else if (e.key === 'Backspace' && !keywordInput && keywords.length > 0) {
      setKeywords(prev => prev.slice(0, -1));
    }
  }

  function removeKeyword(kw: string) {
    setKeywords(prev => prev.filter(k => k !== kw));
  }

  async function handleSave() {
    // Also flush any pending text in the input
    const pending = keywordInput.split(',').map(p => p.trim().toUpperCase()).filter(Boolean);
    const finalKeywords = Array.from(new Set([...keywords, ...pending]));
    if (finalKeywords.length === 0 || !categoryId) return;

    const data = {
      name: ruleName.trim() || null,
      keyword: finalKeywords.join(','),
      match_type: matchType as 'exact' | 'contains' | 'starts_with',
      category_id: categoryId,
      cuenta_id: cuentaId || null,
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

  const stats = useMemo(() => ({
    total: rules.length,
    activas: rules.filter(r => r.active).length,
    sinUso: rules.filter(r => r.active && (matchCounts[r.id] || 0) === 0).length,
    solapadas: Object.keys(overlappingRules).length,
  }), [rules, matchCounts, overlappingRules]);

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

        {/* Stats mini-KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="cursor-pointer hover:bg-accent/50" onClick={() => setStatusFilter('all')}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50" onClick={() => setStatusFilter('used')}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Activas con uso</p>
              <p className="text-2xl font-bold text-primary">{stats.activas - stats.sinUso}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50" onClick={() => setStatusFilter('unused')}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Sin coincidencias</p>
              <p className="text-2xl font-bold text-amber-600">{stats.sinUso}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Con solapes</p>
              <p className="text-2xl font-bold text-orange-600">{stats.solapadas}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reglas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Se aplican al importar estados de cuenta. Mayor prioridad = se evalúa primero. Las reglas solapadas comparten transacciones con otra regla.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por keyword, nombre o categoría..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="used">Con coincidencias</SelectItem>
                  <SelectItem value="unused">Sin coincidencias</SelectItem>
                  <SelectItem value="inactive">Inactivas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger className="w-[180px]">
                  <ArrowUpDown className="h-4 w-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Por prioridad</SelectItem>
                  <SelectItem value="matches">Por coincidencias</SelectItem>
                  <SelectItem value="name">Por nombre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredRules.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {rules.length === 0
                  ? 'No hay reglas de clasificación. Crea una nueva para empezar.'
                  : 'No se encontraron reglas con ese criterio.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Keywords</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cuenta</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-center">Coincidencias</TableHead>
                      <TableHead className="text-center">Prioridad</TableHead>
                      <TableHead className="text-center">Activa</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRules.map(rule => {
                      const kws = splitClassificationKeywords(rule.keyword).map(k => k.toUpperCase());
                      const shown = kws.slice(0, 3);
                      const rest = kws.length - shown.length;
                      const overlaps = overlappingRules[rule.id];
                      return (
                        <TableRow key={rule.id} className={!rule.active ? 'opacity-50' : ''}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1">
                              <span>{rule.name || '—'}</span>
                              {overlaps && (
                                <span title={`Solapa con ${overlaps.length} regla(s)`}>
                                  <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[260px]">
                            <div className="flex flex-wrap gap-1">
                              {shown.map(kw => (
                                <Badge key={kw} variant="secondary" className="text-[10px] font-mono">{kw}</Badge>
                              ))}
                              {rest > 0 && (
                                <Badge variant="outline" className="text-[10px]" title={kws.join(', ')}>+{rest}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{MATCH_TYPE_LABELS[rule.match_type]}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{rule.cuenta_id ? getAccountName(rule.cuenta_id) : 'Todas'}</TableCell>
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
                          <TableCell className="text-center">
                            <Badge variant={priorityBadgeVariant(rule.priority)}>{rule.priority}</Badge>
                          </TableCell>
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
                                      Se eliminará la regla "{rule.name || rule.keyword}". Esta acción no se puede deshacer.
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
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Editar Regla' : 'Nueva Regla de Clasificación'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de la regla</Label>
              <Input
                value={ruleName}
                onChange={e => setRuleName(e.target.value)}
                placeholder="ej: Apple Suscripción, Uber Eats..."
              />
            </div>
            <div className="space-y-2">
              <Label>Palabras clave</Label>
              <div className="flex flex-wrap gap-1.5 p-2 border rounded-md min-h-[42px] bg-background focus-within:ring-2 focus-within:ring-ring">
                {keywords.map(kw => (
                  <Badge key={kw} variant="secondary" className="gap-1 font-mono text-[11px]">
                    {kw}
                    <button
                      type="button"
                      onClick={() => removeKeyword(kw)}
                      className="hover:text-destructive"
                      aria-label={`Eliminar ${kw}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <input
                  className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
                  value={keywordInput}
                  onChange={e => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordKeyDown}
                  onBlur={() => keywordInput.trim() && addKeywordsFromInput()}
                  placeholder={keywords.length === 0 ? 'AMAZON, UBER, NETFLIX...' : 'Añadir otra'}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Enter, coma o Tab para añadir. La regla matchea si <strong>cualquier</strong> keyword coincide.</p>
            </div>
            <div className="space-y-2">
              <Label>Tipo de coincidencia</Label>
              <Select value={matchType} onValueChange={setMatchType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contiene — la descripción incluye la palabra</SelectItem>
                  <SelectItem value="starts_with">Empieza con — la descripción comienza con la palabra</SelectItem>
                  <SelectItem value="exact">Exacta — la descripción es exactamente la palabra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cuenta (opcional)</Label>
              <Select value={cuentaId || 'all'} onValueChange={v => setCuentaId(v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Todas las cuentas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las cuentas</SelectItem>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoría asignada</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger>
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
              <Input type="number" value={priority} onChange={e => setPriority(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">0 = normal · 5 = alta · 10+ = crítica (gana sobre reglas genéricas)</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto mínimo (opcional)</Label>
                <Input type="number" step="0.01" min="0" value={amountMin} onChange={e => setAmountMin(e.target.value)} placeholder="Sin límite" />
              </div>
              <div className="space-y-2">
                <Label>Monto máximo (opcional)</Label>
                <Input type="number" step="0.01" min="0" value={amountMax} onChange={e => setAmountMax(e.target.value)} placeholder="Sin límite" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={active} onCheckedChange={setActive} />
              <Label>Regla activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={(keywords.length === 0 && !keywordInput.trim()) || !categoryId}
            >
              {editingRule ? 'Guardar cambios' : 'Crear regla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog transacciones coincidentes */}
      <Dialog open={!!matchesDialogRule} onOpenChange={(open) => !open && setMatchesDialogRule(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col" onPointerDownOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Transacciones con "{matchesDialogRule?.name || matchesDialogRule?.keyword}"</DialogTitle>
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
                      <Select value={t.subcategoriaId} onValueChange={(newCatId) => handleChangeTransactionCategory(t.id, newCatId)}>
                        <SelectTrigger className="h-8 text-xs w-[180px]"><SelectValue /></SelectTrigger>
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
