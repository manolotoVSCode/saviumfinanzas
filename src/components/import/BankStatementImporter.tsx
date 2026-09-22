import { useCallback, useMemo, useState } from 'react';
import { AlertCircle, FileSpreadsheet, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useClassificationRules } from '@/hooks/useClassificationRules';
import { Pending, usePendings } from '@/hooks/usePendings';
import { useSubscriptionSync } from '@/hooks/useSubscriptionSync';
import { matchesClassificationRule } from '@/lib/classificationRules';
import { toFechaISO } from '@/lib/finance/fechas';
import { DateHint, parseBankStatement, ParseMeta, SkippedRow } from '@/lib/import/bankStatementParser';
import { buildHistoryIndex, suggestCategory } from '@/lib/import/importCategorizer';
import { esEntrada, montoConSigno, ParsedRow, toParsedRows } from '@/lib/import/toParsedRows';
import { cuentasRecientes, ordenarPorRecientes, registrarCuentaReciente } from '@/lib/import/cuentasRecientes';
import { Account, Category, Transaction } from '@/types/finance';
import { CreateRuleFromRowDialog, NewRule } from './CreateRuleFromRowDialog';
import { ImportPreviewTable, SortColumn, SortDirection } from './ImportPreviewTable';
import { ImportSummaryBar } from './ImportSummaryBar';

interface BankStatementImporterProps {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  onImportTransactions: (transactions: Omit<Transaction, 'id' | 'monto'>[]) => Promise<void>;
}

type Step = 'select-account' | 'upload' | 'preview';
type PreviewFilter = 'all' | 'sin_asignar' | 'dudosas' | 'entradas';

const esSinAsignar = (cat: Category | undefined) => !cat || cat.subcategoria === 'Sin Asignar' || cat.categoria === 'SIN ASIGNAR';

/**
 * Orquestador: pasos, estado del preview e importación. El parseo y la
 * categorización viven en src/lib/import; la tabla, el resumen y el diálogo
 * de reglas son componentes hermanos.
 */
