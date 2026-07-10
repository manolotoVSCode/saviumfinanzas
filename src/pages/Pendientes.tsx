import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, CheckCircle2, XCircle, Pencil, Trash2, AlertCircle, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePendings, Pending, PendingTipo } from '@/hooks/usePendings';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { useAppConfig } from '@/hooks/useAppConfig';
import { formatNumber } from '@/lib/formatters';

type Filter = 'todos' | 'reembolso_gasto' | 'ingreso_esperado' | 'vencidos' | 'cobrados' | 'cancelados';

const Pendientes = () => {
  const { pendings, loading, addPending, updatePending, deletePending, markAsPaid, totalPendientePorCobrar, overdueCount } = usePendings();
  const { accounts, categories, transactions } = useFinanceDataSupabase();
  const { config } = useAppConfig();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Pending | null>(null);
  const [payingPending, setPayingPending] = useState<Pending | null>(null);
  const [deleting, setDeleting] = useState<Pending | null>(null);
  const [filter, setFilter] = useState<Filter>('todos');

  const filtered = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return pendings.filter(p => {
      switch (filter) {
        case 'todos':
          return p.estado === 'pendiente' || p.estado === 'cobrado_parcial';
        case 'reembolso_gasto':
        case 'ingreso_esperado':
          return p.tipo === filter && (p.estado === 'pendiente' || p.estado === 'cobrado_parcial');
        case 'vencidos':
          return (p.estado === 'pendiente' || p.estado === 'cobrado_parcial')
            && p.fecha_esperada && new Date(p.fecha_esperada) < today;
        case 'cobrados':
          return p.estado === 'cobrado';
        case 'cancelados':
          return p.estado === 'cancelado';
      }
    });
  }, [pendings, filter]);

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Pendientes de cobro</h1>
            <p className="text-sm text-muted-foreground">
              Reembolsos e ingresos esperados. No afectan tus balances hasta que los marques como cobrados.
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nuevo pendiente
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total por cobrar</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatNumber(totalPendientePorCobrar)} {config.currency}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Vencidos</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-destructive">{overdueCount}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Activos</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{pendings.filter(p => p.estado === 'pendiente' || p.estado === 'cobrado_parcial').length}</p></CardContent>
          </Card>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="todos">Activos</TabsTrigger>
            <TabsTrigger value="reembolso_gasto">Reembolsos</TabsTrigger>
            <TabsTrigger value="ingreso_esperado">Ingresos esperados</TabsTrigger>
            <TabsTrigger value="vencidos">Vencidos</TabsTrigger>
            <TabsTrigger value="cobrados">Cobrados</TabsTrigger>
            <TabsTrigger value="cancelados">Cancelados</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">Cargando...</div>
                ) : filtered.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">Sin pendientes en esta vista.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Monto esperado</TableHead>
                          <TableHead className="text-right">Cobrado</TableHead>
                          <TableHead>Fecha esperada</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((p) => {
                          const isOverdue = p.fecha_esperada && new Date(p.fecha_esperada) < new Date()
                            && (p.estado === 'pendiente' || p.estado === 'cobrado_parcial');
                          const restante = p.monto_esperado - (p.monto_cobrado ?? 0);
                          return (
                            <TableRow key={p.id}>
                              <TableCell>
                                <div className="font-medium">{p.concepto}</div>
                                {p.notas && <div className="text-xs text-muted-foreground">{p.notas}</div>}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {p.tipo === 'reembolso_gasto' ? 'Reembolso' : 'Ingreso esperado'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono">{formatNumber(p.monto_esperado)} {p.divisa}</TableCell>
                              <TableCell className="text-right font-mono">
                                {formatNumber(p.monto_cobrado ?? 0)}
                                {p.estado === 'cobrado_parcial' && (
                                  <div className="text-xs text-muted-foreground">Resta {formatNumber(restante)}</div>
                                )}
                              </TableCell>
                              <TableCell>
                                {p.fecha_esperada ? (
                                  <span className={isOverdue ? 'text-destructive flex items-center gap-1' : ''}>
                                    {isOverdue && <AlertCircle className="h-3 w-3" />}
                                    {new Date(p.fecha_esperada + 'T00:00:00').toLocaleDateString()}
                                  </span>
                                ) : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>
                                {p.estado === 'pendiente' && <Badge>Pendiente</Badge>}
                                {p.estado === 'cobrado_parcial' && <Badge variant="secondary">Parcial</Badge>}
                                {p.estado === 'cobrado' && <Badge className="bg-green-600 hover:bg-green-700">Cobrado</Badge>}
                                {p.estado === 'cancelado' && <Badge variant="outline">Cancelado</Badge>}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  {(p.estado === 'pendiente' || p.estado === 'cobrado_parcial') && (
                                    <>
                                      <Button size="sm" variant="default" onClick={() => setPayingPending(p)}>
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Cobrar
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => updatePending(p.id, { estado: 'cancelado' })}>
                                        <XCircle className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                  <Button size="sm" variant="ghost" onClick={() => setDeleting(p)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
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
          </TabsContent>
        </Tabs>
      </div>

      {(addOpen || editing) && (
        <PendingForm
          open={addOpen || !!editing}
          onOpenChange={(o) => { if (!o) { setAddOpen(false); setEditing(null); } }}
          initial={editing}
          defaultCurrency={config.currency}
          transactions={transactions}
          onSave={async (data) => {
            if (editing) {
              await updatePending(editing.id, data);
            } else {
              await addPending(data as any);
            }
            setAddOpen(false); setEditing(null);
          }}
        />
      )}

      {payingPending && (
        <PayPendingDialog
          pending={payingPending}
          accounts={accounts}
          categories={categories}
          onCancel={() => setPayingPending(null)}
          onConfirm={async (opts) => {
            await markAsPaid({ pending: payingPending, ...opts });
            setPayingPending(null);
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pendiente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto no elimina la transacción original ni la de cobro (si existe). Solo elimina el registro de seguimiento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleting) deletePending(deleting.id); setDeleting(null); }}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

// ---------- Formulario alta/edición ----------
interface PendingFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Pending | null;
  defaultCurrency: string;
  transactions: any[];
  onSave: (data: Partial<Pending>) => Promise<void>;
}
const PendingForm = ({ open, onOpenChange, initial, defaultCurrency, transactions, onSave }: PendingFormProps) => {
  const [tipo, setTipo] = useState<PendingTipo>(initial?.tipo ?? 'reembolso_gasto');
  const [concepto, setConcepto] = useState(initial?.concepto ?? '');
  const [monto, setMonto] = useState(initial?.monto_esperado?.toString() ?? '');
  const [divisa, setDivisa] = useState(initial?.divisa ?? defaultCurrency);
  const [fecha, setFecha] = useState(initial?.fecha_esperada ?? '');
  const [notas, setNotas] = useState(initial?.notas ?? '');
  const [transaccionId, setTransaccionId] = useState<string>(initial?.transaccion_id ?? 'none');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concepto || !monto) return;
    await onSave({
      tipo,
      concepto,
      monto_esperado: parseFloat(monto),
      divisa,
      fecha_esperada: fecha || null,
      notas: notas || null,
      transaccion_id: transaccionId === 'none' ? null : transaccionId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-2xl lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar pendiente' : 'Nuevo pendiente'}</DialogTitle>
          <DialogDescription>
            Registra un reembolso esperado o un ingreso por cobrar. No afectará tus balances hasta marcarlo como cobrado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as PendingTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reembolso_gasto">Reembolso de gasto</SelectItem>
                  <SelectItem value="ingreso_esperado">Ingreso esperado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Divisa</Label>
              <Select value={divisa} onValueChange={setDivisa}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MXN">MXN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Concepto</Label>
            <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} required placeholder="Ej: Reembolso viaje Cliente X" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Monto esperado</Label>
              <Input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} required />
            </div>
            <div>
              <Label>Fecha esperada (opcional)</Label>
              <Input type="date" value={fecha ?? ''} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>

          <div className="min-w-0">
            <Label>Transacción vinculada (opcional)</Label>
            <TransactionCombobox
              transactions={transactions}
              value={transaccionId}
              onChange={setTransaccionId}
            />
          </div>




          <div>
            <Label>Notas</Label>
            <Textarea value={notas ?? ''} onChange={(e) => setNotas(e.target.value)} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ---------- Combobox buscador de transacciones ----------
const TransactionCombobox = ({
  transactions,
  value,
  onChange,
}: {
  transactions: any[];
  value: string;
  onChange: (v: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const selected = value !== 'none' ? transactions.find((t) => t.id === value) : null;

  const formatFecha = (raw: any): string => {
    if (!raw) return '';
    const s = String(raw).slice(0, 10);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const pad = (n: number) => String(n).padStart(2, '0');
    if (m) return `${pad(+m[3])}/${pad(+m[2])}/${m[1]}`;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  const label = (t: any) => {
    const monto = t.gasto > 0 ? t.gasto : t.ingreso;
    const fecha = formatFecha(t.fecha);
    return `${fecha} · ${t.comentario || 'Sin descripción'} · ${formatNumber(monto ?? 0)} ${t.divisa ?? ''}`.trim();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="flex w-full min-w-0 max-w-full items-center justify-between gap-2 overflow-hidden px-3 font-normal"
        >
          <span className="block flex-1 min-w-0 truncate text-left">
            {selected ? label(selected) : '— Ninguna —'}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(val, search) => {
            // val is the CommandItem value which we set to a searchable string
            return val.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Buscar por concepto o monto..." />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="ninguna"
                onSelect={() => { onChange('none'); setOpen(false); }}
              >
                <Check className={cn('mr-2 h-4 w-4', value === 'none' ? 'opacity-100' : 'opacity-0')} />
                — Ninguna —
              </CommandItem>
              {transactions.slice(0, 500).map((t) => {
                const monto = t.gasto > 0 ? t.gasto : t.ingreso;
                const search = `${t.comentario ?? ''} ${monto ?? ''} ${t.fecha ?? ''}`;
                return (
                  <CommandItem
                    key={t.id}
                    value={`${search}__${t.id}`}
                    onSelect={() => { onChange(t.id); setOpen(false); }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === t.id ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate">{label(t)}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// ---------- Modal cobrar ----------
interface PayDialogProps {
  pending: Pending;
  accounts: any[];
  categories: any[];
  onCancel: () => void;
  onConfirm: (opts: { cuentaId: string; subcategoriaId: string; fechaCobro: Date; montoCobrado: number; comentario?: string }) => Promise<void>;
}
const PayPendingDialog = ({ pending, accounts, categories, onCancel, onConfirm }: PayDialogProps) => {
  const restante = pending.monto_esperado - (pending.monto_cobrado ?? 0);
  const [cuentaId, setCuentaId] = useState<string>(accounts[0]?.id ?? '');
  const [monto, setMonto] = useState(restante.toString());
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [comentario, setComentario] = useState('');

  const ingresoCats = categories.filter((c: any) => c.tipo === 'Ingreso');
  const [subcatId, setSubcatId] = useState<string>(ingresoCats[0]?.id ?? '');

  const handleConfirm = async () => {
    if (!cuentaId || !subcatId || !monto) return;
    await onConfirm({
      cuentaId,
      subcategoriaId: subcatId,
      fechaCobro: new Date(fecha + 'T00:00:00'),
      montoCobrado: parseFloat(monto),
      comentario: comentario || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar como cobrado</DialogTitle>
          <DialogDescription>
            Se creará una transacción real de ingreso en la cuenta seleccionada.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm p-3 bg-muted rounded">
            <div className="font-medium">{pending.concepto}</div>
            <div className="text-xs text-muted-foreground">
              Esperado: {formatNumber(pending.monto_esperado)} {pending.divisa} · Restante: {formatNumber(restante)}
            </div>
          </div>

          <div>
            <Label>Cuenta destino</Label>
            <Select value={cuentaId} onValueChange={setCuentaId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {accounts.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Categoría de ingreso</Label>
            <Select value={subcatId} onValueChange={setSubcatId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {ingresoCats.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.categoria} / {c.subcategoria}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Monto cobrado</Label>
              <Input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} />
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Comentario (opcional)</Label>
            <Input value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder={`Cobro pendiente: ${pending.concepto}`} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleConfirm}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar cobro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Pendientes;
