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