const BankStatementImporter = ({ accounts, categories, transactions, onImportTransactions }: BankStatementImporterProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('select-account');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [skipped, setSkipped] = useState<SkippedRow[]>([]);
  const [meta, setMeta] = useState<ParseMeta | null>(null);
  const [importing, setImporting] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>('fecha');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [dateFormat, setDateFormat] = useState<DateHint>('auto');
  const [needsDateFormatChoice, setNeedsDateFormatChoice] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingLinks, setPendingLinks] = useState<Record<string, string>>({});
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>('all');
  const [ruleRow, setRuleRow] = useState<ParsedRow | null>(null);

  const { toast } = useToast();
  const { findMatchingRuleDetailed, addRule } = useClassificationRules();
  const { pendings, reload: reloadPendings } = usePendings();
  const { sync } = useSubscriptionSync();

  const selectedAccount = useMemo(() => accounts.find(a => a.id === selectedAccountId), [accounts, selectedAccountId]);

  // Atajos a las últimas cuentas importadas: con 27 cuentas, buscar AMEX o HSBC
  // en el desplegable era el primer peaje de cada importación.
  const recientes = useMemo(() => (open ? cuentasRecientes(accounts.map(a => a.id)) : []), [open, accounts]);
  const cuentasAgrupadas = useMemo(() => ordenarPorRecientes(accounts, recientes), [accounts, recientes]);

  /** Atajo: elige la cuenta y salta directo a soltar el archivo. */
  const usarCuenta = (id: string) => {
    setSelectedAccountId(id);
    setStep('upload');
  };
  const isCreditCard = selectedAccount?.tipo === 'Tarjeta de Crédito';

  const sinAsignarCategory = useMemo(
    () => categories.find(c => c.subcategoria === 'Sin Asignar' || c.categoria === 'Sin Asignar'),
    [categories],
  );

  const historyIndex = useMemo(() => buildHistoryIndex(transactions, sinAsignarCategory?.id), [transactions, sinAsignarCategory]);

  const categorizer = useCallback(
    (descripcion: string, monto: number) => suggestCategory(descripcion, monto, selectedAccountId, historyIndex, findMatchingRuleDetailed),
    [selectedAccountId, historyIndex, findMatchingRuleDetailed],
  );

  const processFile = async (file: File, hint: DateHint) => {
    const result = await parseBankStatement(await file.arrayBuffer(), file.name, hint);

    if (result.movements.length === 0) {
      toast({
        title: 'Error',
        description: /\.xlsx?$/i.test(file.name)
          ? 'No se encontraron transacciones válidas en el archivo Excel. Revisa que tenga columnas de fecha e importe.'
          : 'No se encontraron transacciones válidas en el archivo',
        variant: 'destructive',
      });
      return;
    }

    if (result.meta.ambiguousDate && hint === 'auto' && !needsDateFormatChoice) {
      setPendingFile(file);
      setNeedsDateFormatChoice(true);
      return;
    }

    setParsedRows(toParsedRows(result.movements, selectedAccount!.tipo, categorizer, categories, sinAsignarCategory?.id));
    setSkipped(result.skipped);
    setMeta(result.meta);
    setStep('preview');
    setNeedsDateFormatChoice(false);
    setPendingFile(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await processFile(file, dateFormat);
    } catch (error) {
      console.error('Error parsing file:', error);
      const description = error instanceof Error ? error.message : 'Error al procesar el archivo';
      toast({ title: 'Error', description, variant: 'destructive' });
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmDateFormat = async (chosen: 'DMY' | 'MDY') => {
    setDateFormat(chosen);
    if (!pendingFile) {
      setNeedsDateFormatChoice(false);
      return;
    }
    try {
      await processFile(pendingFile, chosen);
    } catch (error) {
      console.error('Error reparsing file:', error);
      toast({ title: 'Error', description: 'Error al reprocesar el archivo', variant: 'destructive' });
    }
  };

  const handleToggleInclude = (id: string) =>
    setParsedRows(prev => prev.map(row => (row.id === id ? { ...row, incluir: !row.incluir } : row)));

  const handleToggleReembolso = (id: string) =>
    setParsedRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      const newEsReembolso = !row.esReembolso;
      return {
        ...row,
        esReembolso: newEsReembolso,
        esGasto: newEsReembolso ? true : row.montoOriginal < 0 ? !isCreditCard : isCreditCard,
      };
    }));

  const handleCategoryChange = (id: string, categoriaId: string) =>
    setParsedRows(prev => prev.map(row => (row.id === id ? { ...row, categoriaId, categoriaManual: true } : row)));

  /** Aplica una regla recién creada a las filas no manuales que coincidan; devuelve cuántas. */
  const applyRule = (rule: NewRule): number => {
    // Se calcula sobre el estado actual, fuera del updater: React no garantiza cuándo (ni cuántas
    // veces, en StrictMode) ejecuta el updater, así que un contador dentro daría 0 o el doble.
    let n = 0;
    const next = parsedRows.map(row => {
      if (row.categoriaManual) return row;
      if (rule.cuenta_id && rule.cuenta_id !== selectedAccountId) return row;
      if (!matchesClassificationRule(row.descripcion, rule.keyword, rule.match_type)) return row;
      n++;
      return {
        ...row,
        categoriaId: rule.category_id,
        suggestion: { categoriaId: rule.category_id, source: 'regla' as const, detail: `Regla · ${rule.name || rule.keyword}`, confidence: 'alta' as const },
      };
    });
    if (n > 0) setParsedRows(next);
    return n;
  };

  const handleImport = async () => {
    const rowsToImport = parsedRows.filter(row => row.incluir);
    if (rowsToImport.length === 0) {
      toast({ title: 'Error', description: 'No hay transacciones seleccionadas para importar', variant: 'destructive' });
      return;
    }

    setImporting(true);
    try {
      // Ensure we have a valid "Sin Asignar" category id (required by DB FK)
      let fallbackCategoryId = sinAsignarCategory?.id || '';
      if (!fallbackCategoryId) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) throw new Error('Usuario no autenticado');
        const { data, error } = await supabase.rpc('ensure_sin_asignar_category', { user_uuid: userData.user.id });
        if (error) throw error;
        fallbackCategoryId = (data as string) || '';
      }
      if (!fallbackCategoryId) {
        toast({ title: 'Error', description: 'No se pudo determinar la categoría "Sin Asignar". Reintenta y revisa tus categorías.', variant: 'destructive' });
        return;
      }

      const transactionsToImport = rowsToImport.map(row => {
        const subcategoriaId = row.categoriaId || fallbackCategoryId;
        // Reembolso = ingreso > 0 + categoría tipo 'Gastos'
        const ingreso = row.esReembolso ? row.monto : (row.esGasto ? 0 : row.monto);
        const gasto = row.esReembolso ? 0 : (row.esGasto ? row.monto : 0);
        const result: Omit<Transaction, 'id' | 'monto'> = {
          cuentaId: selectedAccountId,
          fecha: row.fecha,
          comentario: row.descripcion,
          ingreso,
          gasto,
          subcategoriaId,
          divisa: selectedAccount?.divisa || 'MXN',
        };
        if (row.tarjetahabiente) result.tarjetahabiente = row.tarjetahabiente;
        return result;
      });

      // addTransactionsBatch relanza si falla y, si va bien, ya invalidó `transacciones`.
      await onImportTransactions(transactionsToImport);
      // Solo tras importar de verdad: los atajos reflejan importaciones, no tanteos.
      registrarCuentaReciente(selectedAccountId);

      // Vincular pendientes: localizar la transacción recién creada (cuenta+fecha+comentario+monto)
      // y marcar el pendiente como cobrado. Un fallo aquí no debe dejar el
      // preview abierto invitando a una importación duplicada: la importación
      // ya ocurrió, así que solo se registra y se avisa por toast.
      let vinculados = 0;
      try {
        const linkedEntries = rowsToImport
          .map(r => ({ row: r, pendingId: pendingLinks[r.id] }))
          .filter(e => e.pendingId);
        if (linkedEntries.length > 0) {
          const { data: userData } = await supabase.auth.getUser();
          const userId = userData.user?.id;
          if (userId) {
            for (const { row, pendingId } of linkedEntries) {
              const pending = pendings.find(p => p.id === pendingId);
              if (!pending) continue;
              const fechaStr = toFechaISO(row.fecha);
              const { data: txMatches } = await supabase
                .from('transacciones')
                .select('id, ingreso, comentario, cuenta_id, fecha, created_at')
                .eq('user_id', userId)
                .eq('cuenta_id', selectedAccountId)
                .eq('fecha', fechaStr)
                .eq('comentario', row.descripcion)
                .order('created_at', { ascending: false })
                .limit(5);
              const tx = (txMatches ?? []).find(t => Math.abs(Number(t.ingreso) - row.monto) < 0.01);
              if (!tx) continue;
              const totalCobrado = (pending.monto_cobrado ?? 0) + row.monto;
              const nuevoEstado = totalCobrado >= pending.monto_esperado ? 'cobrado' : 'cobrado_parcial';
              await supabase
                .from('transaction_pendings')
                .update({ transaccion_cobro_id: tx.id, monto_cobrado: totalCobrado, fecha_cobro: fechaStr, estado: nuevoEstado })
                .eq('id', pendingId);
              vinculados++;
            }
            await reloadPendings();
          }
        }
      } catch (linkError) {
        console.error('Error linking pendings:', linkError);
        toast({
          title: 'Transacciones importadas',
          description: 'no se pudieron vincular los pendientes',
          variant: 'destructive',
        });
      }

      toast({
        title: 'Importación completada',
        description: `${transactionsToImport.length} transacciones importadas en ${selectedAccount?.nombre ?? 'la cuenta'}${vinculados > 0 ? ` · ${vinculados} pendiente${vinculados !== 1 ? 's' : ''} vinculado${vinculados !== 1 ? 's' : ''}` : ''}`,
      });

      handleClose();

      // La caché de transacciones ya está al día: el sync lee de ella y deja
      // subscription_services listo para el móvil. Sus errores ya muestran toast.
      sync().catch(() => undefined);
    } catch (error) {
      console.error('Error importing:', error);
      toast({ title: 'Error', description: 'Error al importar transacciones', variant: 'destructive' });
      // El preview sigue abierto con las filas intactas.
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setStep('select-account');
    setSelectedAccountId('');
    setParsedRows([]);
    setSkipped([]);
    setMeta(null);
    setDateFormat('auto');
    setNeedsDateFormatChoice(false);
    setPendingFile(null);
    setPendingLinks({});
    setPreviewFilter('all');
    setRuleRow(null);
  };

  const selectedCount = parsedRows.filter(r => r.incluir).length;
  const sinAsignarCount = useMemo(
    () => parsedRows.filter(row => esSinAsignar(categories.find(c => c.id === row.categoriaId))).length,
    [parsedRows, categories],
  );
  const entradasCount = useMemo(() => parsedRows.filter(esEntrada).length, [parsedRows]);
  const dudosasCount = useMemo(() => parsedRows.filter(r => !r.categoriaManual && r.suggestion?.confidence === 'media').length, [parsedRows]);
  const hasTarjetahabiente = useMemo(() => parsedRows.some(r => r.tarjetahabiente), [parsedRows]);

  // Pendientes activos que coinciden con filas de ingreso (divisa + monto restante).
  const activePendings = useMemo(
    () => pendings.filter(p => p.estado === 'pendiente' || p.estado === 'cobrado_parcial'),
    [pendings],
  );
  const rowPendingMatches = useMemo(() => {
    const map = new Map<string, Pending[]>();
    if (!selectedAccount || activePendings.length === 0) return map;
    for (const row of parsedRows) {
      if (row.esGasto || row.esReembolso) continue;
      if (row.tipo !== 'Ingreso') continue;
      const matches = activePendings.filter(p =>
        p.divisa === selectedAccount.divisa &&
        Math.abs((p.monto_esperado - (p.monto_cobrado ?? 0)) - row.monto) < 0.01);
      if (matches.length > 0) map.set(row.id, matches);
    }
    return map;
  }, [parsedRows, activePendings, selectedAccount]);

  const togglePendingLink = (rowId: string, matches: Pending[]) =>
    setPendingLinks(prev => {
      const next = { ...prev };
      if (next[rowId]) delete next[rowId];
      else next[rowId] = (matches.find(m => m.id === prev[rowId]) ?? matches[0]).id;
      return next;
    });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    else { setSortColumn(column); setSortDirection('asc'); }
  };

  const sortedRows = useMemo(() => [...parsedRows].sort((a, b) => {
    let comparison = 0;
    switch (sortColumn) {
      case 'fecha': comparison = a.fecha.getTime() - b.fecha.getTime(); break;
      case 'descripcion': comparison = a.descripcion.localeCompare(b.descripcion); break;
      case 'tipo': comparison = a.tipo.localeCompare(b.tipo); break;
      // Con signo: un gasto de 500 y un ingreso de 500 no son lo mismo.
      case 'monto': comparison = montoConSigno(a) - montoConSigno(b); break;
      case 'categoria': {
        const catA = categories.find(c => c.id === a.categoriaId);
        const catB = categories.find(c => c.id === b.categoriaId);
        const nameA = catA ? `${catA.categoria} - ${catA.subcategoria}` : 'Sin Asignar';
        const nameB = catB ? `${catB.categoria} - ${catB.subcategoria}` : 'Sin Asignar';
        comparison = nameA.localeCompare(nameB);
        break;
      }
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  }), [parsedRows, sortColumn, sortDirection, categories]);

  const filteredPreviewRows = useMemo(() => {
    if (previewFilter === 'sin_asignar') return sortedRows.filter(row => esSinAsignar(categories.find(c => c.id === row.categoriaId)));
    if (previewFilter === 'dudosas') return sortedRows.filter(r => !r.categoriaManual && r.suggestion?.confidence === 'media');
    if (previewFilter === 'entradas') return sortedRows.filter(esEntrada);
    return sortedRows;
  }, [sortedRows, previewFilter, categories]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Estado de Cuenta
        </Button>
      </DialogTrigger>

      <DialogContent className={`${step === 'preview' ? 'max-w-5xl max-h-[90vh]' : 'max-w-md'}`} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Estado de Cuenta
          </DialogTitle>
          <DialogDescription>
            {step === 'select-account' && 'Selecciona la cuenta a la que pertenece el estado de cuenta'}
            {step === 'upload' && 'Sube tu archivo CSV o Excel'}
            {step === 'preview' && `Vista previa - ${selectedCount} de ${parsedRows.length} transacciones seleccionadas`}
          </DialogDescription>
        </DialogHeader>

        {step === 'select-account' && (
          <div className="space-y-4 py-4">
            {cuentasAgrupadas.recientes.length > 0 && (
              <div className="space-y-2">
                <Label>Últimas usadas</Label>
                <div className="flex flex-wrap gap-2">
                  {cuentasAgrupadas.recientes.map(account => (
                    <Button key={account.id} variant="outline" size="sm" className="h-9" onClick={() => usarCuenta(account.id)}>
                      {account.nombre}
                      <span className="ml-1 text-xs text-muted-foreground">{account.divisa}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Cuenta</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecciona una cuenta" /></SelectTrigger>
                <SelectContent>
                  {cuentasAgrupadas.recientes.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Últimas usadas</SelectLabel>
                      {cuentasAgrupadas.recientes.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.nombre} ({account.tipo}) - {account.divisa}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  <SelectGroup>
                    {cuentasAgrupadas.recientes.length > 0 && <SelectLabel>Todas</SelectLabel>}
                    {cuentasAgrupadas.resto.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.nombre} ({account.tipo}) - {account.divisa}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {selectedAccount && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p><strong>Tipo:</strong> {selectedAccount.tipo}</p>
                <p><strong>Divisa:</strong> {selectedAccount.divisa}</p>
                <p className="text-muted-foreground mt-2">
                  {isCreditCard
                    ? 'En tarjetas de crédito: valores positivos = gastos, negativos = pagos/abonos'
                    : 'En cuentas bancarias: valores negativos = gastos, positivos = ingresos'}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={() => usarCuenta(selectedAccountId)} disabled={!selectedAccountId}>Continuar</Button>
            </div>
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Input type="file" accept=".csv,.xls,.xlsx" onChange={handleFileUpload} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Arrastra o haz clic para subir</p>
                <p className="text-sm text-muted-foreground mt-1">CSV o Excel (.csv, .xls, .xlsx)</p>
              </label>
            </div>

            {needsDateFormatChoice && (
              <div className="rounded-lg border border-border bg-muted p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-foreground mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Formato de fecha ambiguo</p>
                    <p className="text-muted-foreground mt-1">Algunas fechas pueden interpretarse como DD/MM o MM/DD. Selecciona el formato:</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="default" onClick={() => handleConfirmDateFormat('DMY')}>DD/MM/YYYY (México / España)</Button>
                  <Button size="sm" variant="outline" onClick={() => handleConfirmDateFormat('MDY')}>MM/DD/YYYY (EEUU)</Button>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('select-account')}>Atrás</Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-3 overflow-hidden">
            <div className="flex items-center gap-3 flex-wrap">
              <Button variant={previewFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setPreviewFilter('all')}>
                Todas ({parsedRows.length})
              </Button>
              <Button
                variant={previewFilter === 'sin_asignar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewFilter('sin_asignar')}
                className={sinAsignarCount > 0 ? 'border-yellow-500' : ''}
              >
                Sin Asignar ({sinAsignarCount})
              </Button>
              <Button variant={previewFilter === 'dudosas' ? 'default' : 'outline'} size="sm" onClick={() => setPreviewFilter('dudosas')}>
                Dudosas ({dudosasCount})
              </Button>
              <Button variant={previewFilter === 'entradas' ? 'default' : 'outline'} size="sm" onClick={() => setPreviewFilter('entradas')}>
                Ingresos y reemb. ({entradasCount})
              </Button>
            </div>

            <ImportPreviewTable
              rows={filteredPreviewRows}
              allRows={parsedRows}
              categories={categories}
              isCreditCard={!!isCreditCard}
              hasTarjetahabiente={hasTarjetahabiente}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              onToggleAll={(checked) => setParsedRows(prev => prev.map(r => ({ ...r, incluir: checked })))}
              onToggleInclude={handleToggleInclude}
              onToggleReembolso={handleToggleReembolso}
              onCategoryChange={handleCategoryChange}
              onCreateRule={setRuleRow}
              pendingMatches={rowPendingMatches}
              pendingLinks={pendingLinks}
              onTogglePendingLink={togglePendingLink}
            />

            <ImportSummaryBar
              rows={parsedRows}
              skipped={skipped}
              meta={meta}
              currency={selectedAccount?.divisa ?? 'MXN'}
              importing={importing}
              selectedCount={selectedCount}
              onBack={() => { setParsedRows([]); setSkipped([]); setMeta(null); setStep('upload'); }}
              onImport={handleImport}
            />
          </div>
        )}
      </DialogContent>

      <CreateRuleFromRowDialog
        row={ruleRow}
        onClose={() => setRuleRow(null)}
        categories={categories}
        accountId={selectedAccountId}
        accountName={selectedAccount?.nombre ?? ''}
        rows={parsedRows}
        onSave={addRule}
        onApplied={applyRule}
      />
    </Dialog>
  );
};

export default BankStatementImporter;
