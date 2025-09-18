import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, Database } from 'lucide-react';

interface TableSelection {
  transacciones: boolean;
  cuentas: boolean;
  categorias: boolean;
  inversiones: boolean;
  criptomonedas: boolean;
  profiles: boolean;
}

export const DatabaseBackup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [tables, setTables] = useState<TableSelection>({
    transacciones: true,
    cuentas: true,
    categorias: true,
    inversiones: true,
    criptomonedas: true,
    profiles: true,
  });
  const { toast } = useToast();

  const handleTableToggle = (table: keyof TableSelection) => {
    setTables(prev => ({
      ...prev,
      [table]: !prev[table]
    }));
  };

  const exportToCSV = async () => {
    setIsLoading(true);
    
    try {
      const selectedTables = Object.entries(tables)
        .filter(([_, selected]) => selected)
        .map(([table, _]) => table);

      if (selectedTables.length === 0) {
        toast({
          title: "Error",
          description: "Debes seleccionar al menos una tabla para exportar",
          variant: "destructive"
        });
        return;
      }

      let csvContent = '';
      const timestamp = new Date().toISOString().split('T')[0];

      for (const tableName of selectedTables) {
        // Obtener datos de cada tabla
        const { data, error } = await supabase
          .from(tableName as any)
          .select('*');

        if (error) {
          // Error fetching table data
          continue;
        }

        if (data && data.length > 0) {
          // Agregar encabezado de la tabla
          csvContent += `\n=== ${tableName.toUpperCase()} ===\n`;
          
          // Agregar encabezados de columnas
          const headers = Object.keys(data[0]);
          csvContent += headers.join(',') + '\n';
          
          // Agregar datos
          data.forEach(row => {
            const values = headers.map(header => {
              const value = row[header];
              // Escapar comillas y manejar valores nulos
              if (value === null || value === undefined) return '';
              if (typeof value === 'string' && value.includes(',')) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return String(value);
            });
            csvContent += values.join(',') + '\n';
          });
          
          csvContent += '\n';
        }
      }

      // Crear y descargar el archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `savium_backup_${timestamp}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Éxito",
        description: `Copia de seguridad exportada como savium_backup_${timestamp}.csv`,
      });

    } catch (error) {
      // Error creating backup
      toast({
        title: "Error",
        description: "No se pudo crear la copia de seguridad",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const tableLabels = {
    transacciones: 'Transacciones',
    cuentas: 'Cuentas',
    categorias: 'Categorías',
    inversiones: 'Inversiones',
    criptomonedas: 'Criptomonedas',
    profiles: 'Perfil'
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Copia de Seguridad</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Descarga una copia de seguridad de tus datos en formato CSV
      </p>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Crear Copia de Seguridad
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Seleccionar Tablas para Exportar</AlertDialogTitle>
            <AlertDialogDescription>
              Elige qué datos quieres incluir en tu copia de seguridad:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-3 my-4">
            {Object.entries(tables).map(([table, selected]) => (
              <div key={table} className="flex items-center space-x-2">
                <Checkbox
                  id={table}
                  checked={selected}
                  onCheckedChange={() => handleTableToggle(table as keyof TableSelection)}
                />
                <label
                  htmlFor={table}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {tableLabels[table as keyof typeof tableLabels]}
                </label>
              </div>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={exportToCSV}
              disabled={isLoading}
            >
              {isLoading ? 'Exportando...' : 'Descargar CSV'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};