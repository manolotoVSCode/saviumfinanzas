import { Button } from '@/components/ui/button';
import { Check, CloudOff, Loader2, Pencil, TriangleAlert } from 'lucide-react';
import { EstadoGuardado } from '@/hooks/useEditorFamilia';

interface Props {
  estado: EstadoGuardado;
  onReintentar: () => void;
  onRecargar: () => void;
  onGuardarLaMia: () => void;
}

export const IndicadorGuardado = ({ estado, onReintentar, onRecargar, onGuardarLaMia }: Props) => {
  if (estado === 'conflicto') {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-destructive">
        <TriangleAlert className="h-4 w-4" />
        <span>Se guardó una versión más nueva en otro sitio</span>
        <Button size="sm" variant="outline" onClick={onRecargar}>Recargar</Button>
        <Button size="sm" variant="destructive" onClick={onGuardarLaMia}>Guardar la mía</Button>
      </div>
    );
  }
  if (estado === 'error') {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <CloudOff className="h-4 w-4" /><span>Sin guardar</span>
        <Button size="sm" variant="outline" onClick={onReintentar}>Reintentar</Button>
      </div>
    );
  }
  const meta = {
    guardado: { icon: <Check className="h-4 w-4" />, texto: 'Guardado' },
    pendiente: { icon: <Pencil className="h-4 w-4" />, texto: 'Sin guardar' },
    guardando: { icon: <Loader2 className="h-4 w-4 animate-spin" />, texto: 'Guardando…' },
  }[estado];
  return <span className="flex items-center gap-1 text-sm text-muted-foreground">{meta.icon}{meta.texto}</span>;
};
