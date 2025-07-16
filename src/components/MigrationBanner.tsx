import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMigration } from '@/hooks/useMigration';
import { Database, Upload, AlertCircle, CheckCircle } from 'lucide-react';

export const MigrationBanner = () => {
  const { migrateFromLocalStorage, checkMigrationNeeded } = useMigration();
  const [migrating, setMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  
  const needsMigration = checkMigrationNeeded();

  if (!needsMigration || migrationComplete) {
    return null;
  }

  const handleMigration = async () => {
    setMigrating(true);
    const success = await migrateFromLocalStorage();
    if (success) {
      setMigrationComplete(true);
      // Recargar la página para que use los nuevos datos de Supabase
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
    setMigrating(false);
  };

  return (
    <Card className="border-orange-200 bg-orange-50 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Database className="h-5 w-5" />
          Migración de Datos Disponible
        </CardTitle>
        <CardDescription className="text-orange-700">
          Se encontraron datos financieros en tu navegador. ¡Transfiérelos a la nube para mayor seguridad!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Este proceso transferirá todas tus cuentas, categorías y transacciones desde el almacenamiento 
            local a Supabase. Después de la migración, tus datos estarán respaldados en la nube.
          </AlertDescription>
        </Alert>
        
        <div className="flex gap-3">
          <Button 
            onClick={handleMigration}
            disabled={migrating}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {migrating ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-spin" />
                Migrando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Migrar Datos
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setMigrationComplete(true)}
            disabled={migrating}
          >
            Migrar Más Tarde
          </Button>
        </div>

        {migrationComplete && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ¡Migración completada! Recargando para mostrar los datos migrados...
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};