import { Copy, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Codigo } from './Codigo';
import { TarjetaRewards } from './TarjetaRewards';
import { dia, titulo, unidadDe, type Programa, type Tarjeta } from '@/lib/rewards/tipos';
import { formatNumber } from '@/lib/formatters';

export function DetalleTarjeta({ tarjeta, programa, dueno, onEditar, onCerrar }: {
  tarjeta: Tarjeta; programa?: Programa; dueno?: string; onEditar?: () => void; onCerrar: () => void;
}) {
  const filas: [string, string | null][] = [
    ['Titular', tarjeta.titular],
    ['Saldo', tarjeta.saldo !== null ? `${formatNumber(tarjeta.saldo, 0)} ${unidadDe(tarjeta, programa)}` : null],
    ['Saldo a fecha de', dia(tarjeta.saldo_fecha)],
    ['Caducidad', dia(tarjeta.caducidad)],
    ['Notas', tarjeta.notas],
    ['De', dueno ?? null],
  ];
  return (
    <Dialog open onOpenChange={abierto => !abierto && onCerrar()}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>{titulo(tarjeta, programa)}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <TarjetaRewards tarjeta={tarjeta} programa={programa} dueno={dueno} />
          {tarjeta.codigo_valor && tarjeta.codigo_tipo !== 'ninguno' && (
            <>
              <Codigo valor={tarjeta.codigo_valor} tipo={tarjeta.codigo_tipo} />
              <p className="text-center font-mono text-sm text-muted-foreground">{tarjeta.codigo_valor}</p>
            </>
          )}
          <div className="divide-y rounded-xl border">
            {tarjeta.numero_socio && (
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">Número de socio</p>
                  <p className="font-mono">{tarjeta.numero_socio}</p>
                </div>
                <Button variant="ghost" size="icon" aria-label="Copiar"
                  onClick={() => navigator.clipboard.writeText(tarjeta.numero_socio ?? '')}><Copy className="h-4 w-4" /></Button>
              </div>
            )}
            {filas.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="px-4 py-3">
                <p className="text-xs text-muted-foreground">{k}</p>
                <p className="whitespace-pre-wrap">{v}</p>
              </div>
            ))}
          </div>
          {onEditar && <Button variant="secondary" className="w-full" onClick={onEditar}><Pencil className="mr-2 h-4 w-4" />Editar</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
