import { useNavigate } from 'react-router-dom';
import { Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SoloEscritorio = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center text-center gap-4 py-20 px-4">
      <Monitor className="h-12 w-12 text-muted-foreground" />
      <p className="text-xl font-semibold">Solo disponible en escritorio</p>
      <p className="text-base text-muted-foreground">
        Esta pantalla no tiene versión móvil. Ábrela desde un ordenador.
      </p>
      <Button size="lg" className="h-12 text-base" onClick={() => navigate('/dashboard')}>
        Ir a Resumen
      </Button>
    </div>
  );
};

export default SoloEscritorio;
