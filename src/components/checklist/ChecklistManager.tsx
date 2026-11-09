import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useChecklist } from '@/hooks/useChecklist';
import { agruparChecklist, ChecklistItem } from '@/lib/finance/checklist';
import { Transaction } from '@/types/finance';
import { ChecklistFila } from './ChecklistFila';
import { TransaccionSelector } from './TransaccionSelector';
import { ArrowRight, ListChecks, Plus, Save } from 'lucide-react';

interface Props {
  transactions: Transaction[];
}

/**
 * Configuración → Checklist: apuntar, editar y borrar tareas sobre las transacciones.
 * Si pasa la fecha sin completarse, la tarea aparece en Alertas.
 */
export const ChecklistManager = ({ transactions }: Props) => {
  const navigate = useNavigate();
  const { items, loading, error, crear, actualizar, marcar, borrar, guardando } = useChecklist();
  const [editando, setEditando] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [fecha, setFecha] = useState('');
  const [transaccionId, setTransaccionId] = useState<string | null>(null);
  const [aBorrar, setABorrar] = useState<ChecklistItem | null>(null);

  const porId = useMemo(() => new Map(transactions.map(t => [t.id, t])), [transactions]);
  const grupos = useMemo(() => agruparChecklist(items), [items]);
  const abiertas = [...grupos.vencidas, ...grupos.proximas, ...grupos.sinFecha];

  const limpiar = () => { setEditando(null); setTexto(''); setFecha(''); setTransaccionId(null); };

  const editar = (item: ChecklistItem) => {
    setEditando(item.id);
    setTexto(item.texto);
    setFecha(item.fecha ?? '');
    setTransaccionId(item.transaccion_id);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const datos = { texto: texto.trim(), fecha: fecha || null, transaccion_id: transaccionId };
    if (!datos.texto) return;
    try {
      if (editando) await actualizar({ id: editando, ...datos });
      else await crear(datos);
      limpiar();
    } catch { /* el hook ya avisó */ }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Checklist
          </span>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/checklist')}>
            Ver checklist <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Apunta lo que tienes que actualizar en tus transacciones. Si le pones fecha y pasa sin marcarla como completada, aparece en Alertas.
        </p>

        <form onSubmit={guardar} className="space-y-3 rounded-lg border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="checklist-texto">{editando ? 'Editar tarea' : 'Nueva tarea'}</Label>
            <Input
              id="checklist-texto"
              placeholder="Ej.: Cambiar la categoría del pago de la luz"
              value={texto}
              maxLength={300}
              onChange={e => setTexto(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-[11rem_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="checklist-fecha">Fecha (opcional)</Label>
              <Input id="checklist-fecha" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label>Transacción</Label>
              <TransaccionSelector transactions={transactions} value={transaccionId} onChange={setTransaccionId} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {editando && <Button type="button" variant="ghost" onClick={limpiar}>Cancelar</Button>}
            <Button type="submit" disabled={!texto.trim() || guardando}>
              {editando ? <><Save className="h-4 w-4 mr-1" />Guardar</> : <><Plus className="h-4 w-4 mr-1" />Añadir</>}
            </Button>
          </div>
        </form>

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : error ? (
          <p className="text-sm text-destructive">No se pudo cargar el checklist.</p>
        ) : abiertas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tienes tareas pendientes.</p>
        ) : (
          <div className="space-y-2">
            {abiertas.map(item => (
              <ChecklistFila
                key={item.id}
                item={item}
                tx={item.transaccion_id ? porId.get(item.transaccion_id) : undefined}
                onMarcar={c => marcar({ id: item.id, completada: c })}
                onEditar={() => editar(item)}
                onBorrar={() => setABorrar(item)}
              />
            ))}
          </div>
        )}
        {grupos.completadas.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {grupos.completadas.length} completada{grupos.completadas.length === 1 ? '' : 's'}: están en la página Checklist.
          </p>
        )}
      </CardContent>

      <AlertDialog open={!!aBorrar} onOpenChange={o => !o && setABorrar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar esta tarea?</AlertDialogTitle>
            <AlertDialogDescription>«{aBorrar?.texto}» se borrará y no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (aBorrar) { borrar(aBorrar.id); if (editando === aBorrar.id) limpiar(); } setABorrar(null); }}
            >
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
