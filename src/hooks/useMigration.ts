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
            
            // Función para sanitizar números
            const sanitizeNumber = (value: any, defaultValue: number = 0, maxValue: number = 999999999): number => {
              if (value === null || value === undefined || value === '') return defaultValue;
              const num = parseFloat(String(value));
              if (isNaN(num)) return defaultValue;
              if (num > maxValue) return maxValue;
              if (num < -maxValue) return -maxValue;
              return Math.round(num * 100) / 100; // Max 2 decimales
            };
            
            const processedAccount = {
              id: newId,
              user_id: user.id,
              nombre: String(acc.nombre || 'Sin nombre'),
              tipo: String(acc.tipo || 'Efectivo'),
              saldo_inicial: sanitizeNumber(acc.saldoInicial, 0),
              divisa: String(acc.divisa || 'MXN'),
              valor_mercado: acc.valorMercado ? sanitizeNumber(acc.valorMercado, null) : null,
              rendimiento_mensual: acc.rendimientoMensual ? sanitizeNumber(acc.rendimientoMensual, null, 100) : null
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

      // PASO 3: Migrar transacciones
      if (localTransactions.length > 0) {
        console.log('Migrando transacciones...');
        
        // Primero obtener los mapeos de IDs ya creados
        const { data: existingCategories } = await supabase
          .from('categorias')
          .select('id, subcategoria, categoria')
          .eq('user_id', user.id);
          
        const { data: existingAccounts } = await supabase
          .from('cuentas')
          .select('id, nombre')
          .eq('user_id', user.id);

        // Crear mapas de nombre a ID para hacer el matching
        const categoryMap: Record<string, string> = {};
        const accountMap: Record<string, string> = {};
        
        existingCategories?.forEach(cat => {
          // Buscar la categoría original por subcategoría
          const originalCat = localCategories.find(lc => lc.subcategoria === cat.subcategoria);
          if (originalCat) {
            categoryMap[originalCat.id] = cat.id;
          }
        });
        
        existingAccounts?.forEach(acc => {
          // Buscar la cuenta original por nombre
          const originalAcc = localAccounts.find(la => la.nombre === acc.nombre);
          if (originalAcc) {
            accountMap[originalAcc.id] = acc.id;
          }
        });

        console.log('Mapeos creados:', { categoryMap, accountMap });
        
        try {
          const transactionsToInsert = localTransactions
            .filter((trans, index) => {
              const hasValidAccount = accountMap[trans.cuentaId];
              const hasValidCategory = categoryMap[trans.subcategoriaId];
              
              if (!hasValidAccount || !hasValidCategory) {
                console.log(`Transacción ${index + 1} omitida - Referencias inválidas:`, {
                  cuentaId: trans.cuentaId,
                  hasValidAccount,
                  subcategoriaId: trans.subcategoriaId,
                  hasValidCategory
                });
                return false;
              }
              return true;
            })
            .map((trans, index) => {
              console.log(`Procesando transacción ${index + 1}:`, {
                fecha: trans.fecha,
                fechaType: typeof trans.fecha,
                ingreso: trans.ingreso,
                ingresoType: typeof trans.ingreso,
                gasto: trans.gasto,
                gastoType: typeof trans.gasto
              });

              // Función para sanitizar números de transacciones
              const sanitizeTransactionNumber = (value: any): number => {
                if (value === null || value === undefined || value === '') return 0;
                const num = parseFloat(String(value));
                if (isNaN(num)) return 0;
                if (num > 999999999) return 999999999;
                if (num < 0) return 0; // Ingresos y gastos no pueden ser negativos
                return Math.round(num * 100) / 100; // Max 2 decimales
              };

              // Procesar fecha
              let fechaFormatted: string;
              if (trans.fecha instanceof Date) {
                fechaFormatted = trans.fecha.toISOString().split('T')[0];
              } else if (typeof trans.fecha === 'string') {
                // Intentar parsear la fecha
                const parsedDate = new Date(trans.fecha);
                if (isNaN(parsedDate.getTime())) {
                  fechaFormatted = new Date().toISOString().split('T')[0]; // Fecha actual como fallback
                } else {
                  fechaFormatted = parsedDate.toISOString().split('T')[0];
                }
              } else {
                fechaFormatted = new Date().toISOString().split('T')[0]; // Fecha actual como fallback
              }

              const processedTransaction = {
                id: crypto.randomUUID(),
                user_id: user.id,
                cuenta_id: accountMap[trans.cuentaId],
                subcategoria_id: categoryMap[trans.subcategoriaId],
                fecha: fechaFormatted,
                comentario: String(trans.comentario || ''),
                ingreso: sanitizeTransactionNumber(trans.ingreso),
                gasto: sanitizeTransactionNumber(trans.gasto),
                divisa: String(trans.divisa || 'MXN'),
                csv_id: trans.csvId || null
              };

              console.log(`Transacción procesada ${index + 1}:`, processedTransaction);
              return processedTransaction;
            });

          console.log(`Insertando ${transactionsToInsert.length} transacciones de ${localTransactions.length} totales`);

          if (transactionsToInsert.length > 0) {
            const { error: transError } = await supabase
              .from('transacciones')
              .insert(transactionsToInsert);

            if (transError) {
              console.error('Error específico en transacciones:', transError);
              throw new Error(`Error en transacciones: ${transError.message}`);
            }
            
            migratedCount += transactionsToInsert.length;
            console.log('Transacciones migradas exitosamente');
          } else {
            console.log('No hay transacciones válidas para migrar');
          }
          
        } catch (error) {
          console.error('Error detallado en transacciones:', error);
          throw new Error(`Error específico en transacciones: ${error}`);
        }
      }

      toast({
        title: "¡Migración completa exitosa!",
        description: `Se migraron ${migratedCount} registros (categorías + cuentas + transacciones). Limpiando localStorage...`,
      });

      // Limpiar localStorage después de migración exitosa
      localStorage.removeItem('financeAccounts');
      localStorage.removeItem('financeCategories');
      localStorage.removeItem('financeTransactions');

      setTimeout(() => {
        alert('¡Migración completada! Ahora tus datos están en Supabase. La página se recargará para mostrar los datos migrados.');
        window.location.reload();
      }, 2000);

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