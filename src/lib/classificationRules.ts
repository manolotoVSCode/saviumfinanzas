export type ClassificationMatchType = 'exact' | 'contains' | 'starts_with';

export const normalizeRuleText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const splitClassificationKeywords = (value: string) =>
  value
    .split(',')
    .map(normalizeRuleText)
    .filter(Boolean);

const matchesContainsKeyword = (normalizedDescription: string, keyword: string) => {
  if (keyword.includes(' ')) {
    return (
      normalizedDescription === keyword ||
      normalizedDescription.startsWith(`${keyword} `) ||
      normalizedDescription.includes(` ${keyword}`)
    );
  }

  const words = normalizedDescription.split(' ').filter(Boolean);
  return words.some((word) => word.startsWith(keyword));
};

export const matchesClassificationKeyword = (
  description: string,
  keyword: string,
  matchType: ClassificationMatchType,
) => {
  const normalizedDescription = normalizeRuleText(description);
  const normalizedKeyword = normalizeRuleText(keyword);

  if (!normalizedDescription || !normalizedKeyword) return false;

  switch (matchType) {
    case 'exact':
      return normalizedDescription === normalizedKeyword;
    case 'starts_with':
      return normalizedDescription.startsWith(normalizedKeyword);
    case 'contains':
      return matchesContainsKeyword(normalizedDescription, normalizedKeyword);
    default:
      return false;
  }
};

export const matchesClassificationRule = (
  description: string,
  keywordList: string,
  matchType: ClassificationMatchType,
) => splitClassificationKeywords(keywordList).some((keyword) => matchesClassificationKeyword(description, keyword, matchType));

/** Campos de classification_rules que usa la búsqueda (la fila completa del hook es asignable). */
export interface ClassificationRuleLike {
  name: string | null;
  keyword: string;
  match_type: ClassificationMatchType;
  category_id: string;
  cuenta_id: string | null;
  active: boolean;
  amount_min: number | null;
  amount_max: number | null;
}

export interface RuleMatch {
  category_id: string;
  name: string | null;
  /** Primera palabra clave de la lista de la regla que coincidió. */
  keyword: string;
}

/**
 * Primera regla activa (las reglas llegan ordenadas por prioridad desc) cuya
 * palabra clave, cuenta e importe coinciden. Misma lógica que tenía el hook.
 */
export const findMatchingRuleDetailed = (
  rules: ClassificationRuleLike[],
  description: string,
  amount?: number,
  accountId?: string,
): RuleMatch | null => {
  for (const rule of rules) {
    if (!rule.active) continue;

    const keyword = splitClassificationKeywords(rule.keyword)
      .find((k) => matchesClassificationKeyword(description, k, rule.match_type));
    if (keyword === undefined) continue;

    // Account filter — if rule specifies an account, it must match
    if (rule.cuenta_id !== null && accountId !== undefined && rule.cuenta_id !== accountId) continue;
    if (rule.cuenta_id !== null && accountId === undefined) continue;

    // Amount filters are AND conditions — both keyword AND amount must match
    if (rule.amount_min !== null && amount !== undefined && amount < rule.amount_min) continue;
    if (rule.amount_max !== null && amount !== undefined && amount > rule.amount_max) continue;
    // If rule has amount filters but no amount provided, skip this rule
    if ((rule.amount_min !== null || rule.amount_max !== null) && amount === undefined) continue;

    return { category_id: rule.category_id, name: rule.name, keyword };
  }
  return null;
};