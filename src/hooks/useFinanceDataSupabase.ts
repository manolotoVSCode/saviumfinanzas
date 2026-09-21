import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Account, Category, Transaction, DashboardMetrics, AccountType } from '@/types/finance';
import { supabase } from '@/integrations/supabase/client';
import { useExchangeRates } from './useExchangeRates';
import { useAppConfig } from './useAppConfig';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { fetchAccounts, fetchCategories, fetchTransactions } from '@/lib/finance/queries';
import { computeAccountBalances, enrichTransactions } from '@/lib/finance/calculations';
import { computeDashboardMetrics } from '@/lib/finance/dashboardMetrics';

const ACCOUNT_TYPES: AccountType[] = [
  'Efectivo', 'Banco', 'Tarjeta de Crédito', 'Ahorros', 'Inversiones', 'Hipoteca', 'Empresa Propia', 'Bien Raíz'
];

/** Claves de caché, prefijadas por usuario para que un cambio de sesión no reutilice datos ajenos. */
export const financeQueryKeys = (userId: string | undefined) => ({
  cuentas: ['finance', userId, 'cuentas'] as const,
  categorias: ['finance', userId, 'categorias'] as const,
  transacciones: ['finance', userId, 'transacciones'] as const,
  subscriptions: ['finance', userId, 'subscriptions'] as const,
});

// Los datos solo cambian desde esta app, así que se consideran frescos un buen rato;
// al volver a la pestaña pasado ese tiempo se refrescan solos.
const STALE_TIME = 5 * 60 * 1000;

// Referencias estables para que los useMemo no se recalculen mientras carga.
const EMPTY_ACCOUNTS: Account[] = [];
const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_TRANSACTIONS: Transaction[] = [];

/**
 * Fuente única de cuentas, categorías y transacciones. Todas las pantallas
 * comparten la misma caché (TanStack Query): los datos se descargan una vez
 * por sesión y cada mutación invalida solo la parte que cambió.
 */
