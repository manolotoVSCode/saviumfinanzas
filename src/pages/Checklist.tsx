import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChecklistFila } from '@/components/checklist/ChecklistFila';
import { useChecklist } from '@/hooks/useChecklist';
import { useFinanceDataSupabase } from '@/hooks/useFinanceDataSupabase';
import { agruparChecklist, ChecklistItem, GrupoChecklist } from '@/lib/finance/checklist';
import { ListChecks, Settings } from 'lucide-react';

const GRUPOS: { id: Exclude<GrupoChecklist, 'completadas'>; titulo: string }[] = [
  { id: 'vencidas', titulo: 'Vencidas' },
  { id: 'proximas', titulo: 'Próximas' },
  { id: 'sinFecha', titulo: 'Sin fecha' },
];

/** Checklist: consultar y marcar las tareas. Se apuntan y editan en Configuración. */
const Checklist = () => {
  const navigate = useNavigate();
  const { items, loading, error, marcar, borrar } = useChecklist();
  const { transactions } = useFinanceDataSupabase();
  const [verCompletadas, setVerCompletadas] = useState(false);
  const [aBorrar, setABorrar] = useState<ChecklistItem | null>(null);

  const porId = useMemo(() => new Map(transactions.map(t => [t.id, t])), [transactions]);
  const grupos = useMemo(() => agruparChecklist(items), [items]);
  const abiertas = grupos.vencidas.length + grupos.proximas.length + grupos.sinFecha.length;

  const fila = (item: ChecklistItem) => (
    <ChecklistFila
      key={item.id}
      item={item}
      tx={item.transaccion_id ? porId.get(item.transaccion_id) : undefined}
      onMarcar={c => marcar({ id: item.id, completada: c })}
      // Las abiertas se borran en Configuración; las completadas, solo aquí.
      onBorrar={item.completada ? () => setABorrar(item) : undefined}
    />
  );

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <PageHeader
          title="Checklist"
          subtitle="Lo que tienes pendiente de actualizar en tus transacciones. Las tareas con fecha que pasan sin completarse también aparecen en Alertas."
          actions={
            <Button variant="outline" size="sm" onClick={() => navigate('/configuracion')}>
              <Settings className="h-4 w-4 mr-1" />
              Añadir o editar
            </Button>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : error ? (
          <Card><CardContent className="py-8 text-center text-destructive">No se pudo cargar el checklist.</CardContent></Card>
        ) : abiertas === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
              <ListChecks className="h-8 w-8 opacity-50" />
              <p>{items.length === 0 ? 'Aún no tienes tareas. Apúntalas en Configuración → Checklist.' : 'Todo completado.'}</p>
            </CardContent>
          </Card>
        ) : (
          GRUPOS.filter(g => grupos[g.id].length > 0).map(g => (
            <section key={g.id} className="space-y-2">
              <h2 className={`text-sm font-semibold ${g.id === 'vencidas' ? 'text-destructive' : 'text-muted-foreground'}`}>
                {g.titulo} ({grupos[g.id].length})
              </h2>
              {grupos[g.id].map(fila)}
            </section>
          ))
        )}

        {grupos.completadas.length > 0 && (
          <section className="space-y-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setVerCompletadas(v => !v)}>
              {verCompletadas ? 'Ocultar' : 'Ver'} completadas ({grupos.completadas.length})
            </Button>
            {verCompletadas && <div className="space-y-2 opacity-80">{grupos.completadas.map(fila)}</div>}
          </section>
        )}
      </div>

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
              onClick={() => { if (aBorrar) borrar(aBorrar.id); setABorrar(null); }}
            >
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Checklist;
