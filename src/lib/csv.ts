/** Celda CSV (RFC 4180): objetos como JSON; entrecomilla si hay comas, comillas o saltos de línea. */
export const valorCSV = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
