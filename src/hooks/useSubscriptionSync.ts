import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { financeQueryKeys } from '@/lib/finance/queryKeys';
import { AliasEntry, detectSubscriptions, mergeWithStored, SubscriptionRow } from '@/lib/finance/subscriptions';
import { Category, Transaction } from '@/types/finance';

export interface SyncArgs {
  transactions?: Transaction[];
  categories?: Category[];
}

export interface SyncResult {
  updated: number;
  inserted: number;
  deleted: number;
  /** Nombres que chocaron con UNIQUE (user_id, service_name); no abortan el resto. */
  duplicados: string[];
}

/**
 * Último array de transacciones (identidad de la caché) ya sincronizado. A nivel
 * de módulo para no repetir la detección en cada montaje de SubscriptionsManager;
 * queryClient.clear() al cerrar sesión crea arrays nuevos y vuelve a disparar.
 */
let ultimoSincronizado: Transaction[] | null = null;

const toAliasEntries = (rows: SubscriptionRow[]): AliasEntry[] =>
  rows
    .filter(r => r.canon_key && Array.isArray(r.aliases) && r.aliases.length > 0)
    .map(r => ({ canonKey: r.canon_key as string, serviceName: r.service_name, tipoServicio: r.tipo_servicio, aliases: r.aliases }));

/**
 * Detecta suscripciones en las transacciones de la caché y persiste el resultado:
 * 1 select + N update/insert (sin upsert: el índice único de canon_key es parcial)
 * + 1 delete de huérfanas; invalida `subscriptions`. De ~4×N+3 consultas a N+2.
 */
export const useSubscriptionSync = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (args: SyncArgs): Promise<SyncResult> => {
      const vacio: SyncResult = { updated: 0, inserted: 0, deleted: 0, duplicados: [] };
      if (!userId) return vacio;
      const QK = financeQueryKeys(userId);
      // Se lee la caché en el momento de ejecutar, no el closure: tras un
      // invalidate(transacciones) ya contiene lo importado.
      const transactions = args.transactions ?? queryClient.getQueryData<Transaction[]>(QK.transacciones) ?? [];
      const categories = args.categories ?? queryClient.getQueryData<Category[]>(QK.categorias) ?? [];
      if (transactions.length === 0) return vacio;

      const { data: stored, error } = await supabase
        .from('subscription_services')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      const rows = (stored ?? []) as SubscriptionRow[];

      const detected = detectSubscriptions(transactions, categories, toAliasEntries(rows));
      const { updates, inserts, orphanIds } = mergeWithStored(detected, rows);

      const duplicados: string[] = [];
      let updated = 0;
      let inserted = 0;

      for (const u of updates) {
        const { error: e } = await supabase.from('subscription_services').update(u.data).eq('id', u.id);
        if (e) {
          if (e.code === '23505') { duplicados.push(rows.find(r => r.id === u.id)?.service_name ?? u.id); continue; }
          throw e;
        }
        updated++;
      }
      // Borrar huérfanas ANTES de insertar: liberan nombres (UNIQUE user_id+service_name).
      if (orphanIds.length > 0) {
        const { error: e } = await supabase.from('subscription_services').delete().in('id', orphanIds);
        if (e) throw e;
      }
      for (const i of inserts) {
        const { error: e } = await supabase.from('subscription_services').insert({ ...i, user_id: userId });
        if (e) {
          if (e.code === '23505') { duplicados.push(i.service_name); continue; }
          throw e;
        }
        inserted++;
      }

      ultimoSincronizado = transactions;
      return { updated, inserted, deleted: orphanIds.length, duplicados };
    },
    onSuccess: (r) => r.duplicados.forEach(n => toast.error(`Nombre duplicado: ${n}`)),
    onError: (e) => {
      console.error('Error sincronizando suscripciones:', e);
      ultimoSincronizado = null;
      toast.error('Error al procesar las suscripciones');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: financeQueryKeys(userId).subscriptions }),
  });

  const { mutate, mutateAsync } = mutation;

  /** Disparador (b): sincronización explícita (tras importar, tras fusionar). */
  const sync = useCallback((args?: SyncArgs) => mutateAsync(args ?? {}), [mutateAsync]);

  /** Disparador (a): solo si el array de transacciones de la caché cambió desde la última vez. */
  const syncIfChanged = useCallback(() => {
    const txs = queryClient.getQueryData<Transaction[]>(financeQueryKeys(userId).transacciones);
    if (!txs || txs.length === 0 || txs === ultimoSincronizado) return;
    ultimoSincronizado = txs; // antes de mutate: evita un segundo disparo mientras corre
    mutate({});
  }, [queryClient, userId, mutate]);

  return { sync, syncIfChanged, syncing: mutation.isPending };
};