export const useFinanceDataSupabase = () => {
  const { convertCurrency } = useExchangeRates();
  const { config } = useAppConfig();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const QK = financeQueryKeys(user?.id);

  const accountsQuery = useQuery({ queryKey: QK.cuentas, queryFn: fetchAccounts, staleTime: STALE_TIME, enabled: !!user });
  const categoriesQuery = useQuery({ queryKey: QK.categorias, queryFn: fetchCategories, staleTime: STALE_TIME, enabled: !!user });
  const transactionsQuery = useQuery({ queryKey: QK.transacciones, queryFn: fetchTransactions, staleTime: STALE_TIME, enabled: !!user });

  const accounts = accountsQuery.data ?? EMPTY_ACCOUNTS;
  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;
  const transactions = transactionsQuery.data ?? EMPTY_TRANSACTIONS;
  const loading = accountsQuery.isPending || categoriesQuery.isPending || transactionsQuery.isPending;

  const loadError = accountsQuery.error ?? categoriesQuery.error ?? transactionsQuery.error;
  useEffect(() => {
    if (!loadError) return;
    console.error('Error loading data:', loadError);
    toast({
      title: "Error",
      description: "No se pudieron cargar los datos financieros",
      variant: "destructive"
    });
  }, [loadError, toast]);

  const invalidate = async (...keys: readonly (readonly unknown[])[]) => {
    await Promise.all(keys.map(queryKey => queryClient.invalidateQueries({ queryKey })));
  };

  const accountsWithBalances = useMemo(() => computeAccountBalances(accounts, transactions), [accounts, transactions]);
  const enrichedTransactions = useMemo(() => enrichTransactions(transactions, categories), [transactions, categories]);

  const dashboardMetrics = useMemo(
    (): DashboardMetrics => computeDashboardMetrics(accountsWithBalances, enrichedTransactions, convertCurrency, config.currency),
    [accountsWithBalances, enrichedTransactions, convertCurrency, config.currency]
  );

  // CRUD operations para cuentas
  const addAccount = async (account: Omit<Account, 'id' | 'saldoActual'>) => {
    try {
      // Verificar autenticación
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error de autenticación",
          description: "Debes estar logueado para crear cuentas",
          variant: "destructive"
        });
        return;
      }

      const accountData: any = {
        nombre: account.nombre,
        tipo: account.tipo,
        saldo_inicial: account.saldoInicial,
        divisa: account.divisa,
        user_id: user.id
      };

      // Agregar campos específicos de inversión si existen
      if (account.tipo === 'Inversiones') {
        if (account.tipo_inversion) accountData.tipo_inversion = account.tipo_inversion;
        if (account.modalidad) accountData.modalidad = account.modalidad;
        if (account.rendimiento_bruto) accountData.rendimiento_bruto = account.rendimiento_bruto;
        if (account.rendimiento_neto) accountData.rendimiento_neto = account.rendimiento_neto;
        if (account.fecha_inicio) accountData.fecha_inicio = account.fecha_inicio;
        if (account.ultimo_pago) accountData.ultimo_pago = account.ultimo_pago;
        if (account.valorMercado) accountData.valor_mercado = account.valorMercado;
      }


      const { data, error } = await supabase
        .from('cuentas')
        .insert(accountData)
        .select();

      if (error) {
        console.error('Error al crear cuenta:', error);
        throw error;
      }


      await invalidate(QK.cuentas);
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la cuenta",
        variant: "destructive"
      });
    }
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    try {
      // Verificar autenticación
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error de autenticación",
          description: "Debes estar logueado para actualizar cuentas",
          variant: "destructive"
        });
        return;
      }

      const updateData: any = {};

      // Mapear campos básicos
      if (updates.nombre) updateData.nombre = updates.nombre;
      if (updates.tipo) updateData.tipo = updates.tipo;
      if (updates.saldoInicial !== undefined) updateData.saldo_inicial = updates.saldoInicial;
      if (updates.divisa) updateData.divisa = updates.divisa;
      if (updates.vendida !== undefined) updateData.vendida = updates.vendida;

      // Mapear campos específicos de inversión
      if (updates.tipo_inversion) updateData.tipo_inversion = updates.tipo_inversion;
      if (updates.modalidad) updateData.modalidad = updates.modalidad;
      if (updates.rendimiento_bruto !== undefined) updateData.rendimiento_bruto = updates.rendimiento_bruto;
      if (updates.rendimiento_neto !== undefined) updateData.rendimiento_neto = updates.rendimiento_neto;
      if (updates.fecha_inicio) updateData.fecha_inicio = updates.fecha_inicio;
      if (updates.ultimo_pago) updateData.ultimo_pago = updates.ultimo_pago;
      if (updates.valorMercado !== undefined) updateData.valor_mercado = updates.valorMercado;


      const { data, error } = await supabase
        .from('cuentas')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error al actualizar cuenta:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No se encontró la cuenta para actualizar');
      }


      await invalidate(QK.cuentas);
    } catch (error) {
      console.error('Error updating account:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      // Verificar autenticación
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error de autenticación",
          description: "Debes estar logueado para eliminar cuentas",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('cuentas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await invalidate(QK.cuentas);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la cuenta",
        variant: "destructive"
      });
    }
  };

  const addCategory = async (category: Omit<Category, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('categorias')
        .insert({
          user_id: user.id,
          subcategoria: category.subcategoria,
          categoria: category.categoria,
          tipo: category.tipo
        });
      
      if (error) throw error;
      
      await invalidate(QK.categorias);
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la categoría",
        variant: "destructive"
      });
    }
  };

  const updateCategory = async (id: string, category: Partial<Category>) => {
    try {
      const updateData: any = {};
      
      if (category.subcategoria) updateData.subcategoria = category.subcategoria;
      if (category.categoria) updateData.categoria = category.categoria;
      if (category.tipo) updateData.tipo = category.tipo;
      if (typeof category.seguimiento_pago === 'boolean') updateData.seguimiento_pago = category.seguimiento_pago;
      if (category.frecuencia_seguimiento !== undefined) updateData.frecuencia_seguimiento = category.frecuencia_seguimiento;
      
      const { error } = await supabase
        .from('categorias')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      await invalidate(QK.categorias);
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la categoría",
        variant: "destructive"
      });
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id);
      
      if (error) throw error;

      // El trigger reassign_transactions_before_category_delete mueve las
      // transacciones a SIN ASIGNAR, así que también hay que refrescarlas.
      await invalidate(QK.categorias, QK.transacciones);
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la categoría",
        variant: "destructive"
      });
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'monto'>, autoContribution?: { targetAccountId: string; targetAccountType: 'Aportación' | 'Retiro' }) => {
    try {
      // Obtener el usuario actual
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('Usuario no autenticado');
      }

      // Preparar datos para inserción en Supabase
      const insertData = {
        cuenta_id: transaction.cuentaId,
        fecha: transaction.fecha.toISOString().split('T')[0],
        comentario: transaction.comentario,
        ingreso: transaction.ingreso,
        gasto: transaction.gasto,
        subcategoria_id: transaction.subcategoriaId,
        divisa: transaction.divisa || 'MXN',
        user_id: userData.user.id
      };

      const { error } = await supabase
        .from('transacciones')
        .insert([insertData]);

      if (error) throw error;

      // Si hay aportación automática, crear transacción adicional (INVERSA)
      if (autoContribution && autoContribution.targetAccountId) {
        // Determinar el tipo de transacción original
        const isGasto = transaction.gasto > 0;
        const isIngreso = transaction.ingreso > 0;
        const originalAmount = isGasto ? transaction.gasto : transaction.ingreso;
        
        // La transacción automática es INVERSA:
        // - Gasto original → Ingreso en cuenta destino
        // - Ingreso original → Gasto en cuenta destino
        // - Aportación → Retiro en cuenta destino
        // - Retiro → Aportación en cuenta destino
        
        // Determinar el tipo inverso para la transacción automática
        let autoTipo: string;
        let autoIngreso = 0;
        let autoGasto = 0;
        
        if (autoContribution.targetAccountType === 'Aportación') {
          // Si es aportación en destino, viene de un retiro en origen
          autoTipo = 'Aportación';
          autoIngreso = originalAmount;
          autoGasto = 0;
        } else if (autoContribution.targetAccountType === 'Retiro') {
          // Si es retiro en destino, viene de una aportación en origen
          autoTipo = 'Retiro';
          autoIngreso = 0;
          autoGasto = originalAmount;
        } else if (isGasto) {
          // Gasto en origen → Ingreso en destino
          autoTipo = 'Ingreso';
          autoIngreso = originalAmount;
          autoGasto = 0;
        } else {
          // Ingreso en origen → Gasto en destino
          autoTipo = 'Gastos';
          autoIngreso = 0;
          autoGasto = originalAmount;
        }

        // Buscar categoría apropiada para la transacción automática
        const targetCategory = categories.find(cat => cat.tipo === autoTipo);

        const autoContribData = {
          cuenta_id: autoContribution.targetAccountId,
          fecha: transaction.fecha.toISOString().split('T')[0],
          comentario: `Automática (${autoTipo}): ${transaction.comentario}`,
          ingreso: autoIngreso,
          gasto: autoGasto,
          subcategoria_id: targetCategory?.id || transaction.subcategoriaId,
          divisa: transaction.divisa || 'MXN',
          user_id: userData.user.id
        };

        const { error: autoError } = await supabase
          .from('transacciones')
          .insert([autoContribData]);

        if (autoError) throw autoError;
      }

      await invalidate(QK.transacciones);
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la transacción",
        variant: "destructive"
      });
    }
  };

  const addTransactionsBatch = async (newTransactions: Omit<Transaction, 'id' | 'monto'>[]) => {
    try {
      // Obtener el usuario actual
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('Usuario no autenticado');
      }

      // Preparar datos para inserción masiva
      const insertData = newTransactions.map(transaction => {
        const data: any = {
          cuenta_id: transaction.cuentaId,
          fecha: transaction.fecha.toISOString().split('T')[0],
          comentario: transaction.comentario,
          ingreso: transaction.ingreso,
          gasto: transaction.gasto,
          subcategoria_id: transaction.subcategoriaId,
          divisa: transaction.divisa || 'MXN',
          user_id: userData.user.id
        };
        if (transaction.tarjetahabiente) {
          data.tarjetahabiente = transaction.tarjetahabiente;
        }
        return data;
      });

      const { error } = await supabase
        .from('transacciones')
        .insert(insertData);

      if (error) throw error;

      await invalidate(QK.transacciones);
    } catch (error) {
      console.error('Error adding transactions batch:', error);
      toast({
        title: "Error",
        description: "No se pudieron importar las transacciones",
        variant: "destructive"
      });
    }
  };

  const updateTransaction = async (id: string, transaction: Partial<Transaction>, autoContribution?: { targetAccountId: string; targetAccountType: 'Aportación' | 'Retiro' }) => {
    try {
      // Obtener el usuario actual
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('Usuario no autenticado');
      }

      // Preparar datos para Supabase
      const updateData: any = {};
      
      if (transaction.fecha) updateData.fecha = transaction.fecha.toISOString().split('T')[0];
      if (transaction.comentario) updateData.comentario = transaction.comentario;
      if (transaction.subcategoriaId) updateData.subcategoria_id = transaction.subcategoriaId;
      if (transaction.cuentaId) updateData.cuenta_id = transaction.cuentaId;
      if (transaction.divisa) updateData.divisa = transaction.divisa;
      
      // Manejar ingreso y gasto
      if (transaction.ingreso !== undefined) updateData.ingreso = transaction.ingreso;
      if (transaction.gasto !== undefined) updateData.gasto = transaction.gasto;
      
      const { error } = await supabase
        .from('transacciones')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;

      // Si hay aportación automática, crear la transacción complementaria (INVERSA)
      if (autoContribution && autoContribution.targetAccountId) {
        const isGasto = transaction.gasto && transaction.gasto > 0;
        const isIngreso = transaction.ingreso && transaction.ingreso > 0;
        const originalAmount = isGasto ? transaction.gasto : (transaction.ingreso || 0);
        
        if (originalAmount > 0) {
          // Determinar el tipo inverso para la transacción automática
          let autoTipo: string;
          let autoIngreso = 0;
          let autoGasto = 0;
          
          if (autoContribution.targetAccountType === 'Aportación') {
            autoTipo = 'Aportación';
            autoIngreso = originalAmount;
            autoGasto = 0;
          } else if (autoContribution.targetAccountType === 'Retiro') {
            autoTipo = 'Retiro';
            autoIngreso = 0;
            autoGasto = originalAmount;
          } else if (isGasto) {
            // Gasto en origen → Ingreso en destino
            autoTipo = 'Ingreso';
            autoIngreso = originalAmount;
            autoGasto = 0;
          } else {
            // Ingreso en origen → Gasto en destino
            autoTipo = 'Gastos';
            autoIngreso = 0;
            autoGasto = originalAmount;
          }

          // Buscar categoría apropiada
          const targetCategory = categories.find(cat => cat.tipo === autoTipo);
          
          const autoTransactionData = {
            user_id: userData.user.id,
            cuenta_id: autoContribution.targetAccountId,
            subcategoria_id: targetCategory?.id || transaction.subcategoriaId,
            fecha: transaction.fecha?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
            comentario: `Automática (${autoTipo}): ${transaction.comentario}`,
            ingreso: autoIngreso,
            gasto: autoGasto,
            divisa: transaction.divisa || 'MXN'
          };
          
          const { error: autoError } = await supabase
            .from('transacciones')
            .insert(autoTransactionData);
          
          if (autoError) {
            console.error('Error creating auto contribution:', autoError);
            toast({
              title: "Advertencia",
              description: "Transacción actualizada pero no se pudo crear la transacción automática",
              variant: "destructive"
            });
          }
        }
      }
      
      await invalidate(QK.transacciones);
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la transacción",
        variant: "destructive"
      });
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transacciones')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await invalidate(QK.transacciones);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la transacción",
        variant: "destructive"
      });
    }
  };

  const clearAllTransactions = async () => {
    try {
      // Obtener el usuario actual
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('Usuario no autenticado');
      }

      const { error } = await supabase
        .from('transacciones')
        .delete()
        .eq('user_id', userData.user.id);

      if (error) throw error;

      await invalidate(QK.transacciones);
    } catch (error) {
      console.error('Error clearing all transactions:', error);
      toast({
        title: "Error",
        description: "No se pudieron eliminar las transacciones",
        variant: "destructive"
      });
    }
  };


  return {
    // Data
    accounts: accountsWithBalances,
    categories,
    transactions: enrichedTransactions,
    enrichedTransactions,
    accountTypes: ACCOUNT_TYPES,
    dashboardMetrics,
    loading,

    // CRUD operations
    addAccount,
    updateAccount,
    deleteAccount,
    addCategory,
    updateCategory,
    deleteCategory,
    addTransaction,
    addTransactionsBatch,
    updateTransaction,
    deleteTransaction,
    clearAllTransactions,

    // Utility
    refreshData: () => invalidate(QK.cuentas, QK.categorias, QK.transacciones)
  };
};
