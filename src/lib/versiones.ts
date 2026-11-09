/** Versiones de app tipo «4.4» o «4.4.2». */
export const VERSION_VALIDA = /^[0-9]{1,3}(\.[0-9]{1,3}){0,2}$/;

/** Negativo si a < b, 0 si son iguales (4.4 = 4.4.0), positivo si a > b. */
export const compararVersiones = (a: string, b: string): number => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
};

/** La más alta de la lista, o null si está vacía. */
export const versionMasAlta = (versiones: string[]): string | null =>
  versiones.filter(v => VERSION_VALIDA.test(v)).reduce<string | null>(
    (max, v) => (max === null || compararVersiones(v, max) > 0 ? v : max), null);
