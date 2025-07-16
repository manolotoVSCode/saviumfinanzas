import { supabase } from '@/integrations/supabase/client';
import { Account, Category, Transaction } from '@/types/finance';
import { useToast } from '@/hooks/use-toast';

export const useMigration = () => {
  const { toast } = useToast();

  const migrateFromLocalStorage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      console.log('Iniciando migración para usuario:', user.id);

      // Obtener datos del localStorage
      const localAccounts = JSON.parse(localStorage.getItem('financeAccounts') || '[]') as Account[];
      const localCategories = JSON.parse(localStorage.getItem('financeCategories') || '[]') as Category[];
      const localTransactions = JSON.parse(localStorage.getItem('financeTransactions') || '[]') as Transaction[];

      console.log('Datos encontrados:', {
        accounts: localAccounts.length,
        categories: localCategories.length,
        transactions: localTransactions.length
      });

      if (localAccounts.length === 0 && localCategories.length === 0 && localTransactions.length === 0) {
        toast({
          title: "Sin datos para migrar",
          description: "No se encontraron datos en localStorage.",
        });
        return;
      }

      let migratedCount = 0;

      // PASO 1: Solo migrar categorías primero
      if (localCategories.length > 0) {
        console.log('Migrando categorías...');
        const categoryIdMap: Record<string, string> = {};
        
        try {
          const categoriesToInsert = localCategories.map(cat => {
            const newId = crypto.randomUUID();
            categoryIdMap[cat.id] = newId;
            return {
              id: newId,
              user_id: user.id,
              subcategoria: String(cat.subcategoria || ''),
              categoria: String(cat.categoria || ''),
              tipo: String(cat.tipo || 'Gastos')
            };
          });

          const { error: catError } = await supabase
            .from('categorias')
            .insert(categoriesToInsert);

          if (catError) {
            console.error('Error en categorías:', catError);
            throw new Error(`Error en categorías: ${catError.message}`);
          }
          
          migratedCount += localCategories.length;
          console.log('Categorías migradas exitosamente');
          
        } catch (error) {
          console.error('Error detallado en categorías:', error);
          throw new Error(`Error específico en categorías: ${error}`);
        }
      }

      toast({
        title: "Migración parcial exitosa",
        description: `Se migraron ${migratedCount} categorías. Las cuentas y transacciones se migrarán por separado.`,
      });

      return true;
    } catch (error: any) {
      console.error('Error completo en migración:', error);
      toast({
        title: "Error en migración",
        description: error.message || "Ocurrió un error durante la migración.",
        variant: "destructive"
      });
      return false;
    }
  };

  const checkMigrationNeeded = () => {
    const hasLocalData = 
      localStorage.getItem('financeAccounts') ||
      localStorage.getItem('financeCategories') ||
      localStorage.getItem('financeTransactions');
    
    return !!hasLocalData;
  };

  return {
    migrateFromLocalStorage,
    checkMigrationNeeded
  };
};