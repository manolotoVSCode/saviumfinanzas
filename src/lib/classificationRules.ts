export type ClassificationMatchType = 'exact' | 'contains' | 'starts_with';

export const normalizeRuleText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export interface ParsedKeyword {
  /** Texto normalizado, ya sin comillas. */
  texto: string;
  /** Entrecomillada: solo coincide si aparece como palabra suelta ("SPA" no caza "SPAIN"). */
  palabraCompleta: boolean;
}

/** Marca una palabra clave como "palabra completa" o le quita la marca. */
export const conPalabraCompleta = (raw: string, palabraCompleta: boolean): string => {
  const texto = raw.trim().replace(/^["'](.*)["']$/, '$1').trim();
  return palabraCompleta ? `"${texto}"` : texto;
};

/** `SPA` → por principio de palabra; `"SPA"` → palabra suelta. */
export const parseKeyword = (raw: string): ParsedKeyword => {
  const trimmed = (raw || '').trim();
  const entrecomillada = /^["'].*["']$/.test(trimmed) && trimmed.length >= 2;
  const interior = entrecomillada ? trimmed.slice(1, -1) : trimmed;
  return { texto: normalizeRuleText(interior), palabraCompleta: entrecomillada };
};

export const parseClassificationKeywords = (value: string): ParsedKeyword[] =>
  (value || '').split(',').map(parseKeyword).filter((k) => k.texto);

export const splitClassificationKeywords = (value: string) =>
  parseClassificationKeywords(value).map((k) => k.texto);

/** La palabra clave aparece como palabra suelta, con límite a ambos lados. */
const contienePalabraSuelta = (normalizedDescription: string, keyword: string) =>
  ` ${normalizedDescription} `.includes(` ${keyword} `);

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
  const { texto: normalizedKeyword, palabraCompleta } = parseKeyword(keyword);

  if (!normalizedDescription || !normalizedKeyword) return false;

  switch (matchType) {
    case 'exact':
      return normalizedDescription === normalizedKeyword;
    case 'starts_with':
      // Entrecomillada, la descripción tiene que empezar por la palabra entera.
      return palabraCompleta
        ? normalizedDescription === normalizedKeyword || normalizedDescription.startsWith(`${normalizedKeyword} `)
        : normalizedDescription.startsWith(normalizedKeyword);
    case 'contains':
      return palabraCompleta
        ? contienePalabraSuelta(normalizedDescription, normalizedKeyword)
        : matchesContainsKeyword(normalizedDescription, normalizedKeyword);
    default:
      return false;
  }
};

export const matchesClassificationRule = (
  description: string,
  keywordList: string,
  matchType: ClassificationMatchType,
) => (keywordList || '').split(',').some((keyword) => matchesClassificationKeyword(description, keyword, matchType));

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

    const keyword = (rule.keyword || '').split(',')
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

    return { category_id: rule.category_id, name: rule.name, keyword: parseKeyword(keyword).texto };
  }
  return null;
};