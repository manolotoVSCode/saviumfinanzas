import { ReactNode } from 'react';
import { formatNumber } from '@/lib/formatters';
import { cn } from '@/lib/utils';

/** Importe con el código de divisa junto al número. `principal` = 32px. */
export const Importe = ({
  amount, currency, principal = false, className,
}: { amount: number; currency: string; principal?: boolean; className?: string }) => (
  <span className={cn('tabular-nums whitespace-nowrap', principal ? 'text-[32px] font-bold leading-none' : 'text-base font-semibold', className)}>
    {formatNumber(amount)}{' '}
    <span className={cn('font-normal text-muted-foreground', principal ? 'text-base' : 'text-sm')}>{currency}</span>
  </span>
);

export const Seccion = ({ titulo, children, className }: { titulo: string; children: ReactNode; className?: string }) => (
  <section className={cn('space-y-2', className)}>
    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground px-1">{titulo}</h2>
    {children}
  </section>
);

export const Cargando = ({ texto = 'Cargando...' }: { texto?: string }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    <p className="text-base">{texto}</p>
  </div>
);
