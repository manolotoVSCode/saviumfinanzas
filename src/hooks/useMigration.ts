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

      // Obtener datos del localStorage
      const localAccounts = JSON.parse(localStorage.getItem('financeAccounts') || '[]') as Account[];
      const localCategories = JSON.parse(localStorage.getItem('financeCategories') || '[]') as Category[];
      const localTransactions = JSON.parse(localStorage.getItem('financeTransactions') || '[]') as Transaction[];

      if (localAccounts.length === 0 && localCategories.length === 0 && localTransactions.length === 0) {
        toast({
          title: "Sin datos para migrar",
          description: "No se encontraron datos en localStorage.",
        });
        return;
      }

      let migratedCount = 0;
      const categoryIdMap: Record<string, string> = {};
      const accountIdMap: Record<string, string> = {};

      // Migrar categorías primero (las transacciones las referencian)
      if (localCategories.length > 0) {
        const categoriesToInsert = localCategories.map(cat => {
          const newId = crypto.randomUUID();
          categoryIdMap[cat.id] = newId;
          return {
            id: newId,
            user_id: user.id,
            subcategoria: cat.subcategoria,
            categoria: cat.categoria,
            tipo: cat.tipo
          };
        });

        const { error: catError } = await supabase
          .from('categorias')
          .insert(categoriesToInsert);

        if (catError) throw catError;
        migratedCount += localCategories.length;
      }

      // Migrar cuentas
      if (localAccounts.length > 0) {
        const accountsToInsert = localAccounts.map(acc => {
          const newId = crypto.randomUUID();
          accountIdMap[acc.id] = newId;
          return {
            id: newId,
            user_id: user.id,
            nombre: acc.nombre,
            tipo: acc.tipo,
            saldo_inicial: acc.saldoInicial,
            divisa: acc.divisa || 'MXN',
            valor_mercado: acc.valorMercado,
            rendimiento_mensual: acc.rendimientoMensual
          };
        });

        const { error: accError } = await supabase
          .from('cuentas')
          .insert(accountsToInsert);

        if (accError) throw accError;
        migratedCount += localAccounts.length;
      }

      // Migrar transacciones (usando los nuevos UUIDs)
      if (localTransactions.length > 0) {
        const transactionsToInsert = localTransactions.map(trans => ({
          id: crypto.randomUUID(),
          user_id: user.id,
          cuenta_id: accountIdMap[trans.cuentaId] || crypto.randomUUID(),
          subcategoria_id: categoryIdMap[trans.subcategoriaId] || crypto.randomUUID(),
          fecha: trans.fecha instanceof Date ? trans.fecha.toISOString().split('T')[0] : trans.fecha,
          comentario: trans.comentario,
          ingreso: trans.ingreso,
          gasto: trans.gasto,
          divisa: trans.divisa || 'MXN' as const,
          csv_id: trans.csvId || null
        }));

        const { error: transError } = await supabase
          .from('transacciones')
          .insert(transactionsToInsert);

        if (transError) throw transError;
        migratedCount += localTransactions.length;
      }

      // Limpiar localStorage después de migración exitosa
      localStorage.removeItem('financeAccounts');
      localStorage.removeItem('financeCategories');
      localStorage.removeItem('financeTransactions');

      toast({
        title: "¡Migración exitosa!",
        description: `Se migraron ${migratedCount} registros a Supabase.`,
      });

      return true;
    } catch (error: any) {
      console.error('Error en migración:', error);
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