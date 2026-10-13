import { Plane, BedDouble, CreditCard, ShoppingCart, Users, User } from 'lucide-react';
import { colorDe, titulo, type Programa, type Tarjeta } from '@/lib/rewards/tipos';

const ICONOS = { aerolinea: Plane, hotel: BedDouble, tarjeta_credito: CreditCard, comercio: ShoppingCart };

/** Tarjeta estilo Wallet, como en la app Savium Rewards. */
export function TarjetaRewards({ tarjeta, programa, dueno, onClick }: {
  tarjeta: Tarjeta; programa?: Programa; dueno?: string; onClick?: () => void;
}) {
  const color = colorDe(tarjeta, programa);
  const nombre = titulo(tarjeta, programa);
  const iniciales = nombre.split(/\s+/).filter(p => /\p{L}/u.test(p[0] ?? '')).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  const Icono = programa ? ICONOS[programa.tipo] : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex min-h-[150px] w-full flex-col overflow-hidden rounded-[26px] p-5 text-left text-white shadow-lg transition active:scale-[0.98]"
      style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${color} 82%, white), color-mix(in srgb, ${color} 88%, black))` }}
    >
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 to-transparent to-50%" />
      <div className="relative flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white/20 text-lg font-bold">{iniciales}</span>
        <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">
          {tarjeta.compartida && !dueno && <Users className="h-3.5 w-3.5" aria-label="Compartida" />}
          {dueno && <><User className="h-3.5 w-3.5" />{dueno}</>}
          {Icono && <Icono className="h-3.5 w-3.5" />}
        </span>
      </div>
      <div className="relative mt-auto pt-4">
        <div className="truncate text-xl font-bold">{nombre}</div>
        {tarjeta.numero_socio && <div className="truncate font-mono text-lg font-semibold opacity-90">{tarjeta.numero_socio}</div>}
      </div>
    </button>
  );
}
