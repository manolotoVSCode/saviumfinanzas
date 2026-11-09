import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Transaction } from '@/types/finance';
import { ResumenTransaccion } from './ChecklistFila';
import { Link2, Search, X } from 'lucide-react';

const MAX_RESULTADOS = 40;

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface Props {
  transactions: Transaction[];
  value: string | null;
  onChange: (id: string | null) => void;
}

/**
 * Elegir una transacción (opcional) buscando por concepto o importe.
 * Sin búsqueda muestra las más recientes; nunca pinta más de MAX_RESULTADOS.
 */
export const TransaccionSelector = ({ transactions, value, onChange }: Props) => {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const elegida = value ? transactions.find(t => t.id === value) : undefined;

  const ordenadas = useMemo(
    () => [...transactions].sort((a, b) => b.fecha.getTime() - a.fecha.getTime()),
    [transactions]
  );

  const resultados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return ordenadas.slice(0, MAX_RESULTADOS);
    const out: Transaction[] = [];
    for (const t of ordenadas) {
      const texto = `${normalizar(t.comentario ?? '')} ${Math.abs(t.monto).toFixed(2)} ${t.subcategoria ? normalizar(t.subcategoria) : ''}`;
      if (texto.includes(q)) out.push(t);
      if (out.length >= MAX_RESULTADOS) break;
    }
    return out;
  }, [busqueda, ordenadas]);

  if (elegida) {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2 min-w-0">
        <div className="flex-1 min-w-0"><ResumenTransaccion tx={elegida} /></div>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" title="Quitar transacción" onClick={() => onChange(null)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start font-normal text-muted-foreground">
          <Link2 className="h-4 w-4 mr-2" />
          Ligar a una transacción (opcional)
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(32rem,calc(100vw-2rem))] p-2" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            className="pl-8"
            placeholder="Buscar por concepto o importe"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <div className="max-h-72 overflow-y-auto">
          {resultados.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin resultados</p>
          ) : resultados.map(t => (
            <button
              key={t.id}
              type="button"
              className="flex w-full min-w-0 rounded px-2 py-1.5 text-left hover:bg-accent"
              onClick={() => { onChange(t.id); setAbierto(false); setBusqueda(''); }}
            >
              <ResumenTransaccion tx={t} />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
