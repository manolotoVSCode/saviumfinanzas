-- Checklist: tareas que se repiten cada mes (p. ej. "subir el estado de cuenta de AMEX").
-- Al marcarla, la web la deja abierta y mueve la fecha un mes (src/lib/finance/checklist.ts);
-- completada_at guarda la última vez que se hizo. Una tarea repetida necesita fecha.
ALTER TABLE public.checklist_items
  ADD COLUMN repetir TEXT CHECK (repetir IN ('mensual')),
  ADD CONSTRAINT checklist_items_repetir_con_fecha CHECK (repetir IS NULL OR fecha IS NOT NULL);
