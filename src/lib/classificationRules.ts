export type ClassificationMatchType = 'exact' | 'contains' | 'starts_with';

const normalizeRuleText = (value: string) =>
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