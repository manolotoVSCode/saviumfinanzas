import { supabase } from '@/integrations/supabase/client';
import { Account, Category, Transaction } from '@/types/finance';
import { useToast } from '@/hooks/use-toast';

export const useMigration = () => {
  const { toast } = useToast();

  const clearExistingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Limpiar datos existentes del usuario actual
      await supabase.from('transacciones').delete().eq('user_id', user.id);
      await supabase.from('cuentas').delete().eq('user_id', user.id);
      await supabase.from('categorias').delete().eq('user_id', user.id);
      
      console.log('Datos existentes limpiados');
    } catch (error) {
      console.error('Error limpiando datos:', error);
    }
  };

  const migrateFromLocalStorage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      console.log('Limpiando datos existentes...');
      await clearExistingData();
      
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

      // PASO 2: Migrar cuentas
      if (localAccounts.length > 0) {
        console.log('Migrando cuentas...');
        const accountIdMap: Record<string, string> = {};
        
        try {
          const accountsToInsert = localAccounts.map((acc, index) => {
            const newId = crypto.randomUUID();
            accountIdMap[acc.id] = newId;
            
            console.log(`Procesando cuenta ${index + 1}:`, {
              id: acc.id,
              nombre: acc.nombre,
              saldoInicial: acc.saldoInicial,
              saldoInicialType: typeof acc.saldoInicial,
              valorMercado: acc.valorMercado,
              valorMercadoType: typeof acc.valorMercado,
              rendimientoMensual: acc.rendimientoMensual,
              rendimientoType: typeof acc.rendimientoMensual
            });
            
            const processedAccount = {
              id: newId,
              user_id: user.id,
              nombre: String(acc.nombre || 'Sin nombre'),
              tipo: String(acc.tipo || 'Efectivo'),
              saldo_inicial: parseFloat(String(acc.saldoInicial || 0)),
              divisa: String(acc.divisa || 'MXN'),
              valor_mercado: acc.valorMercado ? parseFloat(String(acc.valorMercado)) : null,
              rendimiento_mensual: acc.rendimientoMensual ? parseFloat(String(acc.rendimientoMensual)) : null
            };
            
            console.log(`Cuenta procesada ${index + 1}:`, processedAccount);
            return processedAccount;
          });

          console.log('Todas las cuentas procesadas:', accountsToInsert);

          const { error: accError } = await supabase
            .from('cuentas')
            .insert(accountsToInsert);

          if (accError) {
            console.error('Error específico en cuentas:', accError);
            throw new Error(`Error en cuentas: ${accError.message}`);
          }
          
          migratedCount += localAccounts.length;
          console.log('Cuentas migradas exitosamente');
          
        } catch (error) {
          console.error('Error detallado en cuentas:', error);
          throw new Error(`Error específico en cuentas: ${error}`);
        }
      }

      toast({
        title: "Migración de cuentas exitosa",
        description: `Se migraron ${migratedCount} registros (categorías + cuentas). Las transacciones se migrarán por separado.`,
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
    clearExistingData,
    checkMigrationNeeded
  };
};