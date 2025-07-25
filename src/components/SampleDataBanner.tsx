import { AlertTriangle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSampleData } from '@/hooks/useSampleData';
import { toast } from 'sonner';

export const SampleDataBanner = () => {
  const { hasSampleData, clearSampleData } = useSampleData();

  if (!hasSampleData) return null;

  const handleClearData = async () => {
    const success = await clearSampleData();
    if (success) {
      toast.success('Datos de ejemplo eliminados correctamente');
      window.location.reload(); // Refresh to update all data
    } else {
      toast.error('Error al eliminar los datos de ejemplo');
    }
  };

  return (
    <Alert className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-amber-800 dark:text-amber-200">
          <strong>Datos de ejemplo:</strong> Estás viendo datos de muestra para que puedas explorar la aplicación. 
          Cuando crees tu primera cuenta o categoría, estos datos se eliminarán automáticamente.
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearData}
          className="ml-4 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900"
        >
          <X className="h-3 w-3 mr-1" />
          Eliminar ahora
        </Button>
      </AlertDescription>
    </Alert>
  );
};