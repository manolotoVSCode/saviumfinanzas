import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Ruta a la que vuelve el «‹» (como el botón atrás de iOS). */
  back?: string;
  /** Botones a la derecha del título. */
  actions?: ReactNode;
}

/** Título grande a la izquierda, como «Resumen» o «Patrimonio» en la app del iPhone. Igual en todas las páginas. */
export const PageHeader = ({ title, subtitle, back, actions }: PageHeaderProps) => {
  const navigate = useNavigate();
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        {back && (
          <button
            type="button"
            onClick={() => navigate(back)}
            className="-ml-1.5 mb-1 flex items-center text-sm font-medium text-primary hover:opacity-70 transition-opacity"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
            Volver
          </button>
        )}
        <h1 className="text-[2rem] font-bold leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground max-w-3xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
};
