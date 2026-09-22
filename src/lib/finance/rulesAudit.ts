import {
  ClassificationMatchType,
  matchesClassificationKeyword,
  splitClassificationKeywords,
} from '@/lib/classificationRules';

/** Campos de una regla que necesita la auditoría. */
export interface AuditRule {
  id: string;
  name: string | null;
  keyword: string;
  match_type: ClassificationMatchType;
  priority: number;
  active: boolean;
  amount_min: number | null;
  amount_max: number | null;
  cuenta_id: string | null;
}

/** Campos de una transacción que necesita la auditoría. */
export interface AuditTransaction {
  id: string;
  comentario: string | null;
  gasto: number;
  ingreso: number;
  cuentaId: string | null;
}

export interface RuleOutcome {
  /** Transacciones que la regla podría clasificar (keyword + cuenta + monto). */
  candidatas: number;
  /** Las que realmente se lleva: es la primera regla que coincide por prioridad. */
  gana: number;
  /** Cuántas le quita cada regla de más prioridad. */
  pierdeAnte: { ruleId: string; n: number }[];
  /** Cuántas le quita ella a cada regla de menos prioridad. */
  quitaA: { ruleId: string; n: number }[];
}

/** Mismo criterio que el importador: keyword, cuenta e importe. */
const esCandidata = (tx: AuditTransaction, rule: AuditRule): boolean => {
  if (!rule.active) return false;
  const coincide = splitClassificationKeywords(rule.keyword)
    .some((k) => matchesClassificationKeyword(tx.comentario || '', k, rule.match_type));
  if (!coincide) return false;
  if (rule.cuenta_id !== null && rule.cuenta_id !== tx.cuentaId) return false;
  const monto = Number(tx.gasto || 0) + Number(tx.ingreso || 0);
  if (rule.amount_min !== null && monto < rule.amount_min) return false;
  if (rule.amount_max !== null && monto > rule.amount_max) return false;
  return true;
};

const ordenarPorPrioridad = (rules: AuditRule[]) => [...rules].sort((a, b) => b.priority - a.priority);

/**
 * Para cada regla activa: cuántas transacciones podría clasificar y cuántas se
 * lleva de verdad, con el desglose de quién le quita qué. La tabla solo sabía
 * contar candidatas, que es lo que hacía indistinguibles el solape intencional
 * (Amazon 99 antes que Amazon) y el dañino (una regla que nunca gana nada).
 */
export const computeRuleOutcomes = (
  rules: AuditRule[],
  transactions: AuditTransaction[],
): Record<string, RuleOutcome> => {
  const ordenadas = ordenarPorPrioridad(rules.filter((r) => r.active));
  const acc: Record<string, { candidatas: number; gana: number; pierde: Record<string, number>; quita: Record<string, number> }> = {};
  ordenadas.forEach((r) => { acc[r.id] = { candidatas: 0, gana: 0, pierde: {}, quita: {} }; });

  for (const tx of transactions) {
    const coinciden = ordenadas.filter((r) => esCandidata(tx, r));
    if (coinciden.length === 0) continue;
    const ganadora = coinciden[0];
    acc[ganadora.id].gana += 1;
    for (const r of coinciden) {
      acc[r.id].candidatas += 1;
      if (r.id === ganadora.id) continue;
      acc[r.id].pierde[ganadora.id] = (acc[r.id].pierde[ganadora.id] ?? 0) + 1;
      acc[ganadora.id].quita[r.id] = (acc[ganadora.id].quita[r.id] ?? 0) + 1;
    }
  }

  const porN = (o: Record<string, number>) =>
    Object.entries(o).map(([ruleId, n]) => ({ ruleId, n })).sort((a, b) => b.n - a.n);

  const out: Record<string, RuleOutcome> = {};
  for (const [id, v] of Object.entries(acc)) {
    out[id] = { candidatas: v.candidatas, gana: v.gana, pierdeAnte: porN(v.pierde), quitaA: porN(v.quita) };
  }
  return out;
};

export type OverlapSeverity = 'intencional' | 'anulada' | 'sospechoso' | 'menor';

/**
 * Un solape es intencional cuando alguna de las dos reglas acota por monto o por
 * cuenta: es el reparto deliberado (Amazon 99 → Suscripción, Uber ≷360). Sin ese
 * acotamiento, la regla que pierde TODO está anulada, y la que pierde la mitad o
 * más es sospechosa. El resto es ruido y no se marca.
 */
export const classifyOverlap = (
  ganadora: AuditRule,
  perdedora: AuditRule,
  perdidas: number,
  outcomePerdedora: RuleOutcome,
): OverlapSeverity => {
  const acota = (r: AuditRule) => r.amount_min !== null || r.amount_max !== null || r.cuenta_id !== null;
  if (acota(ganadora) || acota(perdedora)) return 'intencional';
  if (outcomePerdedora.candidatas > 0 && outcomePerdedora.gana === 0) return 'anulada';
  if (outcomePerdedora.candidatas > 0 && perdidas / outcomePerdedora.candidatas >= 0.5) return 'sospechoso';
  return 'menor';
};

export interface RulesHealth {
  /** Activas que no coinciden con ninguna transacción: no hacen nada. */
  muertas: AuditRule[];
  /** Activas con candidatas pero sin ninguna victoria: otra regla se las lleva siempre. */
  anuladas: { rule: AuditRule; ganadoras: string[] }[];
  /** Palabras clave repetidas dentro de la misma regla. */
  duplicadasEnRegla: { rule: AuditRule; keywords: string[] }[];
  /** Palabras clave que aparecen en más de una regla. */
  compartidas: { keyword: string; ruleIds: string[] }[];
  /** Palabras clave muy cortas: coinciden por prefijo de palabra y capturan de más. */
  cortas: { keyword: string; ruleId: string }[];
}

export const LONGITUD_KEYWORD_CORTA = 3;

/** Revisión de higiene de las reglas: nada de esto depende de las transacciones salvo muertas/anuladas. */
export const computeRulesHealth = (
  rules: AuditRule[],
  outcomes: Record<string, RuleOutcome>,
): RulesHealth => {
  const activas = rules.filter((r) => r.active);

  const muertas = activas.filter((r) => (outcomes[r.id]?.candidatas ?? 0) === 0);
  const anuladas = activas
    .filter((r) => (outcomes[r.id]?.candidatas ?? 0) > 0 && outcomes[r.id].gana === 0)
    .map((r) => ({ rule: r, ganadoras: outcomes[r.id].pierdeAnte.map((p) => p.ruleId) }));

  const duplicadasEnRegla: { rule: AuditRule; keywords: string[] }[] = [];
  const porKeyword = new Map<string, string[]>();
  const cortas: { keyword: string; ruleId: string }[] = [];

  for (const r of activas) {
    const keywords = splitClassificationKeywords(r.keyword);
    const vistas = new Set<string>();
    const repetidas = new Set<string>();
    for (const k of keywords) {
      if (vistas.has(k)) repetidas.add(k);
      vistas.add(k);
      if (k.length <= LONGITUD_KEYWORD_CORTA) cortas.push({ keyword: k, ruleId: r.id });
    }
    if (repetidas.size > 0) duplicadasEnRegla.push({ rule: r, keywords: [...repetidas] });
    for (const k of vistas) porKeyword.set(k, [...(porKeyword.get(k) ?? []), r.id]);
  }

  const compartidas = [...porKeyword.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([keyword, ruleIds]) => ({ keyword, ruleIds }));

  return { muertas, anuladas, duplicadasEnRegla, compartidas, cortas };
};
