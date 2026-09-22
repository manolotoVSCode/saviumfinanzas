import { Transaction } from '@/types/finance';
import { RuleMatch } from '@/lib/classificationRules';

export type SuggestionSource = 'historial' | 'regla' | 'historial_parcial';

export interface CategorySuggestion {
  categoriaId: string;
  source: SuggestionSource;
  /** Texto del tooltip: "Historial · 12 movimientos", "Regla · Netflix", "Parecido a · uber bcn". */
  detail: string;
  confidence: 'alta' | 'media';
}

/** Misma normalización que usaba el importador: minúsculas, solo letras/números/espacios. */
export const normalizeDescription = (desc: string): string =>
  desc
    .toLowerCase()
    .replace(/[^a-záéíóúñü0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Clave parcial estricta: primeras 3 palabras, solo si hay ≥ 2 palabras y ≥ 8 caracteres. */
export const partialKey = (normalized: string): string | null => {
  const words = normalized.split(' ').filter(Boolean);
  if (words.length < 2 || normalized.length < 8) return null;
  return words.slice(0, 3).join(' ');
};

interface Tally {
  categoriaId: string;
  count: number;
}

export interface HistoryIndex {
  exact: Map<string, Tally>;
  partial: Map<string, Tally>;
}

type Acumulador = Map<string, Map<string, { count: number; last: number }>>;

/**
 * Por descripción normalizada (y por clave parcial), la categoría MÁS FRECUENTE
 * del historial; desempate: la más reciente. Ignora "Sin Asignar" si se pasa su id.
 */
export const buildHistoryIndex = (transactions: Transaction[], ignorarCategoriaId?: string): HistoryIndex => {
  const exact: Acumulador = new Map();
  const partial: Acumulador = new Map();

  const add = (acc: Acumulador, key: string, t: Transaction) => {
    if (!acc.has(key)) acc.set(key, new Map());
    const porCat = acc.get(key)!;
    const cur = porCat.get(t.subcategoriaId) ?? { count: 0, last: 0 };
    porCat.set(t.subcategoriaId, { count: cur.count + 1, last: Math.max(cur.last, t.fecha.getTime()) });
  };

  for (const t of transactions) {
    if (!t.comentario || !t.subcategoriaId) continue;
    if (ignorarCategoriaId && t.subcategoriaId === ignorarCategoriaId) continue;
    const n = normalizeDescription(t.comentario);
    if (n.length < 3) continue;
    add(exact, n, t);
    const p = partialKey(n);
    if (p) add(partial, p, t);
  }

  const resolver = (acc: Acumulador): Map<string, Tally> => {
    const out = new Map<string, Tally>();
    for (const [key, porCat] of acc) {
      let best: { categoriaId: string; count: number; last: number } | null = null;
      for (const [categoriaId, v] of porCat) {
        if (!best || v.count > best.count || (v.count === best.count && v.last > best.last)) {
          best = { categoriaId, ...v };
        }
      }
      if (best) out.set(key, { categoriaId: best.categoriaId, count: best.count });
    }
    return out;
  };

  return { exact: resolver(exact), partial: resolver(partial) };
};

export type RuleFinder = (description: string, amount?: number, accountId?: string) => RuleMatch | null;

/** Orden: historial exacto → regla → historial parcial estricto. Sin `includes` bidireccional. */
export const suggestCategory = (
  description: string,
  amount: number | undefined,
  accountId: string | undefined,
  history: HistoryIndex,
  findRule: RuleFinder,
): CategorySuggestion | null => {
  const n = normalizeDescription(description);

  const exact = history.exact.get(n);
  if (exact) {
    return { categoriaId: exact.categoriaId, source: 'historial', detail: `Historial · ${exact.count} movimiento${exact.count === 1 ? '' : 's'}`, confidence: 'alta' };
  }

  const rule = findRule(description, amount, accountId);
  if (rule) {
    return { categoriaId: rule.category_id, source: 'regla', detail: `Regla · ${rule.name || rule.keyword}`, confidence: 'alta' };
  }

  const p = partialKey(n);
  const parcial = p ? history.partial.get(p) : undefined;
  if (p && parcial) {
    return { categoriaId: parcial.categoriaId, source: 'historial_parcial', detail: `Parecido a · ${p}`, confidence: 'media' };
  }

  return null;
};
