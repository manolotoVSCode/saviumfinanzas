-- Tabla huérfana: el patrimonio se reconstruye desde las transacciones
-- (src/lib/finance/netWorthHistory.ts) y ningún código la lee ni escribe.
-- Trigger, policies e índice caen con ella; update_updated_at_column() es
-- compartida por otras tablas y se conserva.
DROP TABLE IF EXISTS public.financial_health_history;
