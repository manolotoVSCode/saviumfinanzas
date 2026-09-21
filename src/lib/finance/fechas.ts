const DIA_MS = 86_400_000;

/** 'YYYY-MM-DD' → Date a medianoche local (new Date('YYYY-MM-DD') parsea en UTC y desplaza un día en México). */
export const parseFechaLocal = (iso: string): Date => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return new Date(iso);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

/** Días enteros desde hoy (00:00 local) hasta la fecha; negativo si ya pasó. */
export const diasHasta = (iso: string, now: Date = new Date()): number => {
  const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((parseFechaLocal(iso).getTime() - hoy.getTime()) / DIA_MS);
};

/** '20 sept 2026'. */
export const formatFechaCorta = (d: Date): string =>
  d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Corte de datos: último instante del mes anterior. Los movimientos del mes en
 * curso no se importan hasta que cierra, así que el libro solo está completo
 * hasta aquí; lo que "falta" después de esta fecha no es un cargo perdido.
 */
export const finMesAnterior = (now: Date = new Date()): Date =>
  new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Date local → 'YYYY-MM-DD' con getters locales (parser de importación, próximos pagos, "hoy"). */
export const toFechaISO = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/**
 * Transaction.fecha se crea con new Date('YYYY-MM-DD') (medianoche UTC, queries.ts:44);
 * este es su inverso exacto para escribirla de vuelta a BD. No usar con fechas locales.
 */
export const fechaTxISO = (d: Date): string => d.toISOString().slice(0, 10);
