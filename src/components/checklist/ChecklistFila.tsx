import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChecklistItem, estaVencida } from '@/lib/finance/checklist';
import { diasHasta, formatFechaCorta, parseFechaLocal } from '@/lib/finance/fechas';
import { Transaction } from '@/types/finance';
import { useAppConfig } from '@/hooks/useAppConfig';
import { ArrowUpDown, CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** «Hoy», «Mañana», «En 3 días», «Hace 2 días» junto a la fecha. */
const cuandoTexto = (fecha: string): string => {
  const d = diasHasta(fecha);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  if (d === -1) return 'Ayer';
  return d > 0 ? `En ${d} días` : `Hace ${-d} días`;
};

/** Resumen de la transacción ligada: fecha, concepto e importe. */
export const ResumenTransaccion = ({ tx }: { tx: Transaction }) => {
  const { formatCurrency } = useAppConfig();
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
      <ArrowUpDown className="h-3 w-3 shrink-0" />
      <span className="tabular-nums shrink-0">{formatFechaCorta(tx.fecha)}</span>
      <span className="truncate">{tx.comentario || 'Sin concepto'}</span>
      <span className={cn('tabular-nums font-medium shrink-0', tx.monto < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400')}>
        ${formatCurrency(Math.abs(tx.monto))} {tx.divisa}
      </span>
    </span>
  );
};

interface Props {
  item: ChecklistItem;
  /** Transacción ligada, si existe y está cargada. */
  tx?: Transaction;
  onMarcar: (completada: boolean) => void;
  onEditar?: () => void;
  onBorrar?: () => void;
}

/** Una tarea del Checklist: casilla, texto, fecha y transacción ligada. */
export const ChecklistFila = ({ item, tx, onMarcar, onEditar, onBorrar }: Props) => {
  const vencida = estaVencida(item);
  return (
    <div className={cn('flex items-start gap-3 rounded-lg border p-3', vencida && 'border-destructive/40 bg-destructive/5')}>
      <Checkbox
        className="mt-0.5"
        checked={item.completada}
        onCheckedChange={v => onMarcar(v === true)}
        aria-label={item.completada ? 'Marcar como pendiente' : 'Marcar como completada'}
      />
      <div className="flex-1 min-w-0 space-y-1">
        <p className={cn('text-sm font-medium break-words', item.completada && 'line-through text-muted-foreground')}>
          {item.texto}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {item.fecha && (
            <span className={cn('inline-flex items-center gap-1 text-xs', vencida ? 'text-destructive font-medium' : 'text-muted-foreground')}>
              <CalendarDays className="h-3 w-3" />
              {formatFechaCorta(parseFechaLocal(item.fecha))}
              {!item.completada && <> · {cuandoTexto(item.fecha)}</>}
            </span>
          )}
          {vencida && <Badge variant="destructive" className="text-[10px] h-4 px-1.5">Vencida</Badge>}
          {tx && <ResumenTransaccion tx={tx} />}
          {item.transaccion_id && !tx && (
            <span className="text-xs text-muted-foreground">Transacción no encontrada</span>
          )}
        </div>
      </div>
      {(onEditar || onBorrar) && (
        <div className="flex shrink-0 gap-1">
          {onEditar && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Editar" onClick={onEditar}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {onBorrar && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Borrar" onClick={onBorrar}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
