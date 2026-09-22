import { useState, useMemo, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Pencil, Trash2, Search, Filter, X, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, ChevronDown, ChevronRight, Layers, Stethoscope } from 'lucide-react';
import Layout from '@/components/Layout';
import { useClassificationRules, ClassificationRule } from '@/hooks/useClassificationRules';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { conPalabraCompleta, matchesClassificationRule, normalizeRuleText, parseKeyword, splitClassificationKeywords } from '@/lib/classificationRules';
import { classifyOverlap, computeRuleOutcomes, computeRulesHealth, OverlapSeverity } from '@/lib/finance/rulesAudit';
import { Transaction } from '@/types/finance';

const MATCH_TYPE_LABELS: Record<string, string> = {
  exact: 'Exacta',
  contains: 'Contiene',
  starts_with: 'Empieza con',
};

type SortKey = 'priority' | 'matches' | 'name' | 'keywords' | 'match_type' | 'cuenta' | 'category' | 'active';
type SortDir = 'asc' | 'desc';

interface SortableHeadProps {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  align?: 'left' | 'center' | 'right';
}
const SortableHead = ({ label, k, sortKey, sortDir, onSort, align = 'left' }: SortableHeadProps) => {
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;
  const alignClass = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
  return (
    <TableHead className={align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : ''}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`flex items-center gap-1 w-full ${alignClass} hover:text-foreground ${active ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
      >
        {label}
        <Icon className="h-3.5 w-3.5 opacity-70" />
      </button>
    </TableHead>
  );
};
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
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' || key === 'keywords' || key === 'match_type' || key === 'cuenta' || key === 'category' ? 'asc' : 'desc');
    }
  }

  // Form state
  const [ruleName, setRuleName] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [matchType, setMatchType] = useState<string>('contains');
  const [categoryId, setCategoryId] = useState('');
  const [cuentaId, setCuentaId] = useState('');
  const [priority, setPriority] = useState('0');
  const [showHealth, setShowHealth] = useState(false);
  /** Texto de la keyword que se intentó añadir estando ya en la lista: se resalta un instante. */
  const [keywordRepetida, setKeywordRepetida] = useState<string | null>(null);
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

  // Quién gana qué: la regla que primero coincide por prioridad se lleva la
  // transacción; las demás solo eran candidatas.
  const outcomes = useMemo(() => computeRuleOutcomes(rules, transactions), [rules, transactions]);
  const matchCounts = useMemo(() => {
    const c: Record<string, number> = {};
    rules.forEach(r => { c[r.id] = outcomes[r.id]?.candidatas ?? 0; });
    return c;
  }, [rules, outcomes]);

  const health = useMemo(() => computeRulesHealth(rules, outcomes), [rules, outcomes]);

  /** Por regla: el solape más grave que sufre, con quién y cuántas pierde. */
  const overlapPorRegla = useMemo(() => {
    const byId = new Map(rules.map(r => [r.id, r]));
    const out: Record<string, { severity: OverlapSeverity; conflictos: { rule: ClassificationRule; n: number; severity: OverlapSeverity }[] }> = {};
    const peso: Record<OverlapSeverity, number> = { anulada: 3, sospechoso: 2, intencional: 1, menor: 0 };
    rules.forEach(rule => {
      const o = outcomes[rule.id];
      if (!o || o.pierdeAnte.length === 0) return;
      const conflictos = o.pierdeAnte
        .map(({ ruleId, n }) => {
          const ganadora = byId.get(ruleId);
          if (!ganadora) return null;
          return { rule: ganadora, n, severity: classifyOverlap(ganadora, rule, n, o) };
        })
        .filter(Boolean) as { rule: ClassificationRule; n: number; severity: OverlapSeverity }[];
      if (conflictos.length === 0) return;
      const severity = conflictos.reduce<OverlapSeverity>((peor, c) => (peso[c.severity] > peso[peor] ? c.severity : peor), 'menor');
      out[rule.id] = { severity, conflictos };
    });
    return out;
  }, [rules, outcomes]);

  const reglasARevisar = useMemo(
    () => Object.values(overlapPorRegla).filter(o => o.severity === 'anulada' || o.severity === 'sospechoso').length,
    [overlapPorRegla],
  );

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
      let cmp = 0;
      switch (sortKey) {
        case 'matches':
          cmp = (matchCounts[a.id] || 0) - (matchCounts[b.id] || 0);
          break;
        case 'name':
          cmp = (a.name || a.keyword).localeCompare(b.name || b.keyword);
          break;
        case 'keywords':
          cmp = splitClassificationKeywords(a.keyword).length - splitClassificationKeywords(b.keyword).length;
          break;
        case 'match_type':
          cmp = (MATCH_TYPE_LABELS[a.match_type] || '').localeCompare(MATCH_TYPE_LABELS[b.match_type] || '');
          break;
        case 'cuenta':
          cmp = (a.cuenta_id ? getAccountName(a.cuenta_id) : 'Todas').localeCompare(b.cuenta_id ? getAccountName(b.cuenta_id) : 'Todas');
          break;
        case 'category':
          cmp = getCategoryLabel(a.category_id).localeCompare(getCategoryLabel(b.category_id));
          break;
        case 'active':
          cmp = Number(a.active) - Number(b.active);
          break;
        case 'priority':
        default:
          cmp = a.priority - b.priority;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [rules, searchQuery, statusFilter, sortKey, sortDir, matchCounts, categories, accounts]);

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
    // Se conserva la marca de palabra completa (las comillas) al editar.
    setKeywords((rule.keyword || '').split(',').map(raw => {
      const { texto, palabraCompleta } = parseKeyword(raw);
      return texto ? conPalabraCompleta(texto.toUpperCase(), palabraCompleta) : '';
    }).filter(Boolean));
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

  /** Sin repetidas: compara el texto normalizado, así "Pet Grooming" y "PET GROOMING" son la misma. */
  function sinDuplicados(lista: string[]): string[] {
    const vistas = new Set<string>();
    return lista.filter(k => {
      const clave = parseKeyword(k).texto;
      if (!clave || vistas.has(clave)) return false;
      vistas.add(clave);
      return true;
    });
  }

  function addKeywordsFromInput() {
    const parts = keywordInput.split(',').map(p => p.trim().toUpperCase()).filter(Boolean);
    if (parts.length === 0) return;
    const yaEstaban = parts.filter(p => keywords.some(k => parseKeyword(k).texto === normalizeRuleText(p)));
    setKeywords(prev => sinDuplicados([...prev, ...parts]));
    setKeywordInput('');
    if (yaEstaban.length > 0) setKeywordRepetida(parseKeyword(yaEstaban[0]).texto);
  }

  /** Alterna entre coincidir por principio de palabra y exigir la palabra suelta. */
  function togglePalabraCompleta(kw: string) {
    const { texto, palabraCompleta } = parseKeyword(kw);
    setKeywords(prev => prev.map(k => (k === kw ? conPalabraCompleta(texto.toUpperCase(), !palabraCompleta) : k)));
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
    const finalKeywords = sinDuplicados([...keywords, ...pending]);
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
    solapadas: reglasARevisar,
  }), [rules, matchCounts, reglasARevisar]);

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
              <p className="text-xs text-muted-foreground">Solapes a revisar</p>
              <p className={`text-2xl font-bold ${stats.solapadas > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>{stats.solapadas}</p>
            </CardContent>
          </Card>
        </div>

        {(health.muertas.length + health.anuladas.length + health.duplicadasEnRegla.length + health.compartidas.length + health.cortas.length) > 0 && (
          <Card>
            <Collapsible open={showHealth} onOpenChange={setShowHealth}>
              <CollapsibleTrigger asChild>
                <button type="button" className="w-full flex items-center gap-2 p-4 text-left hover:bg-accent/50">
                  {showHealth ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <Stethoscope className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Salud de las reglas</span>
                  <span className="text-sm text-muted-foreground">
                    {[
                      health.muertas.length && `${health.muertas.length} sin coincidencias`,
                      health.anuladas.length && `${health.anuladas.length} anuladas`,
                      health.duplicadasEnRegla.length && `${health.duplicadasEnRegla.length} con keywords repetidas`,
                      health.compartidas.length && `${health.compartidas.length} keywords en dos reglas`,
                      health.cortas.length && `${health.cortas.length} keywords muy cortas`,
                    ].filter(Boolean).join(' · ')}
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-4 text-sm">
                  {health.anuladas.length > 0 && (
                    <div>
                      <p className="font-medium">Nunca se aplican</p>
                      <p className="text-xs text-muted-foreground mb-1">Coinciden con transacciones, pero otra regla de más prioridad se las lleva todas.</p>
                      <ul className="space-y-0.5">
                        {health.anuladas.map(({ rule, ganadoras }) => (
                          <li key={rule.id}>
                            <button type="button" className="underline underline-offset-2" onClick={() => openEdit(rules.find(r => r.id === rule.id)!)}>{rule.name || rule.keyword}</button>
                            <span className="text-muted-foreground"> — se las lleva {ganadoras.map(id => rules.find(r => r.id === id)?.name || '—').join(', ')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {health.muertas.length > 0 && (
                    <div>
                      <p className="font-medium">Sin ninguna coincidencia</p>
                      <p className="text-xs text-muted-foreground mb-1">Ninguna transacción tuya las activa: o sobran, o sus palabras clave no son las que trae el banco.</p>
                      <div className="flex flex-wrap gap-1">
                        {health.muertas.map(r => (
                          <Badge key={r.id} variant="outline" className="cursor-pointer" onClick={() => openEdit(rules.find(x => x.id === r.id)!)}>{r.name || r.keyword}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {health.duplicadasEnRegla.length > 0 && (
                    <div>
                      <p className="font-medium">Palabras clave repetidas dentro de la misma regla</p>
                      <ul className="space-y-0.5">
                        {health.duplicadasEnRegla.map(({ rule, keywords }) => (
                          <li key={rule.id}>
                            <button type="button" className="underline underline-offset-2" onClick={() => openEdit(rules.find(r => r.id === rule.id)!)}>{rule.name || rule.keyword}</button>
                            <span className="text-muted-foreground"> — {keywords.map(k => k.toUpperCase()).join(', ')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {health.compartidas.length > 0 && (
                    <div>
                      <p className="font-medium">La misma palabra clave en dos reglas</p>
                      <p className="text-xs text-muted-foreground mb-1">Gana siempre la de más prioridad; si el reparto no es a propósito, una de las dos sobra.</p>
                      <ul className="space-y-0.5">
                        {health.compartidas.map(({ keyword, ruleIds }) => (
                          <li key={keyword}>
                            <span className="font-mono text-xs">{keyword.toUpperCase()}</span>
                            <span className="text-muted-foreground"> — {ruleIds.map(id => rules.find(r => r.id === id)?.name || '—').join(' / ')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {health.cortas.length > 0 && (
                    <div>
                      <p className="font-medium">Palabras clave muy cortas</p>
                      <p className="text-xs text-muted-foreground mb-1">Coinciden por principio de palabra: DR atrapa cualquier palabra que empiece por "dr".</p>
                      <div className="flex flex-wrap gap-1">
                        {health.cortas.map(({ keyword, ruleId }, i) => (
                          <Badge key={`${keyword}-${i}`} variant="secondary" className="text-[10px] font-mono cursor-pointer" title={rules.find(r => r.id === ruleId)?.name || ''} onClick={() => openEdit(rules.find(r => r.id === ruleId)!)}>
                            {keyword.toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reglas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Se aplican al importar estados de cuenta. Mayor prioridad = se evalúa primero. "Gana / Candidatas" son las transacciones que la regla se lleva frente a las que podría clasificar; el resto se las queda otra regla de más prioridad.
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
                      <SortableHead label="Nombre" k="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortableHead label="Keywords" k="keywords" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortableHead label="Tipo" k="match_type" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortableHead label="Cuenta" k="cuenta" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortableHead label="Categoría" k="category" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                      <SortableHead label="Gana / Candidatas" k="matches" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="center" />
                      <SortableHead label="Prioridad" k="priority" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="center" />
                      <SortableHead label="Activa" k="active" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="center" />
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRules.map(rule => {
                      const kws = splitClassificationKeywords(rule.keyword).map(k => k.toUpperCase());
                      const shown = kws.slice(0, 3);
                      const rest = kws.length - shown.length;
                      const overlap = overlapPorRegla[rule.id];
                      return (
                        <TableRow key={rule.id} className={!rule.active ? 'opacity-50' : ''}>
                          <TableCell className="font-medium max-w-[200px]" title={rule.name || rule.keyword}>
                            <div className="flex items-center gap-1">
                              <span className="truncate">{rule.name || '—'}</span>
                              {overlap && overlap.severity !== 'menor' && (() => {
                                const detalle = overlap.conflictos
                                  .map(c => `${c.rule.name || c.rule.keyword} (${c.n})`)
                                  .join(', ');
                                if (overlap.severity === 'intencional') {
                                  return (
                                    <span title={`Reparto intencional con: ${detalle}. Alguna de las dos acota por monto o por cuenta.`}>
                                      <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    </span>
                                  );
                                }
                                const texto = overlap.severity === 'anulada'
                                  ? `Nunca se aplica: ${detalle} se lleva todas sus coincidencias`
                                  : `Pierde la mayoría de sus coincidencias ante: ${detalle}`;
                                return (
                                  <span title={texto}>
                                    <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                                  </span>
                                );
                              })()}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[260px]" title={kws.join(', ')}>
                            <div className="flex flex-wrap gap-1">
                              {shown.map(kw => (
                                <Badge key={kw} variant="secondary" className="text-[10px] font-mono">{kw}</Badge>
                              ))}
                              {rest > 0 && (
                                <Badge variant="outline" className="text-[10px]" title={kws.join(', ')}>+{rest}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell title={MATCH_TYPE_LABELS[rule.match_type]}>
                            <Badge variant="outline">{MATCH_TYPE_LABELS[rule.match_type]}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap max-w-[160px] truncate" title={rule.cuenta_id ? getAccountName(rule.cuenta_id) : 'Todas'}>{rule.cuenta_id ? getAccountName(rule.cuenta_id) : 'Todas'}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={getCategoryLabel(rule.category_id)}>{getCategoryLabel(rule.category_id)}</TableCell>
                          <TableCell className="text-center">
                            {(() => {
                              const o = outcomes[rule.id];
                              const candidatas = o?.candidatas ?? 0;
                              const gana = o?.gana ?? 0;
                              const perdidas = candidatas - gana;
                              const detalle = overlap?.conflictos.map(c => `${c.n} → ${c.rule.name || c.rule.keyword}`).join(', ');
                              return (
                                <span
                                  className="inline-flex items-baseline gap-1"
                                  title={perdidas > 0 ? `${perdidas} se las lleva otra regla: ${detalle}` : undefined}
                                >
                                  <Badge
                                    variant={gana > 0 ? 'default' : 'secondary'}
                                    className={candidatas > 0 ? 'cursor-pointer hover:opacity-80' : ''}
                                    onClick={() => candidatas > 0 && setMatchesDialogRule(rule)}
                                  >
                                    {gana}
                                  </Badge>
                                  {perdidas > 0 && <span className="text-xs text-muted-foreground">/ {candidatas}</span>}
                                </span>
                              );
                            })()}
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
                {keywords.map(kw => {
                  const { texto, palabraCompleta } = parseKeyword(kw);
                  const repetida = keywordRepetida === texto;
                  return (
                    <Badge
                      key={kw}
                      variant={palabraCompleta ? 'default' : 'secondary'}
                      className={`gap-1 font-mono text-[11px] ${repetida ? 'ring-2 ring-destructive' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => togglePalabraCompleta(kw)}
                        title={palabraCompleta
                          ? `Palabra completa: solo coincide si "${texto.toUpperCase()}" va suelta. Clic para volver a coincidir por principio de palabra.`
                          : `Coincide con cualquier palabra que empiece por ${texto.toUpperCase()}. Clic para exigir la palabra completa.`}
                      >
                        {palabraCompleta ? `"${texto.toUpperCase()}"` : texto.toUpperCase()}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeKeyword(kw)}
                        className="hover:text-destructive"
                        aria-label={`Eliminar ${texto.toUpperCase()}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
                <input
                  className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
                  value={keywordInput}
                  onChange={e => { setKeywordInput(e.target.value); if (keywordRepetida) setKeywordRepetida(null); }}
                  onKeyDown={handleKeywordKeyDown}
                  onBlur={() => keywordInput.trim() && addKeywordsFromInput()}
                  placeholder={keywords.length === 0 ? 'AMAZON, UBER, NETFLIX...' : 'Añadir otra'}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Enter, coma o Tab para añadir. La regla matchea si <strong>cualquier</strong> keyword coincide.
                Clic en una keyword para exigir <strong>palabra completa</strong>: <span className="font-mono">"SPA"</span> coincide con "SPA URBANO" pero no con "SPAIN".
                {keywordRepetida && <span className="text-destructive"> · "{keywordRepetida.toUpperCase()}" ya estaba en la lista.</span>}
              </p>
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
