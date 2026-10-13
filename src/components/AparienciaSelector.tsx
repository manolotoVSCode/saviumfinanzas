import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPCIONES = [
  { valor: 'system', titulo: 'Automática', Icono: Monitor },
  { valor: 'light', titulo: 'Clara', Icono: Sun },
  { valor: 'dark', titulo: 'Oscura', Icono: Moon },
] as const;

/** Como Ajustes → Apariencia en la app del iPhone: Automática sigue al sistema. Se guarda en este navegador. */
export const AparienciaSelector = () => {
  const { theme, setTheme } = useTheme();
  // next-themes no conoce el tema hasta montar: sin esto el primer render marcaría una opción equivocada.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  return (
    <div role="radiogroup" aria-label="Apariencia" className="inline-flex rounded-lg bg-muted p-1 gap-1">
      {OPCIONES.map(({ valor, titulo, Icono }) => {
        const activa = montado && theme === valor;
        return (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={activa}
            onClick={() => setTheme(valor)}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              activa ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icono className="h-4 w-4" />
            {titulo}
          </button>
        );
      })}
    </div>
  );
};
